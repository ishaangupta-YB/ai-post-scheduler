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

export type OAuthToken = {
  accessToken: string
  refreshToken?: string | null
  expiresAt?: Date | null
  scope?: string | null
}

export type OAuthProfile = {
  providerAccountId: string
  handle?: string | null
  profileImage?: string | null
  profileUrl?: string | null
  raw?: Record<string, unknown>
}

export type AuthorizationUrlArgs = {
  state: string
  redirectUri: string
  codeChallenge?: string
  codeChallengeMethod?: "S256"
}

export type ExchangeCodeArgs = {
  code: string
  redirectUri: string
  codeVerifier?: string
}

export type GetProfileArgs = {
  accessToken: string
}

export type RefreshTokenArgs = {
  refreshToken: string
  redirectUri?: string
}

export interface OAuthProvider {
  readonly platform: IntegrationPlatform
  readonly usesPkce: boolean
  getAuthorizationUrl(args: AuthorizationUrlArgs): string
  exchangeCodeForToken(args: ExchangeCodeArgs): Promise<OAuthToken>
  getProfile(args: GetProfileArgs): Promise<OAuthProfile>
  refreshToken?(args: RefreshTokenArgs): Promise<OAuthToken>
}

export class ProviderNotConfiguredError extends Error {
  constructor(public platform: IntegrationPlatform, public missingKeys: string[]) {
    super(
      `OAuth provider for ${platform} is not configured. Missing env vars: ${missingKeys.join(", ")}`,
    )
    this.name = "ProviderNotConfiguredError"
  }
}

export class OAuthExchangeError extends Error {
  constructor(public platform: IntegrationPlatform, message: string, public status?: number) {
    super(`[${platform}] ${message}`)
    this.name = "OAuthExchangeError"
  }
}
*/

export {}
