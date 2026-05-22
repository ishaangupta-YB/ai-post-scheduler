import { and, eq, lt } from "drizzle-orm"

import {
  creditTransactions,
  getDb,
  users,
  type CreditPool,
} from "@/db"

import {
  FREE_TIER_MONTHLY_CREDITS,
  FREE_TIER_PERIOD_DAYS,
  getPlanMonthlyAllotment,
} from "./packs"

const DAY_MS = 24 * 60 * 60 * 1000
const SPEND_MAX_RETRIES = 3

export class InsufficientCreditsError extends Error {
  constructor(
    public required: number,
    public available: number,
  ) {
    super(`Insufficient credits: need ${required}, have ${available}`)
    this.name = "InsufficientCreditsError"
  }
}

export type CreditState = {
  monthly: number
  topup: number
  total: number
  planId: string | null
  planStatus: string | null
  planPeriodEnd: Date | null
  dodoSubscriptionId: string | null
}

// ── Reads ────────────────────────────────────────────────────────────────────

/**
 * Returns the user's current credit state, lazily applying a monthly reset if the
 * period has ended. ALL credit reads should go through this so callers can never
 * observe a stale, past-period balance.
 */
export async function getCreditState(userId: string): Promise<CreditState> {
  await resetMonthlyCreditsIfDue(userId)
  const db = getDb()
  const row = await db
    .select({
      monthly: users.monthlyCreditBalance,
      topup: users.topupCreditBalance,
      planId: users.planId,
      planStatus: users.planStatus,
      planPeriodEnd: users.planPeriodEnd,
      dodoSubscriptionId: users.dodoSubscriptionId,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get()

  if (!row) {
    throw new Error(`User not found: ${userId}`)
  }

  return {
    monthly: row.monthly,
    topup: row.topup,
    total: row.monthly + row.topup,
    planId: row.planId,
    planStatus: row.planStatus,
    planPeriodEnd: row.planPeriodEnd,
    dodoSubscriptionId: row.dodoSubscriptionId,
  }
}

/** Legacy convenience — returns just the total balance. Used by older call sites. */
export async function getCreditBalance(userId: string): Promise<number> {
  const state = await getCreditState(userId)
  return state.total
}

// ── Spending ────────────────────────────────────────────────────────────────

type SpendArgs = {
  userId: string
  amount: number
  operation: string
  description?: string
  metadata?: Record<string, unknown>
}

/**
 * Atomically debits `amount` credits, consuming the monthly pool first and the
 * topup pool second (monthly resets/expires so we burn it first to preserve user value).
 *
 * Concurrency: optimistic locking via WHERE-guarded UPDATE. If a concurrent writer
 * changed the balances between our SELECT and UPDATE, the WHERE clause fails and we
 * retry up to SPEND_MAX_RETRIES times.
 *
 * Throws InsufficientCreditsError when monthly + topup < amount.
 */
export async function spendCredits(args: SpendArgs): Promise<CreditState> {
  const { userId, amount } = args
  if (amount <= 0) throw new Error("spendCredits requires a positive amount")

  // Ensure any due monthly reset has applied before we check funds.
  await resetMonthlyCreditsIfDue(userId)

  const db = getDb()

  for (let attempt = 0; attempt < SPEND_MAX_RETRIES; attempt++) {
    const current = await db
      .select({
        monthly: users.monthlyCreditBalance,
        topup: users.topupCreditBalance,
      })
      .from(users)
      .where(eq(users.id, userId))
      .get()

    if (!current) throw new Error(`User not found: ${userId}`)

    const total = current.monthly + current.topup
    if (total < amount) {
      throw new InsufficientCreditsError(amount, total)
    }

    const spentMonthly = Math.min(amount, current.monthly)
    const spentTopup = amount - spentMonthly
    const newMonthly = current.monthly - spentMonthly
    const newTopup = current.topup - spentTopup

    // Optimistic lock: the WHERE matches only if no one else has moved either balance.
    const updated = await db
      .update(users)
      .set({
        monthlyCreditBalance: newMonthly,
        topupCreditBalance: newTopup,
      })
      .where(
        and(
          eq(users.id, userId),
          eq(users.monthlyCreditBalance, current.monthly),
          eq(users.topupCreditBalance, current.topup),
        ),
      )
      .returning({
        monthly: users.monthlyCreditBalance,
        topup: users.topupCreditBalance,
      })

    if (updated.length === 0) {
      // Lost the race — someone else mutated the row. Retry.
      continue
    }

    // Write ledger rows: one per pool that was actually touched.
    const ledgerRows = buildSpendLedgerRows({
      userId,
      operation: args.operation,
      description: args.description,
      metadata: args.metadata,
      spentMonthly,
      spentTopup,
      balanceMonthlyAfter: newMonthly,
      balanceTopupAfter: newTopup,
    })
    if (ledgerRows.length > 0) {
      await db.insert(creditTransactions).values(ledgerRows)
    }

    return {
      monthly: newMonthly,
      topup: newTopup,
      total: newMonthly + newTopup,
      ...(await loadPlanFields(userId)),
    }
  }

  // Fell out of retry loop — extremely rare under normal contention.
  throw new Error(
    `spendCredits: lost ${SPEND_MAX_RETRIES} optimistic-lock attempts for user ${userId}`,
  )
}

// ── Grants ──────────────────────────────────────────────────────────────────

type GrantTopupArgs = {
  userId: string
  amount: number
  packId?: string
  paymentId?: string
  description?: string
  metadata?: Record<string, unknown>
}

/** Adds `amount` to the topup pool (never expires). */
export async function grantTopupCredits(
  args: GrantTopupArgs,
): Promise<CreditState> {
  const { userId, amount } = args
  if (amount <= 0) throw new Error("grantTopupCredits requires a positive amount")

  const db = getDb()

  // Topup grant is monotonic-only, so a simple UPDATE … RETURNING is safe.
  const updated = await db
    .update(users)
    .set({ topupCreditBalance: sqlAddInt(users.topupCreditBalance, amount) })
    .where(eq(users.id, userId))
    .returning({
      monthly: users.monthlyCreditBalance,
      topup: users.topupCreditBalance,
    })

  if (updated.length === 0) {
    throw new Error(`User not found: ${userId}`)
  }

  await db.insert(creditTransactions).values({
    id: crypto.randomUUID(),
    userId,
    type: "topup_purchase",
    pool: "topup",
    amount,
    balanceAfter: updated[0].topup,
    packId: args.packId,
    paymentId: args.paymentId,
    description: args.description ?? "Top-up purchase",
    metadata: args.metadata,
  })

  return {
    monthly: updated[0].monthly,
    topup: updated[0].topup,
    total: updated[0].monthly + updated[0].topup,
    ...(await loadPlanFields(userId)),
  }
}

// ── Monthly reset ───────────────────────────────────────────────────────────

/**
 * Resets the monthly pool to the plan's allotment if the current period has ended.
 * No-op when the period is still in the future. Atomic: the WHERE clause on
 * plan_period_end ensures at most one concurrent caller actually mutates the row.
 *
 * Returns true if a reset was applied. Writes a `monthly_forfeit` ledger entry for
 * the unspent balance (if any) and a `monthly_grant` for the new allotment.
 *
 * For cancelled subscriptions, this is when we drop the user back to the free tier:
 *   planId=null, planStatus=null, monthly=FREE_TIER_MONTHLY_CREDITS.
 */
export async function resetMonthlyCreditsIfDue(
  userId: string,
): Promise<boolean> {
  const now = new Date()
  const db = getDb()

  const row = await db
    .select({
      planId: users.planId,
      planStatus: users.planStatus,
      planPeriodEnd: users.planPeriodEnd,
      monthly: users.monthlyCreditBalance,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get()

  if (!row) return false
  if (!row.planPeriodEnd) return false // not initialized
  if (row.planPeriodEnd.getTime() > now.getTime()) return false // not due

  // Cancelled subscription drops to free tier at period end. Active/past_due/free stays
  // on whatever planId they have (active will get period extended by Dodo webhook; if
  // we're here it means the webhook hasn't landed yet but the lazy fallback keeps the
  // user usable).
  const dropToFreeTier = row.planStatus === "cancelled"
  const nextPlanId = dropToFreeTier ? null : row.planId
  const nextPlanStatus = dropToFreeTier ? null : row.planStatus
  const allotment = getPlanMonthlyAllotment(nextPlanId)
  const nextPeriodEnd = new Date(now.getTime() + FREE_TIER_PERIOD_DAYS * DAY_MS)

  const oldMonthly = row.monthly

  const updated = await db
    .update(users)
    .set({
      monthlyCreditBalance: allotment,
      planId: nextPlanId,
      planStatus: nextPlanStatus,
      planPeriodEnd: nextPeriodEnd,
    })
    .where(
      and(
        eq(users.id, userId),
        lt(users.planPeriodEnd, now),
        // Concurrency guard: snapshot monthly so two concurrent callers can't both reset.
        eq(users.monthlyCreditBalance, oldMonthly),
      ),
    )
    .returning({ id: users.id })

  if (updated.length === 0) return false // someone else applied it

  const rows: (typeof creditTransactions.$inferInsert)[] = []
  if (oldMonthly > 0) {
    rows.push({
      id: crypto.randomUUID(),
      userId,
      type: "monthly_forfeit",
      pool: "monthly",
      amount: -oldMonthly,
      balanceAfter: 0,
      planId: row.planId,
      description: "Monthly credits forfeited at period end",
    })
  }
  rows.push({
    id: crypto.randomUUID(),
    userId,
    type: "monthly_grant",
    pool: "monthly",
    amount: allotment,
    balanceAfter: allotment,
    planId: nextPlanId,
    description: nextPlanId
      ? `Monthly credits granted (${nextPlanId})`
      : "Free-tier monthly credits granted",
  })
  await db.insert(creditTransactions).values(rows)

  return true
}

// ── Subscription state transitions (webhook-driven) ─────────────────────────

type ApplyActiveArgs = {
  userId: string
  planId: string
  dodoSubscriptionId: string
  periodEnd: Date
}

/**
 * Activates a subscription on a user — called when Dodo fires `subscription.active`.
 * Sets planId/planStatus/dodoSubscriptionId/planPeriodEnd and resets the monthly pool
 * to the plan's allotment. If the user already had monthly credits, they're forfeited
 * (the new plan grant supersedes them).
 */
export async function applySubscriptionActive(
  args: ApplyActiveArgs,
): Promise<void> {
  const db = getDb()
  const allotment = getPlanMonthlyAllotment(args.planId)

  const current = await db
    .select({ monthly: users.monthlyCreditBalance })
    .from(users)
    .where(eq(users.id, args.userId))
    .get()
  if (!current) throw new Error(`User not found: ${args.userId}`)
  const oldMonthly = current.monthly

  await db
    .update(users)
    .set({
      planId: args.planId,
      planStatus: "active",
      planPeriodEnd: args.periodEnd,
      dodoSubscriptionId: args.dodoSubscriptionId,
      monthlyCreditBalance: allotment,
    })
    .where(eq(users.id, args.userId))

  const rows: (typeof creditTransactions.$inferInsert)[] = []
  if (oldMonthly > 0) {
    rows.push({
      id: crypto.randomUUID(),
      userId: args.userId,
      type: "monthly_forfeit",
      pool: "monthly",
      amount: -oldMonthly,
      balanceAfter: 0,
      description: "Forfeited free-tier credits on plan activation",
    })
  }
  rows.push({
    id: crypto.randomUUID(),
    userId: args.userId,
    type: "monthly_grant",
    pool: "monthly",
    amount: allotment,
    balanceAfter: allotment,
    planId: args.planId,
    subscriptionId: args.dodoSubscriptionId,
    description: `Subscription activated (${args.planId})`,
  })
  await db.insert(creditTransactions).values(rows)
}

type ApplyRenewedArgs = {
  dodoSubscriptionId: string
  periodEnd: Date
  paymentId?: string
}

/**
 * Recurring monthly charge from Dodo — `payment.succeeded` with a subscription_id.
 * Resets monthly to the plan's allotment and advances planPeriodEnd. If we can't
 * find a user with this subscription id, the event is silently ignored (it will
 * still have been recorded into payment_events for audit).
 */
export async function applySubscriptionRenewed(
  args: ApplyRenewedArgs,
): Promise<void> {
  const db = getDb()
  const row = await db
    .select({
      id: users.id,
      planId: users.planId,
      monthly: users.monthlyCreditBalance,
    })
    .from(users)
    .where(eq(users.dodoSubscriptionId, args.dodoSubscriptionId))
    .get()

  if (!row) return // unknown subscription — log-only

  const allotment = getPlanMonthlyAllotment(row.planId)
  const oldMonthly = row.monthly

  await db
    .update(users)
    .set({
      monthlyCreditBalance: allotment,
      planPeriodEnd: args.periodEnd,
      planStatus: "active",
    })
    .where(eq(users.id, row.id))

  const rows: (typeof creditTransactions.$inferInsert)[] = []
  if (oldMonthly > 0) {
    rows.push({
      id: crypto.randomUUID(),
      userId: row.id,
      type: "monthly_forfeit",
      pool: "monthly",
      amount: -oldMonthly,
      balanceAfter: 0,
      planId: row.planId,
      subscriptionId: args.dodoSubscriptionId,
      paymentId: args.paymentId,
      description: "Monthly credits forfeited on renewal",
    })
  }
  rows.push({
    id: crypto.randomUUID(),
    userId: row.id,
    type: "monthly_grant",
    pool: "monthly",
    amount: allotment,
    balanceAfter: allotment,
    planId: row.planId,
    subscriptionId: args.dodoSubscriptionId,
    paymentId: args.paymentId,
    description: "Monthly credits granted on subscription renewal",
  })
  await db.insert(creditTransactions).values(rows)
}

/**
 * `subscription.cancelled` — marks status='cancelled' but leaves credits intact.
 * Credits expire naturally when planPeriodEnd passes (lazy reset drops to free tier).
 */
export async function applySubscriptionCancelled(args: {
  dodoSubscriptionId: string
}): Promise<void> {
  const db = getDb()
  await db
    .update(users)
    .set({ planStatus: "cancelled" })
    .where(eq(users.dodoSubscriptionId, args.dodoSubscriptionId))
}

/** `subscription.past_due` — payment failed, mark status; no credit change. */
export async function applySubscriptionPastDue(args: {
  dodoSubscriptionId: string
}): Promise<void> {
  const db = getDb()
  await db
    .update(users)
    .set({ planStatus: "past_due" })
    .where(eq(users.dodoSubscriptionId, args.dodoSubscriptionId))
}

// ── New-user seeding ────────────────────────────────────────────────────────

/**
 * Sets up the free-tier period for a freshly created user. Called from the
 * better-auth user.create.after hook. The DEFAULT on monthly_credit_balance
 * already seeds the 25 credits; we just need to set planPeriodEnd and write
 * the initial monthly_grant audit row.
 */
export async function initializeFreeTierUser(userId: string): Promise<void> {
  const db = getDb()
  const now = new Date()
  const periodEnd = new Date(now.getTime() + FREE_TIER_PERIOD_DAYS * DAY_MS)

  await db
    .update(users)
    .set({ planPeriodEnd: periodEnd })
    .where(eq(users.id, userId))

  await db.insert(creditTransactions).values({
    id: crypto.randomUUID(),
    userId,
    type: "monthly_grant",
    pool: "monthly",
    amount: FREE_TIER_MONTHLY_CREDITS,
    balanceAfter: FREE_TIER_MONTHLY_CREDITS,
    description: "Free-tier welcome credits",
  })
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function loadPlanFields(userId: string) {
  const db = getDb()
  const row = await db
    .select({
      planId: users.planId,
      planStatus: users.planStatus,
      planPeriodEnd: users.planPeriodEnd,
      dodoSubscriptionId: users.dodoSubscriptionId,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get()
  return {
    planId: row?.planId ?? null,
    planStatus: row?.planStatus ?? null,
    planPeriodEnd: row?.planPeriodEnd ?? null,
    dodoSubscriptionId: row?.dodoSubscriptionId ?? null,
  }
}

function buildSpendLedgerRows(args: {
  userId: string
  operation: string
  description?: string
  metadata?: Record<string, unknown>
  spentMonthly: number
  spentTopup: number
  balanceMonthlyAfter: number
  balanceTopupAfter: number
}): (typeof creditTransactions.$inferInsert)[] {
  const rows: (typeof creditTransactions.$inferInsert)[] = []
  if (args.spentMonthly > 0) {
    rows.push({
      id: crypto.randomUUID(),
      userId: args.userId,
      type: "spend",
      pool: "monthly" satisfies CreditPool,
      amount: -args.spentMonthly,
      balanceAfter: args.balanceMonthlyAfter,
      operation: args.operation,
      description: args.description,
      metadata: args.metadata,
    })
  }
  if (args.spentTopup > 0) {
    rows.push({
      id: crypto.randomUUID(),
      userId: args.userId,
      type: "spend",
      pool: "topup" satisfies CreditPool,
      amount: -args.spentTopup,
      balanceAfter: args.balanceTopupAfter,
      operation: args.operation,
      description: args.description,
      metadata: args.metadata,
    })
  }
  return rows
}

// Drizzle's `sql` template helper, named-import-free.
import { sql, type SQLWrapper } from "drizzle-orm"

function sqlAddInt(col: SQLWrapper, amount: number) {
  return sql`${col} + ${amount}`
}
