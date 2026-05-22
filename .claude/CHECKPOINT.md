# Broad Sky — Codebase Checkpoint

> **Last updated:** 2026-05-22 (session 3 — two-pool credit refactor)
> **Purpose:** Hand-off doc for future agents. Snapshot of what's built, what's stubbed, what's not done, and what still needs verification.

---

## 1. Product Context (read first)

- **Product:** Broad Sky — AI-powered social media post scheduler SaaS.
- **Stack:** Next.js 16.2.6 (App Router, Turbopack) → OpenNext Cloudflare → Cloudflare Workers. D1 SQLite. KV for auth secondary storage. Tailwind 4 + shadcn UI + Base UI primitives.
- **Auth:** Better Auth 1.6.11 direct (NOT `better-auth-cloudflare`), Google OAuth only.
- **Billing model (session 3 rewrite):** **Two-pool credits via Dodo Payments.**
  - `monthly_credit_balance` — hard-resets every 30 days to the plan's allotment (Starter 100 / Creator 500 / Pro 2000 / Free 25). No rollover.
  - `topup_credit_balance` — one-time top-ups that never expire.
  - Spend monthly first, then topup. Hard cutoff at zero (no overage).
  - 3 Dodo products = subscription plans; 1 Dodo product = one-time top-up SKU.
- **Branch:** `main` (only branch).

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
- `src/app/(routes)/(dashboard)/_common/app-sidebar.tsx` — full sidebar nav with user **dropup** menu (Profile / Settings / Appearance submenu (Light/Dark/System) / Logout), sign-out, "Create post" dialog (stub)
- `dashboard-page-header.tsx` — reusable title+description header
- `dashboard-nav.ts` — `mainNav` config (Ideas, Schedule, Billing, Settings), `isNavActive`, `defaultDashboardPath`

### Dashboard pages (session 2 additions)
- `/dashboard/profile` — beautiful profile card: gradient banner, avatar, name/email/verified badge, member-since, credit-balance card, status card, account-details list. Reads from `users` table + `getCreditBalance`.
- `/dashboard/settings` — Account section (name/email/workspace id), Connected providers (Google with Connected badge), Billing shortcut, Support mailto. Reads `accounts` row to confirm Google linkage.
- `/dashboard/billing` — redesigned: current-balance card with gradient + Coins icon, 3 pricing cards (Starter/Creator/Pro) with per-pack accent gradient + feature checklist + Popular badge on Creator, "Buy" CTAs that hit `/api/billing/checkout`.

### Social platforms module (session 2)
- `src/lib/constants/social-platforms.ts` — `ChannelTypeEnum` (TWITTER/INSTAGRAM/THREADS/FACEBOOK/LINKEDIN/BLUESKY/YOUTUBE/TIKTOK) + per-channel maps:
  - `CHANNEL_TYPE_ICONS` — IconSvgElement data from `@hugeicons/core-free-icons` (NewTwitter, Linkedin, Instagram, Threads, Facebook, Bluesky, Youtube, Tiktok)
  - `CHANNEL_TYPE_URLS`, `CHANNEL_TYPE_LABELS`, `CHANNEL_TYPE_COLORS`, `CHANNEL_TYPE_CHAR_LIMITS`
  - `CHANNELS` — ordered `Channel[]` for iteration
  - Helpers: `getChannelUrl`, `getChannelIcon`, `getChannelLabel`, `getChannelColor`, `getChannelCharLimit`
- Render icons via `<HugeiconsIcon icon={...} />` from `@hugeicons/react` — the icons are data objects, not React components.

### UI library
- Full shadcn install: **55 components** in `src/components/ui/` (button, card, sidebar, dropdown-menu, dialog, table, tabs, command, etc.)
- Theme provider + mode toggle (light/dark/system via next-themes)

---

## 3. What's Stubbed/Placeholder 🚧

