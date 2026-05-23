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

// TODO (publisher work): for posting to a Page, the user-token returned here
// must be exchanged for a Page access token via:
//   GET <graph>/me/accounts?access_token=<user>
// Then extend the user token to long-lived via:
//   GET <graph>/oauth/access_token?grant_type=fb_exchange_token&client_id&client_secret&fb_exchange_token
// Meta does NOT support the standard OAuth `grant_type=refresh_token` flow, so
// `refreshToken` is intentionally omitted from this provider.
export const facebookProvider: OAuthProvider = {
  platform: "FACEBOOK",
  usesPkce: false,

  getAuthorizationUrl({ state, redirectUri }: AuthorizationUrlArgs): string {
    const cfg = getProviderConfig("FACEBOOK")
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
    const cfg = getProviderConfig("FACEBOOK")
    const body = formUrlencoded({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
    })
    const json = (await postForm(cfg.tokenUrl, body, {
      platform: "FACEBOOK",
    })) as Record<string, unknown>
    return parseTokenResponse(json)
  },

  async getProfile({ accessToken }: GetProfileArgs): Promise<OAuthProfile> {
    const cfg = getProviderConfig("FACEBOOK")
    const url = new URL(cfg.profileUrl)
    url.searchParams.set("fields", "id,name,picture")
    const json = (await fetchJson(url.toString(), {
      platform: "FACEBOOK",
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    })) as {
      id?: string
      name?: string
      picture?: { data?: { url?: string } }
    }
    if (!json.id) {
      throw new Error("Facebook profile response missing id")
    }
    return {
      providerAccountId: json.id,
      handle: json.name ?? null,
      profileImage: json.picture?.data?.url ?? null,
      profileUrl: `https://facebook.com/${json.id}`,
      raw: json,
    }
  },
}
