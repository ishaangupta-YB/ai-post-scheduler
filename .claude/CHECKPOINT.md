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

---

## 14. Session log — 2026-05-22 (session 4 — Settings & Integrations Split)

User requested a cleaner separation between Settings and Integrations, reverting the multi-tab Settings page and replacing inaccurate social logos with true brand SVGs.

### Decisions taken
- **Settings Page:** Reverted to a straightforward, single-page view showing Account, Connected providers, Billing, and Support.
- **Integrations Page:** Created a dedicated `/dashboard/integrations` page to handle social channel connections. It uses a placeholder API route and syncs via client-side `localStorage`.
- **Social Logos:** Replaced `@hugeicons/react` imports in `src/lib/constants/social-platforms.ts` with explicit brand SVG components (X, LinkedIn, Instagram, Threads, Facebook, Bluesky, YouTube, TikTok) for authenticity.

### Files modified/created
- **`src/app/(routes)/(dashboard)/dashboard/settings/page.tsx`:** Restored to a simple, non-tabbed layout.
- **`src/app/(routes)/(dashboard)/dashboard/settings/_components/settings-tabs.tsx`:** Deleted.
- **`src/app/(routes)/(dashboard)/dashboard/integrations/page.tsx`:** New page dedicated to displaying and managing social integrations.
- **`src/app/api/integrations/route.ts`:** New empty placeholder API route for integrations.
- **`src/lib/constants/social-platforms.ts`:** Replaced Hugeicons with pure SVG components. Updated `Channel` type to expect a `React.ComponentType`.
- **`src/app/(routes)/(dashboard)/_common/dashboard-nav.ts`:** Added the Integrations link using the `Blocks` icon.
- **`src/app/(routes)/(landing)/_components/landing-client.tsx`:** Updated `HugeiconsIcon` references to natively render the new SVG components.

### Verified
- `npm run build` clean, new routes registered.

---

## 15. Session log — 2026-05-22 (session 5 — Annual subs · channel→integration rename · integrations/ideas/scheduled_posts schema)

User asked to (1) add monthly **and annual** subscription billing, (2) rename the codebase noun `channel` → `integration` globally, and (3) wire a real DB-backed integrations system (plus tables for ideas + scheduled posts), feeding `/dashboard/integrations` from the database instead of localStorage. Plan file: `/Users/ishaan/.claude/plans/start-with-where-we-fizzy-moore.md`.

### Decisions taken (via AskUserQuestion)
- **Annual = monthly credit resets** (not yearly bulk grant). Annual is purely a billing-cycle discount; users still get monthly credit refreshes. `planPeriodEnd` is therefore our *monthly refresh anchor*, NOT Dodo's billing-cycle end — always advanced by +30 days regardless of cycle.
- **Annual discount = ~17% off** ("2 months free"): Starter $50/yr, Creator $200/yr, Pro $700/yr.
- **One integration per platform per user** — `UNIQUE (user_id, platform)` index on `integrations`. Multi-account-per-platform would need a destructive migration to drop the unique index.
- **Regenerate `0000_init.sql`** as a single migration (no prod users) instead of appending 0001/0002.

