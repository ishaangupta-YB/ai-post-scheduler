// Dodo Payments REST client — direct fetch keeps it Worker-friendly (no Node SDK polyfills).
// Docs: https://docs.dodopayments.com/
// Webhook signatures follow the Standard Webhooks spec: https://www.standardwebhooks.com/

const TEST_BASE = "https://test.dodopayments.com"
const LIVE_BASE = "https://live.dodopayments.com"

export type DodoCreatePaymentInput = {
  productId: string
  quantity?: number
  customer: { email: string; name: string }
  // Billing address — Dodo requires this for tax compliance. Fall back to a sane default if unknown.
  billing: {
    country: string
    state?: string
    city?: string
    street?: string
    zipcode?: string
  }
  returnUrl: string
  metadata: Record<string, string>
}

export type DodoCreatePaymentResult = {
  payment_id: string
  payment_link: string
}

type DodoEnv = Pick<CloudflareEnv, "DODO_API_KEY" | "DODO_MODE">

function baseUrl(env: DodoEnv): string {
  return env.DODO_MODE === "live" ? LIVE_BASE : TEST_BASE
}

export async function createPayment(
  env: DodoEnv,
  input: DodoCreatePaymentInput,
): Promise<DodoCreatePaymentResult> {
  const res = await fetch(`${baseUrl(env)}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.DODO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      payment_link: true,
      product_cart: [
        { product_id: input.productId, quantity: input.quantity ?? 1 },
      ],
      customer: input.customer,
      billing: input.billing,
      return_url: input.returnUrl,
      metadata: input.metadata,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Dodo createPayment ${res.status}: ${body}`)
  }

  return (await res.json()) as DodoCreatePaymentResult
}

// ── Subscriptions ────────────────────────────────────────────────────────────
// Subscription product = recurring billing. Dodo fires `subscription.active` on
// activation and `payment.succeeded` (with subscription_id) on each renewal.

export type DodoCreateSubscriptionInput = {
  productId: string
  quantity?: number
  customer: { email: string; name: string }
  billing: {
    country: string
    state?: string
    city?: string
    street?: string
    zipcode?: string
  }
  returnUrl: string
  metadata: Record<string, string>
}

export type DodoCreateSubscriptionResult = {
  subscription_id: string
  payment_link: string
}

export async function createSubscription(
  env: DodoEnv,
  input: DodoCreateSubscriptionInput,
): Promise<DodoCreateSubscriptionResult> {
  const res = await fetch(`${baseUrl(env)}/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.DODO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      payment_link: true,
      product_id: input.productId,
      quantity: input.quantity ?? 1,
      customer: input.customer,
      billing: input.billing,
      return_url: input.returnUrl,
      metadata: input.metadata,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Dodo createSubscription ${res.status}: ${body}`)
  }

  return (await res.json()) as DodoCreateSubscriptionResult
}

// ── Webhook signature verification (Standard Webhooks spec) ──────────────────
// Dodo sends three headers: webhook-id, webhook-timestamp, webhook-signature.
// The signature header is space-separated `v1,<base64>` pairs (multiple keys
// during rotation). We verify HMAC-SHA256 over `${id}.${timestamp}.${body}`.

const TOLERANCE_SECONDS = 5 * 60

export async function verifyWebhookSignature(args: {
  secret: string
  webhookId: string
  webhookTimestamp: string
  webhookSignature: string
  rawBody: string
}): Promise<boolean> {
  const ts = Number(args.webhookTimestamp)
  if (!Number.isFinite(ts)) return false
  const nowSec = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSec - ts) > TOLERANCE_SECONDS) return false

  // Secret may be prefixed with `whsec_` — strip it before decoding.
  const rawSecret = args.secret.startsWith("whsec_")
    ? args.secret.slice("whsec_".length)
    : args.secret

  const keyBytes = base64Decode(rawSecret)
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )

  const toSign = `${args.webhookId}.${args.webhookTimestamp}.${args.rawBody}`
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(toSign) as BufferSource,
  )
  const expected = base64Encode(new Uint8Array(sigBuf))

  // Header carries space-separated `v1,<sig>` pairs.
  const candidates = args.webhookSignature.split(" ").map((p) => {
    const [, sig] = p.split(",", 2)
    return sig
  })

  return candidates.some((sig) => sig && timingSafeEqual(sig, expected))
}

function base64Decode(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function base64Encode(bytes: Uint8Array): string {
  let bin = ""
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// ── Event payload typing ─────────────────────────────────────────────────────
// We only act on payment success. Other event types are recorded for audit but
// ignored. Dodo's `type` strings follow `payment.<state>` / `subscription.<state>`.

export type DodoEvent = {
  type: string
  data: {
    payment_id?: string
    subscription_id?: string
    status?: string
    metadata?: Record<string, string>
    // Subscription period fields — present on subscription.* events
    next_billing_date?: string
    current_period_end?: string
    [k: string]: unknown
  }
}

export function isSuccessfulPaymentEvent(evt: DodoEvent): boolean {
  return evt.type === "payment.succeeded"
}

/** Extracts the period-end Date from a subscription event, preferring `current_period_end`. */
export function getSubscriptionPeriodEnd(evt: DodoEvent): Date | null {
  const raw = evt.data?.current_period_end ?? evt.data?.next_billing_date
  if (!raw) return null
  const ms = Date.parse(raw)
  return Number.isFinite(ms) ? new Date(ms) : null
}
