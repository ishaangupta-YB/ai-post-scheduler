import { getCloudflareContext } from "@opennextjs/cloudflare"

import {
  integrationPlatforms,
  type IntegrationPlatform,
} from "@/db/integrations-schema"

export type StatePayload = {
  userId: string
  platform: IntegrationPlatform
  redirectTo: string
  nonce: string
  exp: number
}

const STATE_TTL_MS = 10 * 60_000

function b64u(bytes: Uint8Array): string {
  let s = ""
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function b64uDecode(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4))
  const s = atob(input.replace(/-/g, "+").replace(/_/g, "/") + pad)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

async function importHmac(): Promise<CryptoKey> {
  const { env } = getCloudflareContext()
  const secret = env.BETTER_AUTH_SECRET
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required to sign OAuth state")
  }
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret) as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  )
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

export async function createOAuthState(input: {
  userId: string
  platform: IntegrationPlatform
  redirectTo: string
}): Promise<string> {
  const payload: StatePayload = {
    userId: input.userId,
    platform: input.platform,
    redirectTo: input.redirectTo,
    nonce: b64u(crypto.getRandomValues(new Uint8Array(16))),
    exp: Date.now() + STATE_TTL_MS,
  }
  const json = JSON.stringify(payload)
  const payloadB64 = b64u(new TextEncoder().encode(json))
  const key = await importHmac()
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(payloadB64) as BufferSource,
    ),
  )
  return `${payloadB64}.${b64u(sig)}`
}

export async function verifyOAuthState(stateParam: string): Promise<StatePayload> {
  if (typeof stateParam !== "string" || stateParam.length === 0) {
    throw new Error("Malformed state token")
  }
  const parts = stateParam.split(".")
  if (parts.length !== 2) throw new Error("Malformed state token")
  const [payloadB64, sigB64] = parts
  if (!payloadB64 || !sigB64) throw new Error("Malformed state token")

  const key = await importHmac()
  const expected = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(payloadB64) as BufferSource,
    ),
  )
  const provided = b64uDecode(sigB64)
  if (!constantTimeEqual(expected, provided)) {
    throw new Error("Invalid state signature")
  }

  const json = new TextDecoder().decode(b64uDecode(payloadB64))
  const parsed = JSON.parse(json) as StatePayload
  if (
    typeof parsed.userId !== "string" ||
    typeof parsed.platform !== "string" ||
    !(integrationPlatforms as readonly string[]).includes(parsed.platform) ||
    typeof parsed.redirectTo !== "string" ||
    typeof parsed.nonce !== "string" ||
    typeof parsed.exp !== "number"
  ) {
    throw new Error("Malformed state payload")
  }
  if (parsed.exp < Date.now()) {
    throw new Error("State token expired")
  }
  return parsed
}