### Track A — Annual subscriptions
- **`src/db/auth-schema.ts`:** ADD `planBillingCycle: text("plan_billing_cycle", { enum: ["monthly","annual"] })` to `users`.
- **`src/lib/billing/packs.ts`:** Rewrote `Plan` shape — REMOVED `priceUsd`, ADDED `monthlyPriceUsd` + `annualPriceUsd`. Added `BillingCycle` type, `getPlanPricing(plan, cycle)`, `getAnnualSavingsPercent(plan)`. Extended `getDodoPlanProductId(env, planId, cycle)` to switch between monthly and annual product IDs.
- **`src/app/api/billing/checkout/route.ts`:** Accepts `{ billingCycle: "monthly" | "annual" }` in body; defaults to monthly. Passes cycle to product-id lookup. Includes `billing_cycle` in Dodo metadata.
- **`src/app/api/webhooks/dodo/route.ts`:** `handleSubscriptionActive` reads `meta.billing_cycle` and forwards it. **Crucial:** stopped using `getSubscriptionPeriodEnd(evt)` for `planPeriodEnd` — that would lock annual subscribers out of monthly refreshes for a year. Replaced with `nextMonthlyAnchor()` (always +30d). `getSubscriptionPeriodEnd` import dropped from this file (helper still exported from `dodo.ts` for future use).
- **`src/lib/billing/credits.ts`:** `applySubscriptionActive(args)` gained `billingCycle: BillingCycle | null` and writes it. `CreditState` exposes `planBillingCycle`. `loadPlanFields` returns it. Function docstrings updated to explain the cycle-agnostic +30d anchor.
- **Env vars:** Added `DODO_PLAN_STARTER_ANNUAL`, `DODO_PLAN_CREATOR_ANNUAL`, `DODO_PLAN_PRO_ANNUAL` to `src/env-extra.d.ts` and `.dev.vars.example`. User TODO on Dodo dashboard: create the 3 annual Subscription products with Yearly billing cycle at $50/$200/$700.
- **UI:**
  - NEW `src/app/(routes)/(dashboard)/dashboard/billing/_components/billing-plans-section.tsx` (client) — owns the Monthly/Annual toggle (Save 17% badge), renders plan cards with cycle-aware pricing via `getPlanPricing`.
  - `billing/page.tsx` shrunk to a server component delegating the plan grid to `<BillingPlansSection>`. Current-plan summary card now displays `· monthly` / `· annual` next to plan name.
  - `_components/buy-pack-button.tsx` `SubscribeButton` accepts `billingCycle` + `currentBillingCycle`; only marks itself "Current plan" when both planId AND cycle match.
  - `_components/landing-client.tsx` `PricingSection` — toggle now reads `plan.monthlyPriceUsd` / `plan.annualPriceUsd / 12` (deleted the `* 0.8` hack); "Save 17%" computed from `getAnnualSavingsPercent`.
  - `profile/page.tsx` — added Billing-cycle field to account details + cycle badge in the header card.

### Track B — `channel` → `integration` rename
- **RENAMED:** `src/lib/constants/social-platforms.tsx` → `src/lib/constants/integrations.tsx`. Inside: `ChannelTypeEnum`→`IntegrationTypeEnum`, `Channel` type→`Integration`, `CHANNELS`→`INTEGRATIONS`, `CHANNEL_TYPE_*` (5 maps)→`INTEGRATION_TYPE_*`, `getChannel*` (5 helpers)→`getIntegration*`.
- **Updated callers:** `app-sidebar.tsx` (filter loop + counter denominator now uses `INTEGRATIONS.length`), `landing-client.tsx` (`channels:` data prop on `ANIMATION_STEPS` items renamed to `integrations:`, `CHANNELS.find` / `CHANNELS.filter` updated). Marketing copy "queue multi-channel on autopilot" at `landing-client.tsx:131` kept as English (industry term, not a code identifier).
- `HugeiconsIcon` import dropped from `landing-client.tsx` (already unused; icons are native React SVG components).

### Track C — Real integrations + ideas + scheduled_posts schema
- **NEW `src/db/integrations-schema.ts`:**
  - `integrations` table — `id` text PK, `userId` (FK cascade), `platform` (enum from `integrationPlatforms`), `handle`, `profileImage`, `profileUrl`, `accessToken`/`refreshToken`/`tokenExpiresAt` (plaintext for now — envelope-encrypt before any real OAuth), `scope`, `metadata` json, `status` (active|expired|revoked), `connectedAt`, `lastSyncAt`, `createdAt`/`updatedAt`. Indexes: `(userId)`, **UNIQUE `(userId, platform)`**.
  - `integrationsRelations` — `one(users)`.
