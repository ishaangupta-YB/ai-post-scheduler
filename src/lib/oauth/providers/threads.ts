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

// TODO (publisher work): the access_token from this code exchange is short-lived
// (~1 hour). Before storing, exchange for a long-lived token via
//   GET https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret&access_token=<short>
// Long-lived tokens last 60 days and can be extended via th_refresh_token before expiry.
// Threads does NOT support the standard OAuth `grant_type=refresh_token` flow, so
// `refreshToken` is intentionally omitted from this provider.
export const threadsProvider: OAuthProvider = {
  platform: "THREADS",
  usesPkce: false,

  getAuthorizationUrl({ state, redirectUri }: AuthorizationUrlArgs): string {
    const cfg = getProviderConfig("THREADS")
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
    const cfg = getProviderConfig("THREADS")
    const body = formUrlencoded({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
    })
    const json = (await postForm(cfg.tokenUrl, body, {
      platform: "THREADS",
    })) as Record<string, unknown>
    return parseTokenResponse(json)
  },

  async getProfile({ accessToken }: GetProfileArgs): Promise<OAuthProfile> {
    const cfg = getProviderConfig("THREADS")
    const url = new URL(cfg.profileUrl)
    url.searchParams.set("fields", "id,username,threads_profile_picture_url")
    url.searchParams.set("access_token", accessToken)
    const json = (await fetchJson(url.toString(), {
      platform: "THREADS",
      headers: { accept: "application/json" },
    })) as {
      id?: string
      username?: string
      threads_profile_picture_url?: string
    }
    if (!json.id) {
      throw new Error("Threads profile response missing id")
    }
    return {
      providerAccountId: json.id,
      handle: json.username ?? null,
      profileImage: json.threads_profile_picture_url ?? null,
      profileUrl: json.username ? `https://threads.net/@${json.username}` : null,
      raw: json,
    }
  },
}
