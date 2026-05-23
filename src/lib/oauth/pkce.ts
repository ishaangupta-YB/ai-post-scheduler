function b64u(bytes: Uint8Array): string {
  let s = ""
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export type PkcePair = {
  codeVerifier: string
  codeChallenge: string
  codeChallengeMethod: "S256"
}

export async function createPkcePair(): Promise<PkcePair> {
  const verifierBytes = crypto.getRandomValues(new Uint8Array(48))
  const codeVerifier = b64u(verifierBytes)
  const hash = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(codeVerifier) as BufferSource,
    ),
  )
  return {
    codeVerifier,
    codeChallenge: b64u(hash),
    codeChallengeMethod: "S256",
  }
}

export async function getPkceCookieName(state: string): Promise<string> {
  const hash = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(state) as BufferSource,
    ),
  )
  return `bs_pkce_${b64u(hash).slice(0, 16)}`
}