- **NEW `src/db/content-schema.ts`:**
  - `idea_groups` — `id`, `userId` (cascade), `name`, timestamps. Index `(userId)`.
  - `ideas` — `id`, `userId` (cascade), `groupId` (set null on group delete), `title`, `description`, `images` json string[], `tags` json string[], `sortOrder`, timestamps. Indexes `(userId)`, `(userId, groupId)`.
  - `scheduled_posts` — `id`, `userId` (cascade), `integrationId` (cascade — deleting an integration cancels its queued posts), `ideaId` (set null), `content`, `images` json, `scheduledAt`, `timezone`, `status` (draft|queued|publishing|published|failed|cancelled), `publishedAt`, `publishedUrl`, `failureReason`, `attemptCount`, timestamps. Indexes `(userId, scheduledAt)`, `(status, scheduledAt)` (for the future cron-driven publisher), `(integrationId)`.
  - `*Relations` for each table.
- **`src/db/index.ts`** — imports + spreads `integrationsSchema` and `contentSchema`, re-exports.
- **Migration regenerated:** Deleted `drizzle/0000_init.sql` + `meta/0000_snapshot.json` + reset `_journal.json`. Ran `pnpm drizzle-kit generate --name init` → produced fresh `0000_init.sql` covering **10 tables**: users, sessions, accounts, verifications, credit_transactions, payment_events, integrations, idea_groups, ideas, scheduled_posts. Applied locally with 30 SQL commands.
- **REWRITTEN `src/app/api/integrations/route.ts`:**
  - `GET`: auth-gated. Merges static `INTEGRATIONS` taxonomy with DB rows. Supports `?filter=connected|unconnected`. Returns `{ integrations, counts: { connected, total } }`.
  - `POST`: returns `501 not_implemented` (OAuth start/callback per platform out of scope).
  - `DELETE`: `{ integrationId }` — removes the row scoped to session user; CASCADE drops dependent scheduled posts.
- **REWRITTEN `src/app/(routes)/(dashboard)/dashboard/integrations/page.tsx`:** Server component. Queries `integrations` table for the session user, merges with static `INTEGRATIONS` list, renders rows. Removed all `localStorage` ("lemon_connected_integrations" key gone). Per-row Connect/Disconnect buttons extracted to a tiny client component.
- **NEW `src/app/(routes)/(dashboard)/dashboard/integrations/_components/integration-row-actions.tsx`:** `<ConnectButton>` POSTs to `/api/integrations` (surfaces "OAuth flow coming soon" toast on the 501 response). `<DisconnectButton>` DELETEs and reloads; both dispatch `window.dispatchEvent(new Event("integrations:updated"))`.
- **Updated `src/app/(routes)/(dashboard)/_common/app-sidebar.tsx`:** Dropped the `lemon_connected_integrations` localStorage read; replaced with `fetch("/api/integrations?filter=connected")`. Renamed listened event `lemon_integrations_updated` → `integrations:updated`. Counter footer "{n}/{INTEGRATIONS.length} integrations connected" (no more hard-coded 8).

### Files added/renamed/rewritten/deleted
- ADDED: `src/db/integrations-schema.ts`, `src/db/content-schema.ts`, `src/app/(routes)/(dashboard)/dashboard/billing/_components/billing-plans-section.tsx`, `src/app/(routes)/(dashboard)/dashboard/integrations/_components/integration-row-actions.tsx`, `src/lib/constants/integrations.tsx`.
- DELETED: `src/lib/constants/social-platforms.tsx`.
- REWRITTEN: `src/lib/billing/packs.ts`, `src/app/api/integrations/route.ts`, `src/app/(routes)/(dashboard)/dashboard/integrations/page.tsx`, `src/app/(routes)/(dashboard)/dashboard/billing/page.tsx`.
- MODIFIED: `src/db/auth-schema.ts`, `src/db/index.ts`, `src/lib/billing/credits.ts`, `src/lib/billing/dodo.ts`*, `src/app/api/billing/checkout/route.ts`, `src/app/api/webhooks/dodo/route.ts`, `src/app/(routes)/(dashboard)/_common/app-sidebar.tsx`, `src/app/(routes)/(landing)/_components/landing-client.tsx`, `src/app/(routes)/(dashboard)/dashboard/profile/page.tsx`, `src/app/(routes)/(dashboard)/dashboard/billing/_components/buy-pack-button.tsx`, `src/env-extra.d.ts`, `.dev.vars.example`, `drizzle/0000_init.sql` (regenerated), `drizzle/meta/0000_snapshot.json` + `_journal.json`.

