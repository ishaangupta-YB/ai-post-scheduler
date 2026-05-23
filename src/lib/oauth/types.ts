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
  // Optional — undefined on providers that don't issue refresh tokens.
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
