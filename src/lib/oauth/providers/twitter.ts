import { getProviderConfig } from "../index"
import type {
  AuthorizationUrlArgs,
  ExchangeCodeArgs,
  GetProfileArgs,
  OAuthProfile,
  OAuthProvider,
  OAuthToken,
  RefreshTokenArgs,
} from "../types"
import {
  basicAuthHeader,
  fetchJson,
  formUrlencoded,
  parseTokenResponse,
  postForm,
} from "./_shared"

export const twitterProvider: OAuthProvider = {
  platform: "TWITTER",
  usesPkce: true,

  getAuthorizationUrl({
    state,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
  }: AuthorizationUrlArgs): string {
    const cfg = getProviderConfig("TWITTER")
    const params = new URLSearchParams({
      response_type: "code",
      client_id: cfg.clientId,
      redirect_uri: redirectUri,
      scope: cfg.scopes.join(" "),
      state,
      code_challenge: codeChallenge ?? "",
      code_challenge_method: codeChallengeMethod ?? "S256",
    })
    return `${cfg.authUrl}?${params.toString()}`
  },

  async exchangeCodeForToken({
    code,
    redirectUri,
    codeVerifier,
  }: ExchangeCodeArgs): Promise<OAuthToken> {
    const cfg = getProviderConfig("TWITTER")
    const body = formUrlencoded({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
      client_id: cfg.clientId,
    })
    const json = (await postForm(cfg.tokenUrl, body, {
      platform: "TWITTER",
      headers: {
        authorization: basicAuthHeader(cfg.clientId, cfg.clientSecret),
      },
    })) as Record<string, unknown>
    return parseTokenResponse(json)
  },

  async refreshToken({ refreshToken }: RefreshTokenArgs): Promise<OAuthToken> {
    const cfg = getProviderConfig("TWITTER")
    const body = formUrlencoded({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: cfg.clientId,
    })
    const json = (await postForm(cfg.tokenUrl, body, {
      platform: "TWITTER",
      headers: {
        authorization: basicAuthHeader(cfg.clientId, cfg.clientSecret),
      },
    })) as Record<string, unknown>
    return parseTokenResponse(json)
  },

  async getProfile({ accessToken }: GetProfileArgs): Promise<OAuthProfile> {
    const cfg = getProviderConfig("TWITTER")
    const json = (await fetchJson(cfg.profileUrl, {
      platform: "TWITTER",
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    })) as { data?: { id: string; username?: string; profile_image_url?: string } }
    const data = json.data
    if (!data?.id) {
      throw new Error("Twitter profile response missing data.id")
    }
    return {
      providerAccountId: data.id,
      handle: data.username ?? null,
      profileImage: data.profile_image_url ?? null,
      profileUrl: data.username ? `https://x.com/${data.username}` : null,
      raw: data,
    }
  },
}
