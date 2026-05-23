import type { IntegrationPlatform } from "@/db/integrations-schema"

import { OAuthExchangeError, type OAuthToken } from "../types"

export function formUrlencoded(obj: Record<string, string | undefined>): URLSearchParams {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(obj)) {
    if (v != null) params.set(k, v)
  }
  return params
}

export function parseTokenResponse(json: {
  access_token?: string
  refresh_token?: string | null
  expires_in?: number | null
  scope?: string | null
  [k: string]: unknown
}): OAuthToken {
  if (!json.access_token) {
    throw new Error("Token response missing access_token")
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: json.expires_in
      ? new Date(Date.now() + json.expires_in * 1000)
      : null,
    scope: json.scope ?? null,
  }
}

export async function postForm(
  url: string,
  body: URLSearchParams,
  init?: { headers?: Record<string, string>; platform: IntegrationPlatform },
): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
      ...(init?.headers ?? {}),
    },
    body,
  })
  const text = await res.text()
  if (!res.ok) {
    throw new OAuthExchangeError(
      init?.platform ?? ("TWITTER" as IntegrationPlatform),
      `Token exchange failed (${res.status}): ${text.slice(0, 300)}`,
      res.status,
    )
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new OAuthExchangeError(
      init?.platform ?? ("TWITTER" as IntegrationPlatform),
      `Token response was not JSON: ${text.slice(0, 300)}`,
    )
  }
}

export async function fetchJson(
  url: string,
  init: RequestInit & { platform: IntegrationPlatform },
): Promise<unknown> {
  const { platform, ...rest } = init
  const res = await fetch(url, rest)
  const text = await res.text()
  if (!res.ok) {
    throw new OAuthExchangeError(
      platform,
      `Profile fetch failed (${res.status}): ${text.slice(0, 300)}`,
      res.status,
    )
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new OAuthExchangeError(
      platform,
      `Profile response was not JSON: ${text.slice(0, 300)}`,
    )
  }
}

export function basicAuthHeader(clientId: string, clientSecret: string): string {
  return `Basic ${btoa(`${clientId}:${clientSecret}`)}`
}
