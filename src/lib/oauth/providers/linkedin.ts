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
import { fetchJson, formUrlencoded, parseTokenResponse, postForm } from "./_shared"

export const linkedinProvider: OAuthProvider = {
  platform: "LINKEDIN",
  usesPkce: false,

  getAuthorizationUrl({ state, redirectUri }: AuthorizationUrlArgs): string {
    const cfg = getProviderConfig("LINKEDIN")
    const params = new URLSearchParams({
      response_type: "code",
      client_id: cfg.clientId,
      redirect_uri: redirectUri,
      state,
      scope: cfg.scopes.join(" "),
    })
    return `${cfg.authUrl}?${params.toString()}`
  },

  async exchangeCodeForToken({ code, redirectUri }: ExchangeCodeArgs): Promise<OAuthToken> {
    const cfg = getProviderConfig("LINKEDIN")
    const body = formUrlencoded({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
    })
    const json = (await postForm(cfg.tokenUrl, body, {
      platform: "LINKEDIN",
    })) as Record<string, unknown>
    return parseTokenResponse(json)
  },

  async refreshToken({ refreshToken }: RefreshTokenArgs): Promise<OAuthToken> {
    const cfg = getProviderConfig("LINKEDIN")
    const body = formUrlencoded({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
    })
    const json = (await postForm(cfg.tokenUrl, body, {
      platform: "LINKEDIN",
    })) as Record<string, unknown>
    return parseTokenResponse(json)
  },

  async getProfile({ accessToken }: GetProfileArgs): Promise<OAuthProfile> {
    const cfg = getProviderConfig("LINKEDIN")
    const json = (await fetchJson(cfg.profileUrl, {
      platform: "LINKEDIN",
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    })) as {
      sub?: string
      name?: string
      given_name?: string
      family_name?: string
      picture?: string
      email?: string
    }
    if (!json.sub) {
      throw new Error("LinkedIn userinfo response missing `sub`")
    }
    return {
      providerAccountId: json.sub,
      handle: json.name ?? json.email ?? null,
      profileImage: json.picture ?? null,
      profileUrl: null,
      raw: json,
    }
  },
}