- `/dashboard/ideas` — "Your post ideas will appear here." empty state, no functionality
- `/dashboard/schedule` — "Your content calendar will appear here." empty state
- AppSidebar "Create post" dialog — opens but does nothing
- `/dashboard` root — redirects to `/dashboard/ideas`
- `social-platforms.ts` constants defined but no UI yet consumes them (channel pickers, post-target chips, etc. are still TODO)

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
- **Channel/account-linking UI** — `social-platforms.ts` is defined but no flows exist yet to actually link a user's X/LinkedIn/etc. account.

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
│   │       ├── _common/                  # sidebar (dropup user menu), header, nav config
│   │       └── dashboard/
│   │           ├── page.tsx              # redirect → /dashboard/ideas
│   │           ├── ideas/page.tsx        # STUB
│   │           ├── schedule/page.tsx     # STUB
│   │           ├── billing/page.tsx      # IMPLEMENTED — pricing cards
│   │           │   └── _components/buy-pack-button.tsx
│   │           ├── settings/page.tsx     # IMPLEMENTED — account + providers
│   │           └── profile/page.tsx      # IMPLEMENTED — user profile
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
│   ├── billing/
│   │   ├── credits.ts                    # grantCredits, spendCredits, getCreditBalance
│   │   ├── packs.ts                      # CREDIT_PACKS, getPack, getDodoProductId
│   │   └── dodo.ts                       # createPayment, verifyWebhookSignature
│   └── constants/
│       └── social-platforms.ts           # ChannelTypeEnum, CHANNELS, hugeicons-backed icon/url/color/charLimit maps
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
- ~~Migration not applied to D1 locally~~ — **applied 2026-05-22** via `npx wrangler d1 migrations apply aipostsc-auth-db --local`. Auth chain now works end-to-end in dev. **Remote D1 still pending** — run with `--remote` before shipping.
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

---

## 12. Session log — 2026-05-22 (session 2)

User hit `no such table: accounts` on Google login (local D1 had no schema yet), then asked for a constants file, sidebar dropup, profile/settings/billing polish, and a Dodo setup walkthrough.

