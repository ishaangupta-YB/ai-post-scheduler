import { getCloudflareContext } from "@opennextjs/cloudflare"

function b64uEncode(bytes: Uint8Array): string {
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

function b64StandardDecode(input: string): Uint8Array {
  const s = atob(input)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

let cachedKey: CryptoKey | null = null

async function getKek(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey
  const { env } = getCloudflareContext()
  const raw = env.INTEGRATION_TOKEN_KEK
  if (!raw) {
    throw new Error(
      "INTEGRATION_TOKEN_KEK is not set. Generate one with `openssl rand -base64 32` and add it to .dev.vars or Workers secrets.",
    )
  }
  let keyBytes: Uint8Array
  try {
    keyBytes = b64StandardDecode(raw)
  } catch {
    throw new Error("INTEGRATION_TOKEN_KEK must be a base64-encoded value")
  }
  if (keyBytes.length !== 32) {
    throw new Error(
      `INTEGRATION_TOKEN_KEK must decode to 32 bytes (got ${keyBytes.length}). Generate with: openssl rand -base64 32`,
    )
  }
  cachedKey = await crypto.subtle.importKey(
    "raw",
    keyBytes as BufferSource,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  )
  return cachedKey
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKek()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      new TextEncoder().encode(plaintext) as BufferSource,
    ),
  )
  return `${b64uEncode(iv)}.${b64uEncode(ciphertext)}`
}

export async function decrypt(payload: string): Promise<string> {
  if (typeof payload !== "string" || payload.length === 0) {
    throw new Error("Malformed encrypted payload")
  }
  const parts = payload.split(".")
  if (parts.length !== 2) throw new Error("Malformed encrypted payload")
  const [ivPart, ctPart] = parts
  if (!ivPart || !ctPart) throw new Error("Malformed encrypted payload")
  const key = await getKek()
  const iv = b64uDecode(ivPart)
  const ciphertext = b64uDecode(ctPart)
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    ciphertext as BufferSource,
  )
  return new TextDecoder().decode(plaintext)
}

export async function encryptNullable(
  value: string | null | undefined,
): Promise<string | null> {
  if (value == null || value === "") return null
  return encrypt(value)
}

export async function decryptNullable(
  value: string | null | undefined,
): Promise<string | null> {
  if (value == null || value === "") return null
  return decrypt(value)
}