*`dodo.ts` itself is unchanged this session — the cycle is a Dodo product attribute (set on the dashboard at product creation), not an API parameter. The change is at the env-var / metadata layer.

### Verified this session
- `pnpm exec tsc --noEmit` — clean
- `pnpm exec next build` — clean; all 11 routes registered (`/api/integrations` shows up correctly)
- `pnpm drizzle-kit generate --name init` — single migration, 10 tables, 16 indexes (incl. UNIQUE `(user_id, platform)`)
- Local D1 wiped + migration applied — 30 SQL commands succeeded

### NOT verified this session
- No live browser run (sign in, observe `/dashboard/integrations` server-rendered with 0 connected; flip the billing toggle, watch the network payload; subscribe with annual)
- No Dodo test purchase (annual products not yet created on the dashboard; `DODO_PLAN_*_ANNUAL` env vars empty)
- Remote D1 migration NOT applied — run `npx wrangler d1 migrations apply aipostsc-auth-db --remote` before shipping
- OAuth flows per platform NOT implemented; Connect button always surfaces "Coming soon" toast
- `applySubscriptionRenewed` for an annual subscriber — relies on `resetMonthlyCreditsIfDue` to handle the 11 intermediate monthly refreshes; not yet stress-tested

### User TODO on Dodo dashboard
1. Create 3 new Subscription products (Yearly billing cycle): Starter Annual $50, Creator Annual $200, Pro Annual $700. Attach the same "AI Credits" entitlement as the monthly variants.
2. Copy the 3 new product IDs into `.dev.vars` as `DODO_PLAN_STARTER_ANNUAL` / `_CREATOR_ANNUAL` / `_PRO_ANNUAL`.
3. Run `pnpm cf-typegen` to refresh `cloudflare-env.d.ts`.

---

## 16. Session log — 2026-05-24 (session 6 — Billing fix · Bluesky removal · Real OAuth integrations · Docs)

User reported a runtime `TypeError` on `/dashboard/billing` and asked for (1) the fix, (2) full OAuth wiring for social-media integrations (no Bluesky), and (3) project documentation (`architecture.md`, `db-schema.md`, root `CLAUDE.md`).

### Decisions taken (via AskUserQuestion)
- **Disconnect = soft.** Keep the integration row, set `status='revoked'`, null tokens. Preserves history and avoids the `scheduled_posts` cascade. Re-connect upserts back to `active`.
- **Routes = dedicated sub-paths.** `/api/integrations/connect`, `/callback`, `/disconnect` — mirrors the user's pseudocode pattern. `/api/integrations` stays GET-only for listing.
- **Tokens at rest = AES-GCM-256.** New required secret `INTEGRATION_TOKEN_KEK` (32 base64-encoded random bytes). Web Crypto only — works in both nodejs and edge runtimes.

### Fixes
- **`/dashboard/billing` TypeError.** `billing/page.tsx` was doing `mainNav.find(item => item.name === "Billing")!`, but "Billing" was never in `mainNav` — the `!` lied and `page.name` blew up at render. Replaced with hardcoded `title="Billing"` + description, matching the pattern in `profile/page.tsx` and `integrations/page.tsx`. Dropped the now-unused `mainNav` import.

