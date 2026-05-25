import { getCloudflareContext } from "@opennextjs/cloudflare"

import type { IntegrationPlatform } from "@/db/integrations-schema"

import { ComposioNotConfiguredError } from "./client"

// Per-platform Composio metadata. The `toolkitSlug` is the lowercase
// identifier Composio uses for the app (verify via `composio search` or
// `composio.toolkits.get(slug)` — do not invent slugs). The `authConfigEnvVar`
// holds the name of the env var that stores the `ac_…` auth-config ID created
// on the Composio dashboard. `enabled: false` short-circuits the connect
// route so the UI shows "Coming soon" for that platform.
export type ComposioPlatformConfig = {
  toolkitSlug: string
  authConfigEnvVar: string
  enabled: boolean
}

export const COMPOSIO_PLATFORMS: Record<IntegrationPlatform, ComposioPlatformConfig> = {
  TWITTER: {
    // X/Twitter via Composio is gated this session — see plan §3. Either
    // Composio-managed auth requires a paid X tier, or the user wants their
    // own X dev creds wired in via custom auth. Either way, leaving it off
    // until that decision is made.
    toolkitSlug: "twitter",
    authConfigEnvVar: "COMPOSIO_AUTH_CONFIG_TWITTER",
    enabled: false,
  },
  LINKEDIN: {
    toolkitSlug: "linkedin",
    authConfigEnvVar: "COMPOSIO_AUTH_CONFIG_LINKEDIN",
    enabled: true,
  },
  INSTAGRAM: {
    toolkitSlug: "instagram",
    authConfigEnvVar: "COMPOSIO_AUTH_CONFIG_INSTAGRAM",
    enabled: true,
  },
  THREADS: {
    toolkitSlug: "threads",
    authConfigEnvVar: "COMPOSIO_AUTH_CONFIG_THREADS",
    enabled: true,
  },
  FACEBOOK: {
    toolkitSlug: "facebook",
    authConfigEnvVar: "COMPOSIO_AUTH_CONFIG_FACEBOOK",
    enabled: true,
  },
  YOUTUBE: {
    toolkitSlug: "youtube",
    authConfigEnvVar: "COMPOSIO_AUTH_CONFIG_YOUTUBE",
    enabled: true,
  },
  TIKTOK: {
    toolkitSlug: "tiktok",
    authConfigEnvVar: "COMPOSIO_AUTH_CONFIG_TIKTOK",
    enabled: true,
  },
}

export function getPlatformConfig(
  platform: IntegrationPlatform,
): ComposioPlatformConfig {
  return COMPOSIO_PLATFORMS[platform]
}

export function getAuthConfigId(platform: IntegrationPlatform): string {
  const cfg = getPlatformConfig(platform)
  const { env } = getCloudflareContext()
  const value = (env as unknown as Record<string, string | undefined>)[
    cfg.authConfigEnvVar
  ]
  if (!value) throw new ComposioNotConfiguredError([cfg.authConfigEnvVar])
  return value
}

export function getAppUrl(): string {
  const { env } = getCloudflareContext()
  const url = (env as unknown as Record<string, string | undefined>)
    .NEXT_PUBLIC_APP_URL
  if (!url) throw new Error("NEXT_PUBLIC_APP_URL is not set")
  return url.replace(/\/+$/, "")
}
