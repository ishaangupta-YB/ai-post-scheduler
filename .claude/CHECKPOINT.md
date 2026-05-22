# Broad Sky — Codebase Checkpoint

> **Last updated:** 2026-05-22
> **Purpose:** Hand-off doc for future agents. Snapshot of what's built, what's stubbed, what's not done, and what still needs verification.

---

## 1. Product Context (read first)

- **Product:** Broad Sky — AI-powered social media post scheduler SaaS.
- **Stack:** Next.js 16.2.6 (App Router, Turbopack) → OpenNext Cloudflare → Cloudflare Workers. D1 SQLite. KV for auth secondary storage. Tailwind 4 + shadcn UI + Base UI primitives.
- **Auth:** Better Auth 1.6.11 direct (NOT `better-auth-cloudflare`), Google OAuth only.
- **Billing model:** **Pure credits, pay-as-you-go via Dodo Payments.** No subscriptions. AI operations debit credits; users buy credit packs.
- **Branch:** `main` (only branch). Two commits exist: initial CF scaffold + auth setup.

---

## 2. What's Fully Implemented ✅

### Auth (end-to-end working, untested in browser)
- Google OAuth sign-in via Better Auth + Drizzle/D1 adapter (`usePlural: true`)
- Session management with 7-day expiry, 24h refresh, 5-min cookie cache
- KV secondary storage for rate-limits (TTL clamped ≥60s for CF KV requirement)
- Rate limits: `/sign-in/social` 10/min, `/callback/:id` 20/min
- OAuth tokens encrypted at rest
- Secure cookies in prod, `broadsky` cookie prefix
- IP detection via `cf-connecting-ip` / `x-forwarded-for`
- Background tasks → `ctx.waitUntil()`
- Session geo snapshot (timezone/city/country/region/colo/lat/lon) populated from `cf` object via `databaseHooks.session.create.before`
- Middleware at `src/proxy.ts` gates `/dashboard/*` → redirects to `/sign-in?redirect=…` if no cookie

### Database schema (migration generated, NOT YET APPLIED to D1)
- **Tables:** `users`, `sessions`, `accounts`, `verifications`, `credit_transactions`, `payment_events`
- All timestamps are `timestamp_ms` with `unixepoch('subsecond')*1000` SQL defaults + `$onUpdate`
- Foreign keys on `userId` indexed on every table that references it
- Full `relations()` declarations for Drizzle relational queries
- `users.credit_balance` denormalized for fast reads; ledger is source of truth
- Migration file: `drizzle/0000_init.sql` — covers all 6 tables

### Billing (code complete, NOT YET TESTED with real Dodo)
- `src/lib/billing/credits.ts`
  - `getCreditBalance(userId)`
  - `grantCredits({ userId, amount, type, paymentId?, packId?, … })` — uses D1 batch
  - `spendCredits({ userId, amount, operation, … })` — atomic `UPDATE … WHERE balance >= amount` to prevent concurrent overdraw; throws `InsufficientCreditsError`
- `src/lib/billing/packs.ts` — 3 packs: Starter (100/$5), Creator (500/$20, popular), Pro (2000/$70). Pack IDs map to Dodo product IDs via env vars.
- `src/lib/billing/dodo.ts` — REST client via `fetch` (no SDK), Standard Webhooks HMAC-SHA256 signature verification with 5-min timestamp tolerance
- `/api/billing/checkout` (POST) — auth-gated, creates Dodo payment link
- `/api/webhooks/dodo` (POST, edge runtime) — verifies signature, dedupes by event id via `payment_events` table, calls `grantCredits` on `payment.succeeded`
- Billing page (`/dashboard/billing`) — shows current balance + 3 pack cards with Buy buttons

### Landing page (`/`)
- Multi-section marketing page with hero, live ticker, draft card preview, workbench console, pricing section, tilt cards
- Custom `landing.css`
- Server component with client interactive sub-components in `src/app/(routes)/(landing)/_components/`
- `GoogleCta` button uses `authClient.signIn.social({ provider: "google", callbackURL: "/dashboard/ideas" })`

### Sign-in page (`/sign-in`)
- Google-only OAuth card UI with loading state
- Redirect-back via `?redirect=` param support