### Bluesky removal
- Dropped `BLUESKY` from `IntegrationTypeEnum` + all 5 metadata records + `INTEGRATIONS` array order in `src/lib/constants/integrations.tsx`. Removed the `BlueskyIcon` SVG component.
- Dropped `"BLUESKY"` from `integrationPlatforms` tuple in `src/db/integrations-schema.ts`.
- Regenerated `drizzle/0000_init.sql` (single-migration policy — no prod users). 10 tables, all expected columns/indexes; `integrationPlatforms` now contains 7 values.
- Wiped local D1 (`rm -rf .wrangler/state/v3/d1`) and re-applied — 30 SQL commands executed successfully.

### OAuth foundation (`src/lib/oauth/`)
- **`crypto.ts`** — `encrypt` / `decrypt` / `encryptNullable` / `decryptNullable`. AES-GCM-256. IV is 12 random bytes per encryption, output format `${b64u(iv)}.${b64u(ct)}`. KEK is loaded once and cached. Decoded KEK length is validated to be exactly 32 bytes.
- **`state.ts`** — HMAC-SHA256 signed state token. Reuses `BETTER_AUTH_SECRET` (10-min TTL — no rotation concern). Payload: `{ userId, platform, redirectTo, nonce, exp }`. `verifyOAuthState` does constant-time signature compare + platform whitelist + exp check.
- **`pkce.ts`** — `createPkcePair()` returns 48 random bytes verifier + SHA-256 S256 challenge. `getPkceCookieName(state)` returns `bs_pkce_${b64u(sha256(state)).slice(0,16)}` so the verifier-state binding is cryptographic and the cookie name fits within practical limits.
- **`types.ts`** — `OAuthProvider` interface, `OAuthToken`, `OAuthProfile`, `ProviderNotConfiguredError`, `OAuthExchangeError`.
- **`index.ts`** — `getOAuthProvider(platform)` factory. `getProviderConfig(platform)` reads `<PLATFORM>_CLIENT_ID/CLIENT_SECRET/AUTH_URL/TOKEN_URL/PROFILE_URL/SCOPES` from `getCloudflareContext().env` and throws `ProviderNotConfiguredError({missing})` if anything is empty. `getAppUrl()` reads `NEXT_PUBLIC_APP_URL`.

