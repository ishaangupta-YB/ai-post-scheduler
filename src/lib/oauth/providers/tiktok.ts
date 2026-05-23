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

export const tiktokProvider: OAuthProvider = {
  platform: "TIKTOK",
  usesPkce: false,

  getAuthorizationUrl({ state, redirectUri }: AuthorizationUrlArgs): string {
    const cfg = getProviderConfig("TIKTOK")
    // TikTok uses `client_key` rather than `client_id`.
    const params = new URLSearchParams({
      response_type: "code",
      client_key: cfg.clientId,
      redirect_uri: redirectUri,
      state,
      scope: cfg.scopes.join(","),
    })
    return `${cfg.authUrl}?${params.toString()}`
  },

  async exchangeCodeForToken({ code, redirectUri }: ExchangeCodeArgs): Promise<OAuthToken> {
    const cfg = getProviderConfig("TIKTOK")
    const body = formUrlencoded({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_key: cfg.clientId,
      client_secret: cfg.clientSecret,
    })
    const json = (await postForm(cfg.tokenUrl, body, {
      platform: "TIKTOK",
    })) as Record<string, unknown>
    return parseTokenResponse(json)
  },

  async refreshToken({ refreshToken }: RefreshTokenArgs): Promise<OAuthToken> {
    const cfg = getProviderConfig("TIKTOK")
    const body = formUrlencoded({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_key: cfg.clientId,
      client_secret: cfg.clientSecret,
    })
    const json = (await postForm(cfg.tokenUrl, body, {
      platform: "TIKTOK",
    })) as Record<string, unknown>
    return parseTokenResponse(json)
  },

  async getProfile({ accessToken }: GetProfileArgs): Promise<OAuthProfile> {
    const cfg = getProviderConfig("TIKTOK")
    const url = new URL(cfg.profileUrl)
    url.searchParams.set(
      "fields",
      "open_id,union_id,avatar_url,display_name,username",
    )
    const json = (await fetchJson(url.toString(), {
      platform: "TIKTOK",
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    })) as {
      data?: {
        user?: {
          open_id?: string
          union_id?: string
          avatar_url?: string
          display_name?: string
          username?: string
        }
      }
    }
    const u = json.data?.user
    if (!u?.open_id) {
      throw new Error("TikTok user response missing data.user.open_id")
    }
    return {
      providerAccountId: u.open_id,
      handle: u.username ?? u.display_name ?? null,
      profileImage: u.avatar_url ?? null,
      profileUrl: u.username ? `https://tiktok.com/@${u.username}` : null,
      raw: u,
    }
  },
}
