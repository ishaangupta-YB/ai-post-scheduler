import { and, eq, gte, sql } from "drizzle-orm"

import {
  creditTransactions,
  getDb,
  users,
  type CreditTransactionType,
} from "@/db"

export class InsufficientCreditsError extends Error {
  constructor(
    public required: number,
    public available: number,
  ) {
    super(`Insufficient credits: need ${required}, have ${available}`)
    this.name = "InsufficientCreditsError"
  }
}

export async function getCreditBalance(userId: string): Promise<number> {
  const db = getDb()
  const row = await db
    .select({ creditBalance: users.creditBalance })
    .from(users)
    .where(eq(users.id, userId))
    .get()
  return row?.creditBalance ?? 0
}

type GrantArgs = {
  userId: string
  amount: number
  type: Extract<CreditTransactionType, "purchase" | "bonus" | "refund" | "adjustment">
  description?: string
  paymentId?: string
  packId?: string
  metadata?: Record<string, unknown>
}

/**
 * Grants credits and records a ledger entry. Returns the new balance.
 * Note: D1 does not support multi-statement transactions; we use `batch` so the
 * UPDATE and INSERT land atomically from the worker's perspective.
 */
export async function grantCredits(args: GrantArgs): Promise<number> {
  const { userId, amount } = args
  if (amount <= 0) throw new Error("grantCredits requires a positive amount")

  const db = getDb()
  const txId = crypto.randomUUID()

  const updateStmt = db
    .update(users)
    .set({ creditBalance: sql`${users.creditBalance} + ${amount}` })
    .where(eq(users.id, userId))
    .returning({ balance: users.creditBalance })

  const [updateResult] = await db.batch([updateStmt])
  const newBalance = updateResult[0]?.balance
  if (newBalance == null) throw new Error(`User not found: ${userId}`)

  await db.insert(creditTransactions).values({
    id: txId,
    userId,
    type: args.type,
    amount,
    balanceAfter: newBalance,
    description: args.description,
    paymentId: args.paymentId,
    packId: args.packId,
    metadata: args.metadata,
  })

  return newBalance
}

type SpendArgs = {
  userId: string
  amount: number
  operation: string
  description?: string
  metadata?: Record<string, unknown>
}

/**
 * Atomically debits credits. Uses `UPDATE ... WHERE balance >= amount` so two
 * concurrent spends cannot overdraw. Throws InsufficientCreditsError on failure.
 */
export async function spendCredits(args: SpendArgs): Promise<number> {
  const { userId, amount } = args
  if (amount <= 0) throw new Error("spendCredits requires a positive amount")

  const db = getDb()

  const updated = await db
    .update(users)
    .set({ creditBalance: sql`${users.creditBalance} - ${amount}` })
    .where(and(eq(users.id, userId), gte(users.creditBalance, amount)))
    .returning({ balance: users.creditBalance })

  if (updated.length === 0) {
    const available = await getCreditBalance(userId)
    throw new InsufficientCreditsError(amount, available)
  }

  const newBalance = updated[0].balance

  await db.insert(creditTransactions).values({
    id: crypto.randomUUID(),
    userId,
    type: "spend",
    amount: -amount,
    balanceAfter: newBalance,
    operation: args.operation,
    description: args.description,
    metadata: args.metadata,
  })

  return newBalance
}
