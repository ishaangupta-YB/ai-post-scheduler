import { headers } from "next/headers"
import { NextResponse } from "next/server"

import {
  integrationPlatforms,
  type IntegrationPlatform,
} from "@/db/integrations-schema"
import { getAuth } from "@/lib/auth"
import { ComposioNotConfiguredError } from "@/lib/composio/client"
import { startConnection } from "@/lib/composio/connections"
import { getAppUrl, getPlatformConfig } from "@/lib/composio/platforms"

export async function POST(request: Request) {
  const session = await getAuth().api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as {
    platform?: string
  } | null
  const platform = body?.platform
  if (
    !platform ||
    !(integrationPlatforms as readonly string[]).includes(platform)
  ) {
    return NextResponse.json(
      { error: "invalid_platform", message: "Unknown platform" },
      { status: 400 },
    )
  }
  const typedPlatform = platform as IntegrationPlatform
  const cfg = getPlatformConfig(typedPlatform)

  if (!cfg.enabled) {
    return NextResponse.json(
      {
        error: "platform_disabled",
        message: `${typedPlatform} via Composio is coming soon`,
      },
      { status: 503 },
    )
  }

  let appUrl: string
  try {
    appUrl = getAppUrl()
  } catch {
    return NextResponse.json(
      { error: "not_configured", message: "NEXT_PUBLIC_APP_URL is not set" },
      { status: 503 },
    )
  }

  // Composio appends `?status=success&connectedAccountId=…` (or status=failed)
  // to whatever callbackUrl we pass. We round-trip the platform via a query
  // param so the callback knows which row to upsert without re-reading
  // Composio. (`appName` from Composio is the toolkit slug, not our enum.)
  const callbackUrl = `${appUrl}/api/integrations/callback?platform=${encodeURIComponent(typedPlatform)}`

  try {
    const { redirectUrl } = await startConnection({
      userId: session.user.id,
      platform: typedPlatform,
      callbackUrl,
    })
    if (!redirectUrl) {
      return NextResponse.json(
        {
          error: "no_redirect_url",
          message:
            "Composio did not return a redirect URL for this auth scheme",
        },
        { status: 502 },
      )
    }
    return NextResponse.json({ url: redirectUrl })
  } catch (err) {
    if (err instanceof ComposioNotConfiguredError) {
      return NextResponse.json(
        {
          error: "not_configured",
          message: err.message,
          missing: err.missingKeys,
        },
        { status: 503 },
      )
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error(
      `[composio/connect] start failed platform=${typedPlatform} userId=${session.user.id} message=${message}`,
    )
    return NextResponse.json(
      { error: "composio_failed", message },
      { status: 502 },
    )
  }
}
