import { getCloudflareContext } from "@opennextjs/cloudflare"

import type { IntegrationPlatform } from "@/db/integrations-schema"

import { facebookProvider } from "./providers/facebook"
import { instagramProvider } from "./providers/instagram"
import { linkedinProvider } from "./providers/linkedin"
import { threadsProvider } from "./providers/threads"
import { tiktokProvider } from "./providers/tiktok"
import { twitterProvider } from "./providers/twitter"
import { youtubeProvider } from "./providers/youtube"
import { ProviderNotConfiguredError, type OAuthProvider } from "./types"

export { ProviderNotConfiguredError, OAuthExchangeError } from "./types"
export type {
  OAuthProvider,
  OAuthToken,
  OAuthProfile,
} from "./types"

export type ProviderConfig = {
  clientId: string
  clientSecret: string
  authUrl: string
  tokenUrl: string
  profileUrl: string
  scopes: string[]
}

const ENV_PREFIX: Record<IntegrationPlatform, string> = {
  TWITTER: "TWITTER",
  LINKEDIN: "LINKEDIN",
  INSTAGRAM: "INSTAGRAM",
  THREADS: "THREADS",
  FACEBOOK: "FACEBOOK",
  YOUTUBE: "YOUTUBE",
  TIKTOK: "TIKTOK",
}

export function getProviderConfig(platform: IntegrationPlatform): ProviderConfig {
  const prefix = ENV_PREFIX[platform]
  const { env } = getCloudflareContext()
  const e = env as unknown as Record<string, string | undefined>

  const clientId = e[`${prefix}_CLIENT_ID`]
  const clientSecret = e[`${prefix}_CLIENT_SECRET`]
  const authUrl = e[`${prefix}_AUTH_URL`]
  const tokenUrl = e[`${prefix}_TOKEN_URL`]
  const profileUrl = e[`${prefix}_PROFILE_URL`]
  const scopesRaw = e[`${prefix}_SCOPES`]

  const missing: string[] = []
  if (!clientId) missing.push(`${prefix}_CLIENT_ID`)
  if (!clientSecret) missing.push(`${prefix}_CLIENT_SECRET`)
  if (!authUrl) missing.push(`${prefix}_AUTH_URL`)
  if (!tokenUrl) missing.push(`${prefix}_TOKEN_URL`)
  if (!profileUrl) missing.push(`${prefix}_PROFILE_URL`)
  if (!scopesRaw) missing.push(`${prefix}_SCOPES`)

  if (missing.length > 0) {
    throw new ProviderNotConfiguredError(platform, missing)
  }

  return {
    clientId: clientId!,
    clientSecret: clientSecret!,
    authUrl: authUrl!,
    tokenUrl: tokenUrl!,
    profileUrl: profileUrl!,
    scopes: scopesRaw!
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  }
}

export function getOAuthProvider(platform: IntegrationPlatform): OAuthProvider {
  switch (platform) {
    case "TWITTER":
      return twitterProvider
    case "LINKEDIN":
      return linkedinProvider
    case "INSTAGRAM":
      return instagramProvider
    case "THREADS":
      return threadsProvider
    case "FACEBOOK":
      return facebookProvider
    case "YOUTUBE":
      return youtubeProvider
    case "TIKTOK":
      return tiktokProvider
    default: {
      const _exhaustive: never = platform
      throw new Error(`Unknown OAuth platform: ${_exhaustive}`)
    }
  }
}

export function getAppUrl(): string {
  const { env } = getCloudflareContext()
  const url = env.NEXT_PUBLIC_APP_URL
  if (!url) {
    throw new Error("NEXT_PUBLIC_APP_URL is not set")
  }
  return url.replace(/\/+$/, "")
}
