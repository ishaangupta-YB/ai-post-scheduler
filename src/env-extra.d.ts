// Augments the wrangler-generated CloudflareEnv with secrets that aren't in wrangler.jsonc.
// These come from .dev.vars (dev) and `wrangler secret put` (prod). Run `pnpm cf-typegen` after
// adding new secrets to .dev.vars and they'll appear in cloudflare-env.d.ts; this file is the
// stop-gap so the code typechecks before that.
interface CloudflareEnv {
  // App
  NEXT_PUBLIC_APP_URL?: string
  BETTER_AUTH_SECRET?: string

  // Dodo
  DODO_MODE: "test" | "live"
  DODO_API_KEY: string
  DODO_WEBHOOK_SECRET: string
  // Subscription plan products (recurring monthly)
  DODO_PLAN_STARTER?: string
  DODO_PLAN_CREATOR?: string
  DODO_PLAN_PRO?: string
  // Subscription plan products (recurring annual)
  DODO_PLAN_STARTER_ANNUAL?: string
  DODO_PLAN_CREATOR_ANNUAL?: string
  DODO_PLAN_PRO_ANNUAL?: string
  // One-time top-up SKUs (never expire in our ledger)
  DODO_TOPUP_500?: string

  // OAuth — per-platform (all optional; getProviderConfig throws cleanly if missing)
  TWITTER_CLIENT_ID?: string
  TWITTER_CLIENT_SECRET?: string
  TWITTER_AUTH_URL?: string
  TWITTER_TOKEN_URL?: string
  TWITTER_PROFILE_URL?: string
  TWITTER_SCOPES?: string

  LINKEDIN_CLIENT_ID?: string
  LINKEDIN_CLIENT_SECRET?: string
  LINKEDIN_AUTH_URL?: string
  LINKEDIN_TOKEN_URL?: string
  LINKEDIN_PROFILE_URL?: string
  LINKEDIN_SCOPES?: string

  INSTAGRAM_CLIENT_ID?: string
  INSTAGRAM_CLIENT_SECRET?: string
  INSTAGRAM_AUTH_URL?: string
  INSTAGRAM_TOKEN_URL?: string
  INSTAGRAM_PROFILE_URL?: string
  INSTAGRAM_SCOPES?: string

  THREADS_CLIENT_ID?: string
  THREADS_CLIENT_SECRET?: string
  THREADS_AUTH_URL?: string
  THREADS_TOKEN_URL?: string
  THREADS_PROFILE_URL?: string
  THREADS_SCOPES?: string

  FACEBOOK_CLIENT_ID?: string
  FACEBOOK_CLIENT_SECRET?: string
  FACEBOOK_AUTH_URL?: string
  FACEBOOK_TOKEN_URL?: string
  FACEBOOK_PROFILE_URL?: string
  FACEBOOK_SCOPES?: string

  YOUTUBE_CLIENT_ID?: string
  YOUTUBE_CLIENT_SECRET?: string
  YOUTUBE_AUTH_URL?: string
  YOUTUBE_TOKEN_URL?: string
  YOUTUBE_PROFILE_URL?: string
  YOUTUBE_SCOPES?: string

  TIKTOK_CLIENT_ID?: string
  TIKTOK_CLIENT_SECRET?: string
  TIKTOK_AUTH_URL?: string
  TIKTOK_TOKEN_URL?: string
  TIKTOK_PROFILE_URL?: string
  TIKTOK_SCOPES?: string

  // Encryption KEK for OAuth tokens at rest (base64-encoded 32 bytes).
  INTEGRATION_TOKEN_KEK?: string
}