### Dashboard shell
- `src/app/(routes)/(dashboard)/layout.tsx` — auth check, SidebarProvider + AppSidebar + SidebarInset
- `src/app/(routes)/(dashboard)/_common/app-sidebar.tsx` — full sidebar nav with user menu, sign-out, "Create post" dialog (stub)
- `dashboard-page-header.tsx` — reusable title+description header
- `dashboard-nav.ts` — `mainNav` config (Ideas, Schedule, Billing, Settings), `isNavActive`, `defaultDashboardPath`

### UI library
- Full shadcn install: **55 components** in `src/components/ui/` (button, card, sidebar, dropdown-menu, dialog, table, tabs, command, etc.)
- Theme provider + mode toggle (light/dark/system via next-themes)

---

## 3. What's Stubbed/Placeholder 🚧

- `/dashboard/ideas` — "Your post ideas will appear here." empty state, no functionality
- `/dashboard/schedule` — "Your content calendar will appear here." empty state
- `/dashboard/settings` — "Workspace and account settings will appear here." empty state
- AppSidebar "Create post" dialog — opens but does nothing
- `/dashboard` root — redirects to `/dashboard/ideas`

---

## 4. What's Not Done At All ❌

- **AI post generation** — no provider integrated (no OpenAI/Anthropic/etc. wired up). When implemented, must call `spendCredits()` before each generation.
- **Social platform integrations** — no X/Twitter, LinkedIn, Instagram, Facebook, Threads OAuth or posting APIs.
- **Post scheduling engine** — no cron, no queue, no scheduled-post execution. Cloudflare Cron Triggers or Queues would be the path here.
- **Idea management** — no DB tables, no CRUD.
- **Post drafts / content storage** — no DB tables.
- **Workspace / team support** — single-user only right now.
- **Analytics / insights** — no event tracking, no usage dashboards.
- **Email** — no transactional email (welcome, receipts, etc.). No provider configured.
- **Onboarding flow** — none.
- **Settings page** — empty.

---

## 5. File Map (key paths)

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...all]/route.ts        # Better Auth handler
│   │   ├── billing/checkout/route.ts     # Creates Dodo payment link
│   │   └── webhooks/dodo/route.ts        # Webhook handler (edge runtime)
│   ├── (routes)/
│   │   ├── (landing)/page.tsx            # /
│   │   ├── (auth)/sign-in/page.tsx       # /sign-in
│   │   └── (dashboard)/
│   │       ├── layout.tsx                # auth gate + sidebar
│   │       ├── _common/                  # sidebar, header, nav config
│   │       └── dashboard/
│   │           ├── page.tsx              # redirect → /dashboard/ideas
│   │           ├── ideas/page.tsx        # STUB
│   │           ├── schedule/page.tsx     # STUB
│   │           ├── billing/page.tsx      # IMPLEMENTED
│   │           │   └── _components/buy-pack-button.tsx
│   │           └── settings/page.tsx     # STUB
│   ├── layout.tsx, globals.css
│
├── db/
│   ├── index.ts                          # getDb(), schema export
│   ├── auth-schema.ts                    # users/sessions/accounts/verifications + relations
│   └── billing-schema.ts                 # credit_transactions, payment_events
│
├── lib/
│   ├── auth.ts                           # buildAuth() + getAuth() cached singleton
│   ├── auth-client.ts                    # authClient, signIn/signOut/useSession exports
│   ├── utils.ts                          # cn(), tsToDateStr()
│   └── billing/
│       ├── credits.ts                    # grantCredits, spendCredits, getCreditBalance
│       ├── packs.ts                      # CREDIT_PACKS, getPack, getDodoProductId
│       └── dodo.ts                       # createPayment, verifyWebhookSignature
│
├── components/
│   ├── ui/                               # 55 shadcn primitives
│   ├── theme-provider.tsx
│   ├── mode-toggle.tsx
│   └── theming-page.tsx
│
├── hooks/use-mobile.ts
├── proxy.ts                              # middleware — gates /dashboard/*
└── env-extra.d.ts                        # augments CloudflareEnv with DODO_* secrets

drizzle/
└── 0000_init.sql                         # Single migration covering all 6 tables

