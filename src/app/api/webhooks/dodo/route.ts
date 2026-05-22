import { NextResponse } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"

import { getDb, paymentEvents } from "@/db"
import {
  isSuccessfulPaymentEvent,
  verifyWebhookSignature,
  type DodoEvent,
} from "@/lib/billing/dodo"
import { grantCredits } from "@/lib/billing/credits"
import { getPack } from "@/lib/billing/packs"

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

  // Idempotency — Dodo retries on non-2xx. Record-or-noop on the event id.
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
    // Already processed.
    return NextResponse.json({ ok: true, deduplicated: true })
  }

  if (!isSuccessfulPaymentEvent(evt)) {
    // Recorded for audit, no action needed.
    return NextResponse.json({ ok: true })
  }

  const meta = evt.data?.metadata ?? {}
  const userId = meta.user_id
  const packId = meta.pack_id
  const paymentId = evt.data?.payment_id ?? webhookId

  if (!userId || !packId) {
    // Missing metadata means we can't credit a user. 200 so Dodo doesn't retry forever.
    return NextResponse.json({ ok: true, skipped: "missing metadata" })
  }

  const pack = getPack(packId)
  if (!pack) {
    return NextResponse.json({ ok: true, skipped: "unknown pack" })
  }

  await grantCredits({
    userId,
    amount: pack.credits,
    type: "purchase",
    description: `Purchased ${pack.label} pack`,
    paymentId,
    packId: pack.id,
    metadata: { eventId: webhookId, eventType: evt.type },
  })

  return NextResponse.json({ ok: true, credited: pack.credits })
}
