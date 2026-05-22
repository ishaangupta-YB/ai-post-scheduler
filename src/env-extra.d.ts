// Augments the wrangler-generated CloudflareEnv with secrets that aren't in wrangler.jsonc.
// These come from .dev.vars (dev) and `wrangler secret put` (prod). Run `pnpm cf-typegen` after
// adding new secrets to .dev.vars and they'll appear in cloudflare-env.d.ts; this file is the
// stop-gap so the code typechecks before that.
interface CloudflareEnv {
  DODO_MODE: "test" | "live"
  DODO_API_KEY: string
  DODO_WEBHOOK_SECRET: string
  DODO_PRODUCT_STARTER?: string
  DODO_PRODUCT_CREATOR?: string
  DODO_PRODUCT_PRO?: string
}