Config: wrangler.jsonc, drizzle.config.ts, next.config.ts, open-next.config.ts, .dev.vars.example
```

---

## 6. Cloudflare Bindings

| Binding | Type | Purpose |
|---|---|---|
| `DB` | D1 | Primary database (`aipostsc-auth-db`, id `c8acc90e-7082-4582-ad5e-bbe89d8350c6`) |
| `AIPOSTSC_AUTH_KV` | KV | Better Auth secondary storage (rate limits, cookie cache) |
| `ASSETS` | Assets | Static asset binding (auto) |
| `IMAGES` | Images | Image optimization (auto) |
| `WORKER_SELF_REFERENCE` | Service | Self-ref for OpenNext caching |

**Compatibility:** date `2026-05-21`, flags `nodejs_compat` + `global_fetch_strictly_public`.

---

## 7. Environment Variables / Secrets

Declared in `.dev.vars.example`:

| Var | Required | Purpose |
|---|---|---|
| `NEXTJS_ENV` | yes | dev/prod flag |
| `BETTER_AUTH_SECRET` | yes | generate via `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | yes | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | yes | Google OAuth |
| `DODO_MODE` | yes | `test` or `live` |
| `DODO_API_KEY` | yes | Dodo bearer token |
| `DODO_WEBHOOK_SECRET` | yes | Standard Webhooks signing secret |
| `DODO_PRODUCT_STARTER` | yes | Dodo product ID for 100-cred pack |
| `DODO_PRODUCT_CREATOR` | yes | Dodo product ID for 500-cred pack |
| `DODO_PRODUCT_PRO` | yes | Dodo product ID for 2000-cred pack |

`BETTER_AUTH_URL` is in `wrangler.jsonc:vars` (not a secret). Re-run `pnpm cf-typegen` after editing `.dev.vars` to update `cloudflare-env.d.ts`. `src/env-extra.d.ts` is a stop-gap that augments `CloudflareEnv` with Dodo vars until typegen catches up.

---

## 8. Verification Status — what's been checked vs. what hasn't

### ✅ Verified
- `pnpm exec tsc --noEmit` — passes cleanly
- `pnpm exec next build` — passes; all 11 routes registered (including `/api/billing/checkout` and `/api/webhooks/dodo`)
- `pnpm drizzle-kit generate --name init` — migration generated cleanly with 6 tables, 7 indexes, 3 FKs

