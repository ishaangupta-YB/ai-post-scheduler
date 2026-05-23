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

// YouTube uses Google OAuth. We request the YouTube upload/readonly scopes so
// the same token works for posting later.
export const youtubeProvider: OAuthProvider = {
  platform: "YOUTUBE",
  usesPkce: false,

  getAuthorizationUrl({ state, redirectUri }: AuthorizationUrlArgs): string {
    const cfg = getProviderConfig("YOUTUBE")
    const params = new URLSearchParams({
      response_type: "code",
      client_id: cfg.clientId,
      redirect_uri: redirectUri,
      state,
      scope: cfg.scopes.join(" "),
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
    })
    return `${cfg.authUrl}?${params.toString()}`
  },

  async exchangeCodeForToken({ code, redirectUri }: ExchangeCodeArgs): Promise<OAuthToken> {
    const cfg = getProviderConfig("YOUTUBE")
    const body = formUrlencoded({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
    })
    const json = (await postForm(cfg.tokenUrl, body, {
      platform: "YOUTUBE",
    })) as Record<string, unknown>
    return parseTokenResponse(json)
  },

  async refreshToken({ refreshToken }: RefreshTokenArgs): Promise<OAuthToken> {
    const cfg = getProviderConfig("YOUTUBE")
    const body = formUrlencoded({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
    })
    const json = (await postForm(cfg.tokenUrl, body, {
      platform: "YOUTUBE",
    })) as Record<string, unknown>
    return parseTokenResponse(json)
  },

  async getProfile({ accessToken }: GetProfileArgs): Promise<OAuthProfile> {
    const cfg = getProviderConfig("YOUTUBE")
    const json = (await fetchJson(cfg.profileUrl, {
      platform: "YOUTUBE",
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    })) as {
      sub?: string
      name?: string
      email?: string
      picture?: string
    }
    if (!json.sub) {
      throw new Error("Google userinfo response missing `sub`")
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