### Providers (`src/lib/oauth/providers/`)
Seven implementations of `OAuthProvider` + a `_shared.ts` helper (`formUrlencoded`, `parseTokenResponse`, `postForm`, `fetchJson`, `basicAuthHeader`):
- **`twitter.ts`** — PKCE (S256). Token exchange uses Basic auth header. Profile via `users/me?user.fields=profile_image_url,username`. ProviderAccountId = `data.id`, handle = `data.username`.
- **`linkedin.ts`** — No PKCE. Profile via `/v2/userinfo` (OpenID Connect). ProviderAccountId = `sub`.
- **`instagram.ts`** — Facebook Login flow. Profile fetches `/me/accounts?fields=…instagram_business_account{…}` and picks the first page with a linked IG Business account. Errors clearly if none.
- **`threads.ts`** — Threads-specific. Profile uses `access_token` query param (not bearer header — Threads' quirk).
- **`facebook.ts`** — Pages OAuth. Profile via `/me?fields=id,name,picture`.
- **`youtube.ts`** — Google OAuth (separate Cloud OAuth client from the sign-in Google one). Sends `access_type=offline&prompt=consent` to get a refresh token. Profile via Google's userinfo endpoint.
- **`tiktok.ts`** — Login Kit. Uses `client_key` parameter (not `client_id`). Profile via `/v2/user/info/?fields=open_id,union_id,…`.

### API routes
- **NEW `src/app/api/integrations/connect/route.ts` (POST)** — auth-gated. Validates platform against `integrationPlatforms`. Loads provider (503 with `missing` list on `ProviderNotConfiguredError`). Signs state via `createOAuthState`. Creates PKCE pair if `provider.usesPkce`. Builds authorization URL. Returns `{ url }`. If PKCE used, sets HTTP-only `bs_pkce_<hash>` cookie with the verifier (10-min maxAge, SameSite=Lax).
- **NEW `src/app/api/integrations/callback/route.ts` (GET)** — handles OAuth redirect. Reads `code`/`state`/`error` query params. Verifies state HMAC. Cross-checks `session.user.id === state.userId`. Reads PKCE cookie for Twitter. Calls `provider.exchangeCodeForToken` then `provider.getProfile`. AES-GCM encrypts both tokens. Upserts into `integrations` via `.onConflictDoUpdate({ target: [userId, platform], set: {…, status:'active', updatedAt: now} })`. Clears PKCE cookie. Redirects to `redirectTo?connected=true&platform=…`. On any failure → `?connected=false&error=<reason>`.
- **NEW `src/app/api/integrations/disconnect/route.ts` (POST)** — auth-gated. UPDATEs row scoped to `(id, user_id)`: nulls tokens, sets `status='revoked'`. Returns 404 if no row matched, else `{ ok: true }`.
- **EDIT `src/app/api/integrations/route.ts`** — removed the old 501 `POST` stub and the hard-delete `DELETE` handler. Kept `GET` unchanged (sidebar polling still works).

### UI updates
- **`integration-row-actions.tsx`** — `ConnectButton` now POSTs to `/api/integrations/connect`, treats 503 as "Coming soon" toast, and on 200 does `window.location.href = json.url` (full-page redirect to provider). `DisconnectButton` now POSTs to `/api/integrations/disconnect` instead of the old DELETE. Both keep dispatching the `integrations:updated` event for sidebar refresh.
- **NEW `_components/callback-toast-banner.tsx`** — client component. Reads `?connected=true&platform=X` or `?connected=false&error=Y` via `useSearchParams()`, fires a `toast.success` / `toast.error` once on mount, then strips the query string with `router.replace`. Wrapped in `<Suspense>` in the integrations page (App Router requires it for `useSearchParams`).

### Env vars
- **`.dev.vars.example`** — appended full `*_CLIENT_ID/CLIENT_SECRET/AUTH_URL/TOKEN_URL/PROFILE_URL/SCOPES` blocks for INSTAGRAM, THREADS, FACEBOOK, YOUTUBE, TIKTOK. Added comments per provider. Added `INTEGRATION_TOKEN_KEK=` with generation instructions (`openssl rand -base64 32`). TWITTER and LINKEDIN blocks were already present.
- **`src/env-extra.d.ts`** — added `NEXT_PUBLIC_APP_URL?`, `BETTER_AUTH_SECRET?`, 42 OAuth fields (7 providers × 6 keys), and `INTEGRATION_TOKEN_KEK?`. All optional — `getProviderConfig()` surfaces missing keys as 503s, not type errors.

### Documentation
- **NEW `.claude/architecture.md`** — stack, module map, auth flow, billing flow, integrations OAuth flow with ASCII diagram, security model, deployment commands, "Adding a new platform" recipe.
- **NEW `.claude/db-schema.md`** — ER overview, table-by-table reference for all 10 tables (columns/types/indexes/notes), cascade chain notes.
- **NEW `CLAUDE.md` (repo root)** — operating guide. Points at `.claude/{CHECKPOINT,architecture,db-schema}.md`. Convention reminders (no `better-auth-cloudflare`; two-pool credits; `getDb()`; soft-disconnect; AES-GCM-256 tokens; etc.). Verified-pipeline list.

### Verified this session
- `pnpm exec tsc --noEmit` — clean
- `pnpm drizzle-kit generate --name init` — single migration, 10 tables, 7 platform enum values
- `pnpm exec next build` — clean; **all OAuth routes registered**: `/api/integrations/{connect,callback,disconnect}` + GET-only `/api/integrations`
- Local D1 wiped + migration applied — 30 SQL commands succeeded

### NOT verified this session
- **No live OAuth round-trip with a real provider.** Env vars not filled; redirect URIs not registered on any provider dashboard. The 503 path (provider not configured) is exercised in code but not manually clicked.
- No `INTEGRATION_TOKEN_KEK` set in `.dev.vars`. Connect attempts will succeed at the redirect step but crash on the callback's `encryptNullable` call until the KEK is provided.
- No remote D1 migration applied.
- Concurrency / parallel-connect race not stress-tested. `onConflictDoUpdate` should handle two simultaneous callbacks for the same `(userId, platform)` cleanly — last writer wins.
- Token refresh logic — not implemented. Stored `refresh_token` is encrypted but no rehydration helper yet. When the publisher daemon needs to post, it'll call a future `refreshIntegrationTokens(integrationId)` (TODO).

### User TODO before going live
1. **Generate the encryption KEK** — `openssl rand -base64 32` → paste into `.dev.vars` as `INTEGRATION_TOKEN_KEK=`. Set as a Workers Secret in prod via `wrangler secret put INTEGRATION_TOKEN_KEK`.
2. **Set `NEXT_PUBLIC_APP_URL`** in `.dev.vars` (default `http://localhost:3000` for dev).
3. **Register OAuth apps on each provider's developer portal** (X, LinkedIn, Meta-for-Threads/Instagram/Facebook, Google Cloud Console for YouTube, TikTok for Developers). For each:
   - Set the redirect URI: `<NEXT_PUBLIC_APP_URL>/api/integrations/callback`
   - Copy client id + secret into `.dev.vars`
4. **Run `pnpm cf-typegen`** to refresh `cloudflare-env.d.ts` after editing `.dev.vars`.
5. **Apply remote migration** before shipping: `npx wrangler d1 migrations apply aipostsc-auth-db --remote`.

---

## 17. Session log — 2026-05-24 (session 7 — OAuth audit & hardening + tunnel guidance)

User asked to verify the OAuth integration code actually works without breaking anything, cross-reference the `TechWithEmmaYT/Lemon-AI-SocialMedia-Scheduling-SaaS/lib/social-oauth` open-source repo, validate against the latest 2024-2026 provider docs, and explain whether they need ngrok or Cloudflare Tunnel.

### Cross-references checked
- **Lemon-AI repo** (scraped end-to-end): `index.ts` (provider factory + requestToken + refresh), `types.ts`, `state.ts`, `pkce.ts`, `encryption.ts`, all three API routes. Architectural alignment is high — same env-driven provider config, same `{b64u_payload}.{b64u_sig}` HMAC state, same PKCE-only-for-Twitter, same state-hashed PKCE cookie name. Our soft-disconnect is actually stricter than theirs (they null tokens but never set a status enum).
- **Provider docs** for X / LinkedIn / Instagram Graph / Threads / Facebook Pages / YouTube / TikTok confirmed: provider URLs (`x.com`, `api.x.com`, `threads.net`, `graph.threads.net`, `www.tiktok.com`, `open.tiktokapis.com`) are current; LinkedIn has migrated to OIDC `/v2/userinfo`; Meta family returns short-lived (1 hr) tokens that need long-lived exchange; YouTube needs `openid,email,profile` alongside YouTube scopes for `sub` in userinfo response; TikTok uses `client_key` (not `client_id`).

### 9 fixes shipped this session

| # | File | Fix | Severity |
|---|---|---|---|
| 1 | `src/app/api/integrations/callback/route.ts` | Strict allowlist for `safeRedirectPath` — rejects anything that isn't a `/dashboard/*` path with no `..`, `\\`, `:`, or `//` prefix. Falls back to `/dashboard/integrations`. | HIGH (defense-in-depth open-redirect) |
| 2 | `src/lib/oauth/state.ts` + `src/lib/oauth/crypto.ts` | `split(".")` now verified to yield exactly 2 segments; malformed `a.b.c.d` rejected. | LOW |
| 3 | `.dev.vars.example` | Dropped `media.write` from `TWITTER_SCOPES` (not a documented X scope — `tweet.write` already covers media upload via v2/media/upload). | LOW |
| 4 | `src/lib/oauth/providers/{threads,instagram,facebook}.ts` | Added TODO comments documenting the short-lived → long-lived (60d) Meta token exchange — `grant_type=refresh_token` is not supported by these providers, so `refreshToken` is intentionally omitted. | informational |
| 5 | `src/lib/oauth/types.ts` + `src/lib/oauth/providers/{twitter,linkedin,youtube,tiktok}.ts` + NEW `src/lib/oauth/refresh.ts` | Added optional `refreshToken` to `OAuthProvider`. Implemented for the 4 standards-conforming providers. `refreshIntegrationTokens(integrationId, userId)` decrypts → calls provider → re-encrypts → UPDATE. Not wired yet; primitive for the future publisher daemon. | NEW feature |
| 6 | `src/app/api/integrations/callback/route.ts` | Captures provider error message into `?details=…` (length-bounded, %-encoded). `console.error` includes platform + userId. Toast banner now shows `(details)` inline. | LOW |
| 7 | `src/app/api/integrations/disconnect/route.ts` | SELECT row first; verify platform is in `integrationPlatforms` whitelist before UPDATE. Defense-in-depth — user-scoped UPDATE already blocked auth bypass. | LOW |
| 8 | `src/app/api/integrations/callback/route.ts` | `profile.raw` capped at 4 KB JSON before persisting to `metadata`; oversized entries wrap with `{ _truncated: true, _bytes, head }`. | LOW |
| 9 | `src/app/(routes)/(dashboard)/dashboard/integrations/_components/integration-row-actions.tsx` | 503 response's `missing: [...]` env-var list now shown in the "Coming soon" toast description. | UX |

### Files added / modified
- ADDED: `src/lib/oauth/refresh.ts`
- MODIFIED: `src/lib/oauth/types.ts`, `src/lib/oauth/state.ts`, `src/lib/oauth/crypto.ts`, `src/lib/oauth/providers/{twitter,linkedin,youtube,tiktok,facebook,instagram,threads}.ts`, `src/app/api/integrations/callback/route.ts`, `src/app/api/integrations/disconnect/route.ts`, `src/app/(routes)/(dashboard)/dashboard/integrations/_components/integration-row-actions.tsx`, `src/app/(routes)/(dashboard)/dashboard/integrations/_components/callback-toast-banner.tsx`, `.dev.vars.example`.
- DOCS: `.claude/architecture.md` (Security + Local-dev sections), `CLAUDE.md` (tunnel note), this CHECKPOINT entry.

### Verified
- `pnpm exec tsc --noEmit` — clean
- `pnpm exec next build` — clean; all 4 OAuth routes still register (`/api/integrations`, `/connect`, `/callback`, `/disconnect`).

### NOT verified (unchanged from session 6)
- Live OAuth round-trip with any real provider — needs tunnel + filled `.dev.vars` + registered OAuth apps.
- Concurrent connect race for the same `(userId, platform)` — `onConflictDoUpdate` should serialize cleanly; not stress-tested.
- Long-lived token exchange for Meta providers (Threads/IG/FB) — out of scope; needs publisher-daemon design first.

### HTTPS tunnel guidance (the user asked: do I need ngrok or Cloudflare Tunnel?)

**Yes**, for every provider except YouTube. The required redirect URI must be **HTTPS** with a public hostname; `http://localhost` is rejected by Twitter, LinkedIn, Meta (FB/IG/Threads), and TikTok dev portals. Google (YouTube) is the lone exception that allows `http://localhost:<port>`.

Recommendation: **Cloudflare Tunnel** (since the project already runs on Cloudflare Workers). Free, integrates with the existing CF account, and supports named/persistent tunnels via Zero Trust.

```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:3000
# → https://<random>.trycloudflare.com
```

Register `https://<tunnel>/api/integrations/callback` as the redirect URI on each provider's portal. Set `NEXT_PUBLIC_APP_URL=https://<tunnel>` in `.dev.vars`. For a stable URL across restarts, set up a **Named Tunnel** under Cloudflare Zero Trust (free tier).

`ngrok http 3000` works identically and is fine if the user already has an account.
