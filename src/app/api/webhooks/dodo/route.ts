import { NextResponse } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"

import { getDb, paymentEvents } from "@/db"
import {
  verifyWebhookSignature,
  type DodoEvent,
} from "@/lib/billing/dodo"
import {
  applySubscriptionActive,
  applySubscriptionCancelled,
  applySubscriptionPastDue,
  applySubscriptionRenewed,
  grantTopupCredits,
} from "@/lib/billing/credits"
import { getTopupPack } from "@/lib/billing/packs"

// Dual-system note: our products on Dodo also carry the "AI Credits" entitlement, so
// Dodo will internally track credits and fire credit.added/credit.deducted/credit.expired
// events. We deliberately ignore those for credit math — our D1 ledger is the runtime
// source of truth. Those events still get recorded into payment_events for audit.
//
// All routing happens AFTER the dedup insert below, so every event is recorded exactly
// once regardless of whether we act on it.
export const runtime = "edge"

export async function POST(request: Request) {
  const { env } = getCloudflareContext()
  const rawBody = await request.text()

  const webhookId = request.headers.get("webhook-id")
  const webhookTimestamp = request.headers.get("webhook-timestamp")
  const webhookSignature = request.headers.get("webhook-signature")

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    return NextResponse.json({ error: "missing headers" }, { status: 400 })
  }

  const ok = await verifyWebhookSignature({
    secret: env.DODO_WEBHOOK_SECRET,
    webhookId,
    webhookTimestamp,
    webhookSignature,
    rawBody,
  })
  if (!ok) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 })
  }

  let evt: DodoEvent
  try {
    evt = JSON.parse(rawBody) as DodoEvent
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  const db = getDb()

  // Idempotency — Dodo retries on non-2xx. Record-or-noop on the event id BEFORE dispatch.
  const inserted = await db
    .insert(paymentEvents)
    .values({
      eventId: webhookId,
      eventType: evt.type,
      payload: evt as unknown as Record<string, unknown>,
    })
    .onConflictDoNothing()
    .returning({ eventId: paymentEvents.eventId })

  if (inserted.length === 0) {
    return NextResponse.json({ ok: true, deduplicated: true })
  }

  // ── Dispatch matrix ──────────────────────────────────────────────────────
  try {
    switch (evt.type) {
      case "payment.succeeded":
        return await handlePaymentSucceeded(evt, webhookId)

      case "subscription.active":
        return await handleSubscriptionActive(evt)

      case "subscription.cancelled":
        return await handleSubscriptionCancelled(evt)

      case "subscription.past_due":
      case "subscription.payment_failed":
        return await handleSubscriptionPastDue(evt)

      default:
        // Includes credit.added, credit.deducted, credit.expired, subscription.renewed
        // (when present), refund.* — recorded for audit, no runtime action.
        return NextResponse.json({ ok: true, recorded: true })
    }
  } catch (err) {
    // Surface as 5xx so Dodo retries. Idempotency on payment_events makes retries safe.
    console.error("dodo webhook handler error", { type: evt.type, err })
    return NextResponse.json(
      { error: "handler failed" },
      { status: 500 },
    )
  }
}

// ── Handlers ────────────────────────────────────────────────────────────────

async function handlePaymentSucceeded(evt: DodoEvent, webhookId: string) {
  const meta = evt.data?.metadata ?? {}
  const purchaseType = meta.purchase_type
  const subscriptionId = evt.data?.subscription_id
  const paymentId = evt.data?.payment_id ?? webhookId

  // A subscription's recurring charge (monthly or annual) — reset monthly credits +
  // advance our monthly refresh anchor by 30 days. We intentionally ignore Dodo's
  // current_period_end here: for annual subscribers Dodo charges once a year, but our
  // credit grants stay monthly, so planPeriodEnd is always +30d regardless of cycle.
  // Subscription's INITIAL charge ALSO sends payment.succeeded, but subscription.active
  // is what actually links the subscription to the user. The applySubscriptionRenewed
  // helper is a no-op if the subscription isn't known yet.
  if (subscriptionId) {
    await applySubscriptionRenewed({
      dodoSubscriptionId: subscriptionId,
      periodEnd: nextMonthlyAnchor(),
      paymentId,
    })
    return NextResponse.json({ ok: true, action: "subscription_renewed" })
  }

  // One-time top-up payment.
  if (purchaseType === "topup") {
    const userId = meta.user_id
    const packId = meta.pack_id
    if (!userId || !packId) {
      return NextResponse.json({ ok: true, skipped: "missing metadata" })
    }
    const pack = getTopupPack(packId)
    if (!pack) {
      return NextResponse.json({ ok: true, skipped: "unknown pack" })
    }
    await grantTopupCredits({
      userId,
      amount: pack.credits,
      packId: pack.id,
      paymentId,
      description: `Purchased ${pack.label}`,
      metadata: { eventId: webhookId, eventType: evt.type },
    })
    return NextResponse.json({ ok: true, action: "topup_granted", credits: pack.credits })
  }

  // Unrecognized payment shape — recorded for audit, no credit action.
  return NextResponse.json({ ok: true, skipped: "no actionable metadata" })
}

async function handleSubscriptionActive(evt: DodoEvent) {
  const meta = evt.data?.metadata ?? {}
  const userId = meta.user_id
  const planId = meta.plan_id
  const subscriptionId = evt.data?.subscription_id
  const billingCycle =
    meta.billing_cycle === "annual" ? "annual" : "monthly"

  if (!userId || !planId || !subscriptionId) {
    return NextResponse.json({ ok: true, skipped: "missing identifiers" })
  }

  // planPeriodEnd is OUR monthly credit refresh anchor, not Dodo's cycle. Always +30d.
  await applySubscriptionActive({
    userId,
    planId,
    billingCycle,
    dodoSubscriptionId: subscriptionId,
    periodEnd: nextMonthlyAnchor(),
  })
  return NextResponse.json({ ok: true, action: "subscription_activated" })
}

async function handleSubscriptionCancelled(evt: DodoEvent) {
  const subscriptionId = evt.data?.subscription_id
  if (!subscriptionId) {
    return NextResponse.json({ ok: true, skipped: "no subscription_id" })
  }
  await applySubscriptionCancelled({ dodoSubscriptionId: subscriptionId })
  return NextResponse.json({ ok: true, action: "subscription_cancelled" })
}

async function handleSubscriptionPastDue(evt: DodoEvent) {
  const subscriptionId = evt.data?.subscription_id
  if (!subscriptionId) {
    return NextResponse.json({ ok: true, skipped: "no subscription_id" })
  }
  await applySubscriptionPastDue({ dodoSubscriptionId: subscriptionId })
  return NextResponse.json({ ok: true, action: "subscription_past_due" })
}

/** Next monthly credit refresh anchor — always 30 days from now, irrespective of billing cycle. */
function nextMonthlyAnchor(): Date {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
}
