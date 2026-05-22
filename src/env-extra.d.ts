// Augments the wrangler-generated CloudflareEnv with secrets that aren't in wrangler.jsonc.
// These come from .dev.vars (dev) and `wrangler secret put` (prod). Run `pnpm cf-typegen` after
// adding new secrets to .dev.vars and they'll appear in cloudflare-env.d.ts; this file is the
// stop-gap so the code typechecks before that.
interface CloudflareEnv {
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
}