### ❌ NOT yet verified (next agent should do these)
- **Migration not applied to D1.** Run `pnpm wrangler d1 migrations apply aipostsc-auth-db --local` (and `--remote` for prod). If old `user`/`session` singular tables exist in remote D1 from the previous schema, **drop them first** — the rename is destructive.
- **No real OAuth sign-in tested.** Need to copy `.dev.vars.example` → `.dev.vars`, fill in Google credentials, `pnpm cf-typegen`, then `pnpm dev` and test the flow end-to-end in a browser.
- **No real Dodo payment tested.** Need Dodo test API key + 3 test products configured in their dashboard with prices/credits matching `src/lib/billing/packs.ts`. Webhook endpoint must be registered: `<base-url>/api/webhooks/dodo`.
- **Dodo REST API shape assumptions:** `src/lib/billing/dodo.ts` uses `POST /payments` with `payment_link: true`, `product_cart`, `customer`, `billing`, `return_url`, `metadata` — verify against current Dodo docs (https://docs.dodopayments.com/) before going live.
- **Webhook signature scheme:** Implemented per Standard Webhooks spec (`webhook-id`/`webhook-timestamp`/`webhook-signature` headers, HMAC-SHA256 over `${id}.${ts}.${body}`). Strips optional `whsec_` prefix from secret. Verify Dodo uses this exact scheme.
- **ESLint is broken.** Pre-existing circular-structure error in `@eslint/eslintrc` config compat layer — `pnpm exec eslint src/` crashes. Not caused by these changes; needs upgrading the config to flat ESLint 9 format.
- **Dev server not run** — UI not manually exercised in a browser.

---

## 9. Conventions to keep

- **Auth:** Don't add `better-auth-cloudflare`. Direct `better-auth` is preferred — see `[[project-auth-stack]]` in user memory.
- **Billing:** Pure credits, pay-as-you-go, Dodo only. Don't introduce subscription tiers or recurring billing — see `[[project-billing-model]]` in user memory.
- **DB access:** Always go through `getDb()` from `@/db`. Don't construct ad-hoc `drizzle(env.DB, …)` instances.
- **Schema files:** `src/db/*-schema.ts` pattern — `drizzle.config.ts` globs them. Adding a new schema file is sufficient for `drizzle-kit generate` to pick it up.
- **Spending credits:** Every AI-cost-incurring path MUST call `spendCredits()` before doing the work, and inside a try/catch that surfaces `InsufficientCreditsError` to the user with an upsell to `/dashboard/billing`.
- **No CLAUDE.md yet** — feel free to create one if conventions multiply.

---

## 10. Suggested next milestones (build order)

1. **Apply migration to D1** (local + remote) and exercise sign-in in a browser to verify the full auth chain.
2. **Configure Dodo test mode** (API key, products, webhook URL) and run a real test purchase end-to-end.
3. **Ideas feature:** schema (`ideas` table) + list/create/delete CRUD on `/dashboard/ideas`. No AI yet.
4. **First AI integration:** pick a provider (Anthropic? OpenAI?), wire one endpoint behind `spendCredits()`, hook into "Create post" dialog or Ideas → generated copy.
5. **Social provider OAuth:** add X first (most-requested), then LinkedIn. Need a `social_accounts` table linked to `users`.
6. **Scheduling engine:** Cloudflare Queue + Cron Trigger to dispatch posts at scheduled times. Need `scheduled_posts` table.
7. **Fix ESLint** by migrating `.eslintrc`-style extends to flat config (ESLint 9 needs it).

---

## 11. Session log — what THIS agent did (2026-05-22)

User asked to review an `auth/index.ts` snippet (using `better-auth-cloudflare`) against the current codebase, then improve schema + scaffold a billing system.

### Decisions taken
- **Auth:** Kept existing `src/lib/auth.ts` (rejected the `better-auth-cloudflare` example — was missing `nextCookies`, cookie cache, OAuth token encryption, KV TTL clamp, type-safe env).
- **Schema naming:** User chose **plural** table names + regenerated migration (no production users yet).
- **Billing model:** User chose **pure credits, pay-as-you-go** (rejected hybrid subscription+credits, and pure subscription).
- **Payment processor:** User chose **Dodo Payments** (merchant-of-record; no first-party Better Auth plugin — wrote direct fetch client).

### Files created
- `src/db/index.ts` — `getDb()` + schema re-export
- `src/db/billing-schema.ts` — `credit_transactions`, `payment_events` + relations
- `src/lib/billing/credits.ts` — `grantCredits`, `spendCredits`, `getCreditBalance`, `InsufficientCreditsError`
- `src/lib/billing/packs.ts` — 3 packs + Dodo product mapping
- `src/lib/billing/dodo.ts` — REST client + Standard Webhooks signature verification
- `src/app/api/billing/checkout/route.ts`
- `src/app/api/webhooks/dodo/route.ts`
- `src/app/(routes)/(dashboard)/dashboard/billing/_components/buy-pack-button.tsx`
- `src/env-extra.d.ts` — augments `CloudflareEnv` with Dodo vars

### Files rewritten
- `src/db/auth-schema.ts` — plural names, `timestamp_ms`, SQL defaults, `$onUpdate`, indexes on every FK, full `relations()`, geo fields on sessions, `credit_balance` column on users
- `src/lib/auth.ts` — uses `getDb()` + `schema` from `@/db`, added `usePlural: true`, added session-create hook to snapshot geo from CF context
- `src/app/(routes)/(dashboard)/dashboard/billing/page.tsx` — replaced placeholder with balance + pack grid
- `drizzle.config.ts` — schema glob `./src/db/*-schema.ts`
- `.dev.vars.example` — added `DODO_*` vars

### Files deleted/regenerated
- `drizzle/0000_init_auth.sql` → regenerated as `drizzle/0000_init.sql` covering all 6 tables

### Verified
- `tsc --noEmit` clean
- `next build` clean, all 11 routes registered