### Fixes & additions
- **D1 migration applied locally** — `npx wrangler d1 migrations apply aipostsc-auth-db --local` (15 commands executed). Google sign-in flow now works end-to-end in dev.
- **Sidebar user menu → dropup** — replaced inline `Log out` row with a `side="top"` `DropdownMenu` containing Profile / Settings / Appearance (submenu: Light / Dark / System via `next-themes`) / Logout. Logout calls `authClient.signOut` then `router.replace("/sign-in")`. Removed redundant standalone logout button.
- **`/dashboard/profile`** — new route. Server component; pulls user row + credit balance; renders gradient banner with avatar, verified badge, member-since, balance + status cards, and a key/value details table.
- **`/dashboard/settings`** — fleshed out from stub: Account, Connected providers (Google with Connected badge sourced from `accounts` table), Billing shortcut, Support mailto. Buttons use base-ui `render={<Link/>}` (NOT `asChild` — that prop doesn't exist on this Button).
- **`/dashboard/billing`** — redesigned: balance card with gradient + Coins icon; 3 pricing cards with per-pack accent gradient (sky / primary / amber), feature checklist (defined in-page, marketing copy only — packs.ts stays canonical for price/credits/Dodo IDs), Popular badge on Creator.
- **`src/lib/constants/social-platforms.ts`** — `ChannelTypeEnum` + 5 maps (icons, urls, labels, colors, char limits) + ordered `CHANNELS` array + 5 getters. Icons sourced from `@hugeicons/core-free-icons` as `IconSvgElement` data; render with `<HugeiconsIcon icon={...} />` from `@hugeicons/react`.
- **Packages added:** `@hugeicons/core-free-icons@4.1.4`, `@hugeicons/react@1.1.6`.

### Verified
- `tsc --noEmit` clean after all changes
- Local D1 migration succeeded (all 6 tables present)

### NOT verified
- New pages not yet exercised in a browser (no manual UI check this session)
- No Dodo test purchase run — env vars in `.dev.vars` not filled in yet

---

## 13. Session log — 2026-05-22 (session 3 — Claude-style billing)

User asked to switch from "pure one-time credits" to **Claude-style monthly resets + lifetime top-ups**. Architectural choices confirmed via AskUserQuestion: Dodo subscriptions (recurring), 25-credit free tier, 3 existing products convert to subscriptions + 1 new top-up SKU. Plan written to `/Users/ishaan/.claude/plans/i-want-expiry-one-virtual-crown.md` and approved.

### Schema changes (drizzle/0000_init.sql regenerated)
- `users`:
  - DROP `credit_balance`
  - ADD `monthly_credit_balance INTEGER NOT NULL DEFAULT 25`
  - ADD `topup_credit_balance INTEGER NOT NULL DEFAULT 0`
  - ADD `plan_id TEXT NULL`
  - ADD `plan_status TEXT NULL` ('active'|'cancelled'|'past_due'|null)
  - ADD `plan_period_end INTEGER NULL` (timestamp_ms)
  - ADD `dodo_subscription_id TEXT NULL`
  - new indexes on `dodo_subscription_id` and `plan_period_end`
- `credit_transactions`:
  - REPLACE type enum with `spend | topup_purchase | monthly_grant | monthly_forfeit | refund | bonus | adjustment`
  - ADD `pool TEXT NOT NULL` ('monthly' | 'topup')
  - ADD `subscription_id TEXT NULL`, `plan_id TEXT NULL`
  - new compound index `(user_id, created_at)` for ledger history
- Since there are no production users, the OLD `0000_init.sql` was deleted and regenerated as a single migration. Local D1 wiped & re-applied (`rm -rf .wrangler/state/v3/d1 && wrangler d1 migrations apply --local`). Remote still pending.

### Core code (rewritten)
- **`src/lib/billing/credits.ts`** — full rewrite. Public surface:
  - `getCreditState(userId)` — always lazy-resets via `resetMonthlyCreditsIfDue` first
  - `spendCredits({ userId, amount, operation, … })` — SELECT → split monthly-first → UPDATE-with-WHERE-balances-guard (optimistic locking, 3 retries) → INSERT 1-or-2 ledger rows
  - `grantTopupCredits({ userId, amount, packId?, paymentId?, … })`
  - `resetMonthlyCreditsIfDue(userId)` — atomic; cancelled subs drop back to free tier (planId=null, monthly=25)
  - `applySubscriptionActive` / `applySubscriptionRenewed` / `applySubscriptionCancelled` / `applySubscriptionPastDue`
  - `initializeFreeTierUser(userId)` — sets planPeriodEnd=now+30d + writes initial monthly_grant row
  - Legacy `getCreditBalance(userId)` still works (returns total)
- **`src/lib/auth.ts`** — added `databaseHooks.user.create.after` calling `initializeFreeTierUser`. Session-create geo snapshot still in place.
- **`src/lib/billing/packs.ts`** — split into `PLANS` (subscription) + `TOPUP_PACKS` (one-time) + `FREE_TIER_MONTHLY_CREDITS = 25`. New helpers: `getPlan`, `getTopupPack`, `getPlanMonthlyAllotment`, `getDodoPlanProductId`, `getDodoTopupProductId`. Old `CREDIT_PACKS` / `getPack` / `getDodoProductId` removed.
- **`src/lib/billing/dodo.ts`** — added `createSubscription` (POST `/subscriptions`), `getSubscriptionPeriodEnd` helper. `isSuccessfulPaymentEvent` now strict-checks `evt.type === "payment.succeeded"`.
- **`src/app/api/billing/checkout/route.ts`** — body shape now `{ purchaseType: 'subscription'|'topup', planId?, packId? }`. Branches to `createSubscription` / `createPayment`. Metadata carries `purchase_type` for the webhook dispatcher.

### Webhook event dispatch matrix (`src/app/api/webhooks/dodo/route.ts`)

| Event type | Action |
|---|---|
| `payment.succeeded` w/ `data.subscription_id` | `applySubscriptionRenewed()` — reset monthly + advance plan_period_end |
| `payment.succeeded` w/ `metadata.purchase_type='topup'` | `grantTopupCredits()` — add to topup pool |
| `subscription.active` | `applySubscriptionActive()` — link sub to user, set planId/status/periodEnd, reset monthly to plan allotment |
| `subscription.cancelled` | `applySubscriptionCancelled()` — set status='cancelled'; credits ride out period; lazy reset drops to free tier at period end |
| `subscription.past_due` / `subscription.payment_failed` | `applySubscriptionPastDue()` — set status='past_due', no credit change |
| `credit.added` / `credit.deducted` / `credit.expired` / others | recorded into `payment_events` for audit; no runtime action (Dodo's internal entitlement; we don't use it) |

Idempotency: every event hits the `payment_events` insert-or-noop guard BEFORE dispatch — so retries are safe. The dispatch happens only on first delivery.

### ACID / concurrency

- **Atomicity:** every credit mutation is a single guarded UPDATE. If the WHERE doesn't match (lost race), UPDATE returns 0 rows and we retry up to 3x.
- **Consistency:** invariants `monthly >= 0` and `topup >= 0` enforced by Math.min split; total deducted always equals `amount`. Lazy reset before every spend prevents post-period spending against a stale monthly balance.
- **Isolation:** optimistic locking using `(monthlyBalance, topupBalance)` as the version pair.
- **Durability:** D1 commits per statement; webhook returns 2xx only after handler succeeds, so Dodo's retry on 5xx covers any worker crash mid-handler.
- **SOLID:** `credits.ts` owns mutation primitives only; `packs.ts` owns the catalog; `dodo.ts` owns payment-processor I/O; webhook route is a thin dispatcher. Adding a new plan = entry in `PLANS` + env var. Adding a new event = case in the switch.

### UI updates
- **`/dashboard/billing`** — completely redesigned: current-plan summary card with monthly-pool progress bar + topup balance, 3 subscription plan cards (with "Current"/"Popular" badges), top-up section with one-time cards.
- **`/dashboard/profile`** — split into Monthly Pool / Top-up Pool / Total Available cards; account details row added plan/status/periodEnd fields.
- **`buy-pack-button.tsx`** — split into `SubscribeButton` (handles current-plan / switch / subscribe states) + `BuyTopupButton`. Both POST to `/api/billing/checkout` with different `purchaseType`.

### Env vars renamed/added
- DROP: `DODO_PRODUCT_STARTER` / `DODO_PRODUCT_CREATOR` / `DODO_PRODUCT_PRO`
- ADD: `DODO_PLAN_STARTER` / `DODO_PLAN_CREATOR` / `DODO_PLAN_PRO` (subscription product IDs)
- ADD: `DODO_TOPUP_500` (one-time top-up product ID)
- `src/env-extra.d.ts` updated to match. Run `pnpm cf-typegen` after filling `.dev.vars`.

### What the user still needs to do on the Dodo dashboard
1. **Convert each existing product** (Starter / Creator / Pro) from One-time → Subscription, Monthly billing cycle. Keep the existing AI Credits entitlement attached — 30-day expiry, rollover OFF now matches our reset semantics.
2. **Create 1 new one-time product** "Extra 500 Credits" at $20. **Don't** attach the 30-day AI Credits entitlement (it would clash with "never expires" semantics). If wanted, create a *separate* Never-expiry entitlement and attach that instead.
3. **Webhook endpoint** at `<tunnel-or-prod-url>/api/webhooks/dodo`, subscribed to:
   - `payment.succeeded`, `subscription.active`, `subscription.cancelled`, `subscription.past_due` (required)
   - `credit.added`, `credit.deducted`, `credit.expired` (optional, audit-only)
   - Copy the `whsec_…` signing secret → `.dev.vars` as `DODO_WEBHOOK_SECRET`.
4. **Copy the 4 product IDs** into `.dev.vars` under the new var names above.

### Verified this session
- `tsc --noEmit` clean
- `drizzle-kit generate --name init` produced clean SQL (6 tables, all expected columns/indexes/FKs)
- Local D1 wiped & migration re-applied — 18 SQL commands succeeded

### NOT verified this session
- No live browser run — sign in, watch initializeFreeTierUser write the monthly_grant row, verify all UI states
- No Dodo test subscription or top-up purchase (webhook secret not configured yet)
- Concurrency claim (optimistic lock retries) not stress-tested with a parallel-spend script
- The exact JSON shape of Dodo's `subscription.active`/`subscription.cancelled`/`subscription.past_due` payloads (especially `current_period_end` vs `next_billing_date`) — verify against https://docs.dodopayments.com when first events arrive; the `getSubscriptionPeriodEnd` helper tolerates either key
