import { getProviderConfig } from "../index"
import type {
  AuthorizationUrlArgs,
  ExchangeCodeArgs,
  GetProfileArgs,
  OAuthProfile,
  OAuthProvider,
  OAuthToken,
} from "../types"
import { fetchJson, formUrlencoded, parseTokenResponse, postForm } from "./_shared"

// Instagram Business uses the Facebook Graph API. The user logs in via the
// Meta dialog; we then resolve the connected Instagram Business account.
//
// TODO (publisher work): the access_token from this code exchange is short-lived
// (~1 hour). Before storing, exchange for a long-lived token via
//   GET <graph>/oauth/access_token?grant_type=fb_exchange_token&client_id&client_secret&fb_exchange_token=<short>
// Long-lived tokens last 60 days and can be refreshed within 60 days of expiry.
// Meta does NOT support the standard OAuth `grant_type=refresh_token` flow, so
// `refreshToken` is intentionally omitted from this provider.
export const instagramProvider: OAuthProvider = {
  platform: "INSTAGRAM",
  usesPkce: false,

  getAuthorizationUrl({ state, redirectUri }: AuthorizationUrlArgs): string {
    const cfg = getProviderConfig("INSTAGRAM")
    const params = new URLSearchParams({
      response_type: "code",
      client_id: cfg.clientId,
      redirect_uri: redirectUri,
      state,
      scope: cfg.scopes.join(","),
    })
    return `${cfg.authUrl}?${params.toString()}`
  },

  async exchangeCodeForToken({ code, redirectUri }: ExchangeCodeArgs): Promise<OAuthToken> {
    const cfg = getProviderConfig("INSTAGRAM")
    const body = formUrlencoded({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
    })
    const json = (await postForm(cfg.tokenUrl, body, {
      platform: "INSTAGRAM",
    })) as Record<string, unknown>
    return parseTokenResponse(json)
  },

  async getProfile({ accessToken }: GetProfileArgs): Promise<OAuthProfile> {
    const cfg = getProviderConfig("INSTAGRAM")
    // INSTAGRAM_PROFILE_URL points at `/me/accounts` — list Facebook pages owned by the user.
    // We then pick the first page that has a linked instagram_business_account.
    const pagesUrl = new URL(cfg.profileUrl)
    pagesUrl.searchParams.set(
      "fields",
      "id,name,instagram_business_account{id,username,profile_picture_url}",
    )
    const pages = (await fetchJson(pagesUrl.toString(), {
      platform: "INSTAGRAM",
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    })) as {
      data?: Array<{
        id: string
        name?: string
        instagram_business_account?: {
          id: string
          username?: string
          profile_picture_url?: string
        }
      }>
    }
    const page = pages.data?.find((p) => p.instagram_business_account)
    const ig = page?.instagram_business_account
    if (!ig?.id) {
      throw new Error(
        "No Instagram Business account linked to any of the user's Facebook Pages",
      )
    }
    return {
      providerAccountId: ig.id,
      handle: ig.username ?? null,
      profileImage: ig.profile_picture_url ?? null,
      profileUrl: ig.username ? `https://instagram.com/${ig.username}` : null,
      raw: { page, ig },
    }
  },
}
