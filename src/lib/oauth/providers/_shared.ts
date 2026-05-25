/**
 * ============================================================================
 * LEGACY — DO NOT TOUCH
 * ============================================================================
 * This file is part of the hand-rolled per-platform OAuth system that was
 * REPLACED by Composio in session 8 (2026-05-25). It is kept (commented out)
 * for historical reference only.
 *
 * Active OAuth + tool execution now lives in:
 *   src/lib/composio/        — SDK client, platform map, connection wrappers
 *   src/lib/composio/tools.ts — direct tool execution (no LLM)
 *   src/app/api/integrations/{connect,callback,disconnect}/route.ts
 *
 * Future agents: DO NOT re-enable, edit, or import from this file. The
 * primitives here (HMAC state, PKCE, AES-GCM token encryption, per-provider
 * exchange code, token refresh) are obsolete because Composio manages OAuth
 * tokens server-side. If you need any of these again, build fresh — don't
 * resurrect this code.
 * ============================================================================
 */

/* eslint-disable */
/*
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
*/

export {}
