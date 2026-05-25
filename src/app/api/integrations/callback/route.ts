import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { getDb, integrations } from "@/db"
import {
  integrationPlatforms,
  type IntegrationPlatform,
} from "@/db/integrations-schema"
import { getAuth } from "@/lib/auth"
import { getConnection } from "@/lib/composio/connections"
import { getAppUrl } from "@/lib/composio/platforms"

const DEFAULT_REDIRECT = "/dashboard/integrations"
const MAX_RAW_METADATA_BYTES = 4096

// Strict allowlist. Anything else falls back to /dashboard/integrations.
// Defends against open-redirect even if the platform query param gets
// user-influenced later.
function safeRedirectPath(path: string): string {
  if (typeof path !== "string" || path.length === 0) return DEFAULT_REDIRECT
  if (!path.startsWith("/")) return DEFAULT_REDIRECT
  if (path.startsWith("//")) return DEFAULT_REDIRECT
  if (path.includes("\\")) return DEFAULT_REDIRECT
  if (path.includes("..")) return DEFAULT_REDIRECT
  const noQuery = path.split(/[?#]/, 1)[0]
  if (noQuery.includes(":")) return DEFAULT_REDIRECT
  if (!path.startsWith("/dashboard/")) return DEFAULT_REDIRECT
  return path
}

function redirectTo(
  appUrl: string,
  path: string,
  params: Record<string, string>,
): NextResponse {
  const url = new URL(safeRedirectPath(path), appUrl)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return NextResponse.redirect(url)
}

function summarizeError(err: unknown): string {
  if (err instanceof Error) return err.message.slice(0, 200)
  if (typeof err === "string") return err.slice(0, 200)
  return "unknown_error"
}

// Bound stored Composio profile data — provider responses can include
// embedded media URLs or large payloads we don't want in D1's text JSON.
function capRaw(raw: unknown): unknown {
  if (raw == null) return undefined
  try {
    const s = JSON.stringify(raw)
    if (s.length <= MAX_RAW_METADATA_BYTES) return raw
    return { _truncated: true, _bytes: s.length, head: s.slice(0, MAX_RAW_METADATA_BYTES) }
  } catch {
    return { _unserializable: true }
  }
}

// Best-effort field extraction from Composio's getConnection() data payload.
// Provider responses vary; we narrow opportunistically and store the rest
// inside metadata.raw.
function extractProfileFields(data: unknown): {
  handle: string | null
  profileImage: string | null
  profileUrl: string | null
  providerAccountId: string | null
} {
  if (!data || typeof data !== "object") {
    return {
      handle: null,
      profileImage: null,
      profileUrl: null,
      providerAccountId: null,
    }
  }
  const d = data as Record<string, unknown>
  const pickStr = (...keys: string[]): string | null => {
    for (const k of keys) {
      const v = d[k]
      if (typeof v === "string" && v.length > 0) return v
    }
    return null
  }
  return {
    handle: pickStr("username", "handle", "screen_name", "name", "display_name"),
    profileImage: pickStr("profile_image_url", "profile_image", "picture", "avatar_url"),
    profileUrl: pickStr("profile_url", "url", "html_url"),
    providerAccountId: pickStr("id", "user_id", "sub", "open_id", "provider_account_id"),
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
  const status = searchParams.get("status")
  const connectedAccountId = searchParams.get("connectedAccountId")
  const platformParam = searchParams.get("platform")
  const errorMessage = searchParams.get("error_message") ?? searchParams.get("error")

  // Validate platform from our round-tripped query param.
  const platform =
    platformParam &&
    (integrationPlatforms as readonly string[]).includes(platformParam)
      ? (platformParam as IntegrationPlatform)
      : null

  if (!platform) {
    return redirectTo(appUrl, DEFAULT_REDIRECT, {
      connected: "false",
      error: "invalid_platform",
    })
  }

  const session = await getAuth().api.getSession({ headers: await headers() })
  if (!session) {
    return redirectTo(appUrl, DEFAULT_REDIRECT, {
      connected: "false",
      error: "unauthorized",
      platform,
    })
  }

  if (status !== "success") {
    return redirectTo(appUrl, DEFAULT_REDIRECT, {
      connected: "false",
      error: status ?? "callback_failed",
      ...(errorMessage ? { details: errorMessage.slice(0, 200) } : {}),
      platform,
    })
  }

  if (!connectedAccountId) {
    return redirectTo(appUrl, DEFAULT_REDIRECT, {
      connected: "false",
      error: "missing_connected_account_id",
      platform,
    })
  }

  try {
    // Pull profile data so the row shows a handle / avatar; non-fatal if it
    // 404s — Composio sometimes needs a beat to finalize the connection, so
    // we proceed with what we have and let the publisher backfill later.
    const conn = await getConnection(connectedAccountId)
    const { handle, profileImage, profileUrl, providerAccountId } =
      extractProfileFields(conn?.data)
    const cappedRaw = capRaw(conn?.data)
    const metadata: Record<string, unknown> = {
      composio: {
        connectedAccountId,
        status: conn?.status ?? "ACTIVE",
        toolkitSlug: conn?.toolkitSlug,
      },
      ...(providerAccountId ? { providerAccountId } : {}),
      ...(cappedRaw ? { raw: cappedRaw } : {}),
    }

    const now = new Date()
    const db = getDb()
    await db
      .insert(integrations)
      .values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        platform,
        handle,
        profileImage,
        profileUrl,
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        scope: null,
        composioConnectedAccountId: connectedAccountId,
        metadata,
        status: "active",
        connectedAt: now,
        lastSyncAt: now,
      })
      .onConflictDoUpdate({
        target: [integrations.userId, integrations.platform],
        set: {
          handle,
          profileImage,
          profileUrl,
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          scope: null,
          composioConnectedAccountId: connectedAccountId,
          metadata,
          status: "active",
          connectedAt: now,
          lastSyncAt: now,
          updatedAt: now,
        },
      })

    return redirectTo(appUrl, DEFAULT_REDIRECT, {
      connected: "true",
      platform,
    })
  } catch (err) {
    const message = summarizeError(err)
    console.error(
      `[composio/callback] upsert failed platform=${platform} userId=${session.user.id} message=${message}`,
    )
    return redirectTo(appUrl, DEFAULT_REDIRECT, {
      connected: "false",
      error: "callback_failed",
      details: message,
      platform,
    })
  }
}
