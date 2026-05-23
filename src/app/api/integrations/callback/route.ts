import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { getDb, integrations } from "@/db"
import { getAuth } from "@/lib/auth"
import { getAppUrl, getOAuthProvider } from "@/lib/oauth"
import { encryptNullable } from "@/lib/oauth/crypto"
import { getPkceCookieName } from "@/lib/oauth/pkce"
import { verifyOAuthState } from "@/lib/oauth/state"

const DEFAULT_REDIRECT = "/dashboard/integrations"
const MAX_RAW_METADATA_BYTES = 4096

// Strict allowlist. Anything else falls back to /dashboard/integrations.
// Defends against open-redirect even if state.redirectTo gets user-influenced later.
function safeRedirectPath(path: string): string {
  if (typeof path !== "string" || path.length === 0) return DEFAULT_REDIRECT
  if (!path.startsWith("/")) return DEFAULT_REDIRECT          // refuses //evil.com, https://…
  if (path.startsWith("//")) return DEFAULT_REDIRECT          // protocol-relative
  if (path.includes("\\")) return DEFAULT_REDIRECT
  if (path.includes("..")) return DEFAULT_REDIRECT
  // A colon in the path component would indicate a scheme (javascript:, data:, etc.).
  // Strip a query string before checking; ? and # are fine.
  const noQuery = path.split(/[?#]/, 1)[0]
  if (noQuery.includes(":")) return DEFAULT_REDIRECT
  if (!path.startsWith("/dashboard/")) return DEFAULT_REDIRECT
  return path
}

async function redirectTo(
  appUrl: string,
  path: string,
  params: Record<string, string>,
  clearPkceCookieFor?: string,
): Promise<NextResponse> {
  const url = new URL(safeRedirectPath(path), appUrl)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const response = NextResponse.redirect(url)
  if (clearPkceCookieFor) {
    response.cookies.delete(await getPkceCookieName(clearPkceCookieFor))
  }
  return response
}

function summarizeError(err: unknown): string {
  if (err instanceof Error) return err.message.slice(0, 200)
  if (typeof err === "string") return err.slice(0, 200)
  return "unknown_error"
}

// Cap stored raw profile data so we don't pile huge provider responses
// (data: URIs, embedded media) into D1's text-mode JSON column.
function capRaw(raw: unknown): unknown {
  if (!raw) return undefined
  try {
    const s = JSON.stringify(raw)
    if (s.length <= MAX_RAW_METADATA_BYTES) return raw
    return { _truncated: true, _bytes: s.length, head: s.slice(0, MAX_RAW_METADATA_BYTES) }
  } catch {
    return { _unserializable: true }
  }
}

export async function GET(request: NextRequest) {
  let appUrl: string
  try {
    appUrl = getAppUrl()
  } catch {
    return NextResponse.json(
      { error: "not_configured", message: "NEXT_PUBLIC_APP_URL is not set" },
      { status: 503 },
    )
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const stateParam = searchParams.get("state")
  const providerError = searchParams.get("error")
  const providerErrorDescription = searchParams.get("error_description")

  if (!stateParam) {
    return redirectTo(appUrl, DEFAULT_REDIRECT, {
      connected: "false",
      error: "missing_state",
    })
  }

  let state
  try {
    state = await verifyOAuthState(stateParam)
  } catch (err) {
    console.error("[oauth/callback] state verify failed", summarizeError(err))
    return redirectTo(
      appUrl,
      DEFAULT_REDIRECT,
      { connected: "false", error: "invalid_state" },
      stateParam,
    )
  }

  if (providerError) {
    console.error(
      `[oauth/callback] provider returned error platform=${state.platform} userId=${state.userId} error=${providerError} desc=${providerErrorDescription ?? ""}`,
    )
    const params: Record<string, string> = {
      connected: "false",
      error: providerError,
    }
    if (providerErrorDescription) {
      params.details = providerErrorDescription.slice(0, 200)
    }
    return redirectTo(appUrl, state.redirectTo, params, stateParam)
  }

  if (!code) {
    return redirectTo(
      appUrl,
      state.redirectTo,
      { connected: "false", error: "missing_code" },
      stateParam,
    )
  }

  const session = await getAuth().api.getSession({ headers: await headers() })
  if (!session || session.user.id !== state.userId) {
    return redirectTo(
      appUrl,
      state.redirectTo,
      { connected: "false", error: "unauthorized" },
      stateParam,
    )
  }

  const provider = getOAuthProvider(state.platform)
  const redirectUri = `${appUrl}/api/integrations/callback`

  let codeVerifier: string | undefined
  if (provider.usesPkce) {
    const cookieName = await getPkceCookieName(stateParam)
    codeVerifier = request.cookies.get(cookieName)?.value
    if (!codeVerifier) {
      return redirectTo(
        appUrl,
        state.redirectTo,
        { connected: "false", error: "missing_pkce" },
        stateParam,
      )
    }
  }

  try {
    const token = await provider.exchangeCodeForToken({
      code,
      redirectUri,
      codeVerifier,
    })
    const profile = await provider.getProfile({ accessToken: token.accessToken })

    const encAccess = await encryptNullable(token.accessToken)
    const encRefresh = await encryptNullable(token.refreshToken)
    const now = new Date()

    const cappedRaw = capRaw(profile.raw)
    const metadata: Record<string, unknown> = {
      providerAccountId: profile.providerAccountId,
      ...(cappedRaw ? { raw: cappedRaw } : {}),
    }

    const db = getDb()
    await db
      .insert(integrations)
      .values({
        id: crypto.randomUUID(),
        userId: state.userId,
        platform: state.platform,
        handle: profile.handle ?? null,
        profileImage: profile.profileImage ?? null,
        profileUrl: profile.profileUrl ?? null,
        accessToken: encAccess,
        refreshToken: encRefresh,
        tokenExpiresAt: token.expiresAt ?? null,
        scope: token.scope ?? null,
        metadata,
        status: "active",
        connectedAt: now,
        lastSyncAt: now,
      })
      .onConflictDoUpdate({
        target: [integrations.userId, integrations.platform],
        set: {
          handle: profile.handle ?? null,
          profileImage: profile.profileImage ?? null,
          profileUrl: profile.profileUrl ?? null,
          accessToken: encAccess,
          refreshToken: encRefresh,
          tokenExpiresAt: token.expiresAt ?? null,
          scope: token.scope ?? null,
          metadata,
          status: "active",
          connectedAt: now,
          lastSyncAt: now,
          updatedAt: now,
        },
      })

    return redirectTo(
      appUrl,
      state.redirectTo,
      { connected: "true", platform: state.platform },
      stateParam,
    )
  } catch (err) {
    const message = summarizeError(err)
    console.error(
      `[oauth/callback] exchange failed platform=${state.platform} userId=${state.userId} message=${message}`,
    )
    return redirectTo(
      appUrl,
      state.redirectTo,
      { connected: "false", error: "callback_failed", details: message },
      stateParam,
    )
  }
}
