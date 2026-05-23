import { headers } from "next/headers"
import { NextResponse } from "next/server"

import {
  integrationPlatforms,
  type IntegrationPlatform,
} from "@/db/integrations-schema"
import { getAuth } from "@/lib/auth"
import {
  ProviderNotConfiguredError,
  getAppUrl,
  getOAuthProvider,
} from "@/lib/oauth"
import { createPkcePair, getPkceCookieName } from "@/lib/oauth/pkce"
import { createOAuthState } from "@/lib/oauth/state"

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

  let provider
  try {
    provider = getOAuthProvider(typedPlatform)
  } catch (err) {
    if (err instanceof ProviderNotConfiguredError) {
      return NextResponse.json(
        {
          error: "not_configured",
          message: err.message,
          missing: err.missingKeys,
        },
        { status: 503 },
      )
    }
    throw err
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

  const redirectTo = "/dashboard/integrations"
  const state = await createOAuthState({
    userId: session.user.id,
    platform: typedPlatform,
    redirectTo,
  })
  const redirectUri = `${appUrl}/api/integrations/callback`

  const pkce = provider.usesPkce ? await createPkcePair() : null

  let url: string
  try {
    url = provider.getAuthorizationUrl({
      state,
      redirectUri,
      codeChallenge: pkce?.codeChallenge,
      codeChallengeMethod: pkce?.codeChallengeMethod,
    })
  } catch (err) {
    if (err instanceof ProviderNotConfiguredError) {
      return NextResponse.json(
        {
          error: "not_configured",
          message: err.message,
          missing: err.missingKeys,
        },
        { status: 503 },
      )
    }
    throw err
  }

  const response = NextResponse.json({ url })

  if (pkce) {
    const cookieName = await getPkceCookieName(state)
    response.cookies.set(cookieName, pkce.codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    })
  }

  return response
}
