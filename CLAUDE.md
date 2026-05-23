# Broad Sky — Claude Operating Guide

AI-powered social media post scheduling SaaS. Single-tenant per user. Next.js 16 App Router → OpenNext Cloudflare → Cloudflare Workers. D1 + KV. Direct Better Auth (Google OAuth) for sign-in; per-platform OAuth for social integrations.

---

## Where to look first

- **`.claude/CHECKPOINT.md`** — session-by-session history. What's done, what's stubbed, what's not started, what's verified vs unverified. **Read this before any new feature work.**
- **`.claude/architecture.md`** — stack, module map, auth/billing/integrations flow diagrams, deployment.
- **`.claude/db-schema.md`** — all 10 tables, FKs, indexes, cascade chains. **Source-of-truth reference when touching the data model.**

---

## Conventions

### Auth
- Use **direct `better-auth`** (1.6.11). DO NOT add `better-auth-cloudflare` — the existing setup already handles KV cookie cache, OAuth token encryption, KV TTL clamping, and type-safe env.
- Session access in route handlers / server components: `await getAuth().api.getSession({ headers: await headers() })`.

### Billing
- **Pure-credits, pay-as-you-go via Dodo Payments.** Two pools: `monthly_credit_balance` (resets every 30 days) + `topup_credit_balance` (lifetime). No Stripe, no other gateways.
- Spend monthly first, then topup. Hard cutoff at 0 — no overage.
- Every AI-cost-incurring code path MUST call `spendCredits()` from `src/lib/billing/credits.ts` BEFORE doing the paid work. Surface `InsufficientCreditsError` to the user with an upsell to `/dashboard/billing`.
- `planPeriodEnd` is the **monthly refresh anchor**, NOT the Dodo billing-cycle end. Always advance by +30d on payment regardless of monthly/annual.

### Database
- Always use `getDb()` from `@/db`. NEVER `drizzle(env.DB, …)` inline.
- Schema files live at `src/db/*-schema.ts` and are auto-globbed by `drizzle.config.ts`. Adding a new `*-schema.ts` file is enough.
- Local dev with no production users: regenerate `0000_init.sql` instead of stacking 0001/0002 migrations (see CHECKPOINT §13/§15/§16 precedent).

### Integrations (OAuth to X / LinkedIn / IG / Threads / FB / YT / TikTok)
- Connect = `POST /api/integrations/connect { platform }` → returns `{ url }` → client redirects.
- Callback = `GET /api/integrations/callback?code&state` → upserts on `(user_id, platform)`.
- Disconnect = `POST /api/integrations/disconnect { integrationId }` (soft: nulls tokens, sets `status='revoked'`).
- Tokens encrypted at rest with **AES-GCM-256** using `INTEGRATION_TOKEN_KEK`. State HMAC-signed with `BETTER_AUTH_SECRET`. PKCE required for Twitter.
- Token refresh: `refreshIntegrationTokens()` in `src/lib/oauth/refresh.ts`. Supported for Twitter/LinkedIn/YouTube/TikTok. Meta family (Facebook/Instagram/Threads) uses long-lived token exchange instead — see TODO comments in those provider files.
- **Dev OAuth needs an HTTPS tunnel** for all providers except YouTube — see `.claude/architecture.md#local-development-with-oauth-providers` for the Cloudflare Tunnel setup.
- Adding a new platform: see `.claude/architecture.md#adding-a-new-platform`.

### Code style
- Server components by default. `"use client"` only where needed.
- `force-dynamic` on auth-gated pages.
- Drizzle: prefer relational queries (`db.query.*`) for nested reads; raw `db.select().from()` for flat selects and mutations.
- ID generation: `crypto.randomUUID()` everywhere.

### Don't
- Don't introduce subscription tiers in app code outside the existing `PLANS` catalog.
- Don't store OAuth tokens in plaintext — always go through `encryptNullable` / `decryptNullable` in `src/lib/oauth/crypto.ts`.
- Don't hard-delete integrations from the UI (cascades to scheduled_posts). Soft-disconnect only.
- Don't bypass `spendCredits()` for AI work — it's both the cost gate and the audit trail.

---

## Verified pipelines

- `pnpm exec tsc --noEmit` — must be clean.
- `pnpm drizzle-kit generate --name init` — regenerates the single migration.
- `pnpm exec next build` — registers all routes; check the route list at the bottom.
- `npx wrangler d1 migrations apply aipostsc-auth-db --local` — applies to local D1. Use `--remote` for prod (still pending as of 2026-05-24).

ESLint is currently broken (pre-existing circular-structure error in the eslintrc compat layer); don't rely on it. Roadmap: migrate to flat config (CHECKPOINT §10 #7).
