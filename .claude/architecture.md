# Broad Sky — Architecture

> AI-powered social media post scheduling SaaS. Single-tenant per user (no workspaces yet).

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16.2.6 (App Router, Turbopack) |
| Runtime | Cloudflare Workers via OpenNext (`@opennextjs/cloudflare`) |
| DB | Cloudflare D1 (SQLite) via Drizzle ORM |
| Cache / sessions | Cloudflare KV (Better Auth secondary storage) |
| Auth | `better-auth` 1.6.11 (direct, NOT `better-auth-cloudflare`) |
| Billing | Dodo Payments (REST, no SDK) |
| UI | Tailwind 4 + shadcn (55 primitives) + base UI |

## Module map

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...all]/               → Better Auth catch-all
│   │   ├── billing/checkout/            → Creates a Dodo payment link / sub
│   │   ├── webhooks/dodo/               → Dodo webhook (edge runtime, HMAC verified)
│   │   └── integrations/                → OAuth lifecycle (see below)
│   │       ├── route.ts                   GET only — list user's integrations
│   │       ├── connect/route.ts           POST — start OAuth, returns { url }
│   │       ├── callback/route.ts          GET — OAuth redirect target
│   │       └── disconnect/route.ts        POST — soft disconnect (clear tokens)
│   ├── (routes)/
│   │   ├── (landing)/                   → / marketing page
│   │   ├── (auth)/sign-in/              → /sign-in
│   │   └── (dashboard)/                 → All /dashboard/* (gated by proxy.ts)
│   │       ├── _common/                   sidebar (dropup), header, nav config
│   │       └── dashboard/
│   │           ├── ideas/                 STUB
│   │           ├── schedule/              STUB
│   │           ├── billing/               Subscriptions + topups + balance card
│   │           ├── integrations/          OAuth UI (Connect/Disconnect rows)
│   │           ├── settings/              Account + Google linkage
│   │           └── profile/               User profile + credit pools
│   ├── layout.tsx, globals.css
│
├── db/
│   ├── index.ts                         → getDb() singleton + schema re-export
│   ├── auth-schema.ts                   → users, sessions, accounts, verifications + relations
│   ├── billing-schema.ts                → credit_transactions, payment_events
│   ├── integrations-schema.ts           → integrations
│   └── content-schema.ts                → idea_groups, ideas, scheduled_posts
│
├── lib/
│   ├── auth.ts                          → buildAuth() + getAuth() cached singleton
│   ├── auth-client.ts                   → authClient (signIn/signOut/useSession)
│   ├── billing/
│   │   ├── credits.ts                     grantTopupCredits, spendCredits, getCreditState, …
│   │   ├── packs.ts                       PLANS + TOPUP_PACKS catalog
│   │   └── dodo.ts                        REST client + webhook signature verification
│   ├── composio/                        → ACTIVE OAuth + tool execution (see flow below)
│   │   ├── client.ts                      getComposio() — singleton with COMPOSIO_API_KEY from getCloudflareContext().env
│   │   ├── platforms.ts                   COMPOSIO_PLATFORMS map (toolkit slug, auth-config env var, enabled) + getAuthConfigId + getAppUrl
│   │   ├── connections.ts                 startConnection / getConnection / deleteConnection
│   │   └── tools.ts                       executeIntegrationTool — direct execution, no LLM
│   ├── oauth/                           → LEGACY — entire library is commented-out (see "Legacy OAuth" below)
│   └── constants/integrations.tsx       → IntegrationTypeEnum + brand metadata (icons, labels, char limits, colors)
│
├── components/                          → 55 shadcn primitives + theme provider/toggle
├── proxy.ts                             → middleware: gates /dashboard/* → /sign-in
└── env-extra.d.ts                       → augments CloudflareEnv with secrets
```

## Auth flow (Google OAuth via Better Auth)

```
browser → /sign-in → authClient.signIn.social("google")
       → /api/auth/sign-in/social/google  (Better Auth)
       → Google consent
       → /api/auth/callback/google
       → user + session rows in D1; KV cookie cache populated
       → redirect /dashboard/ideas
       → on every /dashboard/* hit, proxy.ts checks the session cookie

databaseHooks.session.create.before — snapshots geo (timezone/city/colo/lat/lon) from cf object
databaseHooks.user.create.after    — initializeFreeTierUser (planPeriodEnd = now+30d, monthly_grant ledger row)
```

OAuth tokens for Google sign-in (stored in `accounts.access_token`) are encrypted by Better Auth via `account.encryptOAuthTokens: true` — that's separate from the integrations OAuth tokens (see below).

## Billing flow (Dodo Payments — two-pool credits)

- `users.monthly_credit_balance` — resets to plan allotment (or free-tier 25) every 30 days. No rollover.
- `users.topup_credit_balance` — one-time top-ups, never expire.
- Spend monthly first, then topup. Hard cutoff at zero.

### Subscription purchase
```
UI POST /api/billing/checkout { purchaseType: "subscription", planId, billingCycle }
  → Dodo POST /subscriptions
  → returns Dodo-hosted payment link
  → user completes payment
  → Dodo webhook subscription.active → applySubscriptionActive (sets planId/cycle, resets monthly to allotment)
  → Dodo webhook payment.succeeded (with subscription_id) → applySubscriptionRenewed (advances planPeriodEnd by 30d, resets monthly pool)
```

### Top-up purchase
```
UI POST /api/billing/checkout { purchaseType: "topup", packId }
  → Dodo POST /payments
  → user pays
  → Dodo webhook payment.succeeded (purchase_type='topup' in metadata) → grantTopupCredits
```

Idempotency: every webhook event is recorded into `payment_events` BEFORE dispatch — re-deliveries are deduped. Webhook handler verifies HMAC-SHA256 over Standard Webhooks-style headers (`webhook-id`/`webhook-timestamp`/`webhook-signature`).

Concurrency: `spendCredits` uses optimistic locking — `UPDATE users SET balances=… WHERE balances=prior_values`; up to 3 retries.

Critical: `planPeriodEnd` is our **monthly refresh anchor**, NOT the Dodo billing-cycle end. Annual subscribers still get monthly credit resets (planPeriodEnd advances +30d on each payment).

## Integrations flow (Composio-backed)

OAuth + token storage + refresh are all delegated to [Composio](https://docs.composio.dev) via `@composio/core`. We supply one `COMPOSIO_API_KEY` plus one auth-config id per platform (created on the Composio dashboard) and store only the `connectedAccountId` Composio hands back.

```
   ┌──────────┐                  ┌─────────────────────────┐
   │ Connect  │ ───POST {platform} ─→ POST /api/integrations/connect
   └──────────┘                     │
                                    │ COMPOSIO_PLATFORMS[platform].enabled? — 503 platform_disabled if not (TWITTER)
                                    │ getAuthConfigId(platform) — 503 not_configured if env missing
                                    │ composio.connectedAccounts.link(userId, authConfigId,
                                    │   { callbackUrl: `${appUrl}/api/integrations/callback?platform=…` })
                                    ↓
                                    returns { url: connectionRequest.redirectUrl }
                                    ↓
        browser → window.location.href = url
                                    ↓
                              Composio-hosted auth flow (handles provider OAuth)
                                    ↓
                                    user approves
                                    ↓
                              GET /api/integrations/callback
                                    ?status=success
                                    &connectedAccountId=<id>
                                    &platform=<round-tripped>
                                    │
                                    │ session.user.id present
                                    │ status === "success"
                                    │ getConnection(connectedAccountId) — pulls handle/profile_image/etc. (best-effort)
                                    │ db.insert(integrations).onConflictDoUpdate([userId, platform])
                                    │   { composioConnectedAccountId, handle, profileImage, profileUrl, metadata, status:'active' }
                                    ↓
                              302 /dashboard/integrations?connected=true&platform=…
                              <CallbackToastBanner /> reads params → toast + strips query
```

The legacy access_token / refresh_token / token_expires_at / scope columns are kept on the `integrations` table for migration continuity but are always written as null — Composio holds the actual tokens server-side.

### Direct tool execution

`src/lib/composio/tools.ts` exports `executeIntegrationTool({ userId, toolSlug, arguments, version? })`. It wraps `composio.tools.execute()` directly — no LLM, no agent framework — and normalizes the response into `{ ok, data, error, elapsedMs, toolSlug }`. This is what the future publisher daemon will sit on top of; for now it's exercised via `POST /api/integrations/execute`.

```ts
// Caller is responsible for picking the right slug (verify via composio.tools.get()
// or the CLI — never invent slugs). Pin `version` in production for schema stability.
const result = await executeIntegrationTool({
  userId: session.user.id,
  toolSlug: "<VERIFIED_TOOL_SLUG>",
  arguments: { /* tool-specific */ },
  // version: "20251201_00",
})
```

### Disconnect (soft, with Composio cleanup)
```
POST /api/integrations/disconnect { integrationId }
  → SELECT row, verify platform is in the supported enum
  → if row.composioConnectedAccountId:
      composio.connectedAccounts.delete(id)   (best-effort — log-and-continue)
  → UPDATE integrations
      SET access_token=null, refresh_token=null, token_expires_at=null,
          composio_connected_account_id=null, status='revoked'
      WHERE id=? AND user_id=?
```
The row is preserved (history, audit). Scheduled posts referencing it are NOT cascade-deleted — they'll fail at publish time if the integration is still revoked then.

### Security

- **Composio handles the heavy lifting**: OAuth state/PKCE, code exchange, token refresh, encryption at rest — all server-side on their end. We never see or store provider access tokens.
- **Workers runtime**: `getComposio()` passes `apiKey` explicitly from `getCloudflareContext().env` because Workers don't expose `process.env` (the SDK's default).
- **Cross-account guard**: callback verifies `getAuth().api.getSession()` returns a user before upserting. Composio's `link()` was scoped by `userId` at start, so the connectedAccountId is bound to that user.
- **Open-redirect defense**: callback's `safeRedirectPath()` allows only `/dashboard/*` paths with no `..`, `\\`, `:`, or `//` prefix. (Currently we always redirect to `/dashboard/integrations`; the guard is defense-in-depth in case we later make the redirect parameterized.)
- **Stored metadata bounding**: profile data from `composio.connectedAccounts.get(id)` is JSON-bounded to 4 KB before persisting (wraps oversized payloads in `{ _truncated: true, _bytes, head }`).
- **Disconnect**: SELECT-then-UPDATE pattern. The SELECT checks `(id, user_id)` AND verifies the row's `platform` is in the supported enum before mutating. The user-scoping alone already prevents auth bypass; the platform check is defense-in-depth.
- **Misconfiguration**: missing `COMPOSIO_API_KEY` or `COMPOSIO_AUTH_CONFIG_<PLATFORM>` throws `ComposioNotConfiguredError` → 503 with `missing: ["COMPOSIO_AUTH_CONFIG_LINKEDIN", …]`. UI toast surfaces the env-var list verbatim.

### Token refresh

Handled entirely by Composio server-side — we never see the tokens. Composio refreshes them lazily on `tools.execute()`. There is no token-refresh code on our side anymore; the old `src/lib/oauth/refresh.ts` is commented out and obsolete.

### Twitter / X status

`COMPOSIO_PLATFORMS.TWITTER.enabled = false` in `src/lib/composio/platforms.ts`. The connect button returns `503 platform_disabled` → "Coming soon" toast in the UI. Re-enable after deciding between Composio-managed Twitter auth and BYO X Developer credentials.

### Adding a new platform
1. Add the enum value to `IntegrationTypeEnum` (in `src/lib/constants/integrations.tsx`) and to `integrationPlatforms` (in `src/db/integrations-schema.ts`); regenerate the migration if no prod data, else write an ALTER.
2. Add a brand icon + the 4 metadata records in `src/lib/constants/integrations.tsx`.
3. Add an entry to `COMPOSIO_PLATFORMS` in `src/lib/composio/platforms.ts` with the Composio toolkit slug (verify via `composio search` or `composio.toolkits.get(slug)` — do not invent slugs) and the auth-config env-var name.
4. Add the matching `COMPOSIO_AUTH_CONFIG_<NAME>?: string` field to `src/env-extra.d.ts` and a setup-line to `.dev.vars.example`.
5. Create the auth config on the Composio dashboard, copy the `ac_…` ID into `.dev.vars`.

### Legacy OAuth

`src/lib/oauth/**/*.ts` (14 files: client/state/pkce/types/index/refresh + 7 per-provider modules + `_shared.ts`) is the **previous** hand-rolled OAuth stack. Each file is now wrapped in a `LEGACY — DO NOT TOUCH` banner with its body block-commented; only `export {}` is active. The hand-rolled HMAC state, PKCE, AES-GCM token encryption, per-provider exchange, and token refresh are all obsolete because Composio manages OAuth + tokens server-side. **Future agents: do not re-enable or import from these files.**

The legacy `*_CLIENT_ID / *_CLIENT_SECRET / *_AUTH_URL / *_TOKEN_URL / *_PROFILE_URL / *_SCOPES` per-provider env vars and `INTEGRATION_TOKEN_KEK` remain declared optional in `src/env-extra.d.ts` so existing `.dev.vars` files still typecheck, but nothing in the code reads them.

## Local development with Composio

Composio's hosted auth pages handle provider redirect URIs for you — you don't need to register `http://localhost:3000/...` with each individual provider portal. The browser flow goes:
- `<your app>` → `<composio>` (provider sign-in) → `<your app>/api/integrations/callback?status=success&...`

For Composio's redirect back to your app to work in development, set `NEXT_PUBLIC_APP_URL=http://localhost:3000` in `.dev.vars`. Composio's `callbackUrl` setting accepts `http://localhost` for dev — no tunnel is required for the basic flow.

A tunnel (Cloudflare Tunnel, ngrok) is still useful for testing webhooks (Dodo billing, future Composio triggers) since those need a publicly reachable URL.

**Recommended: Cloudflare Tunnel** (you're already on Cloudflare):
```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:3000
# → https://<random>.trycloudflare.com
```
The URL prints to the terminal. For each provider's dev portal, register `https://<tunnel>/api/integrations/callback`. In `.dev.vars`, set `NEXT_PUBLIC_APP_URL=https://<tunnel>`. Restart `pnpm dev`.

The quick-tunnel URL changes every restart. To get a stable URL across sessions, set up a **Named Tunnel** under Cloudflare Zero Trust (free tier):
```bash
cloudflared tunnel login
cloudflared tunnel create broadsky-dev
cloudflared tunnel route dns broadsky-dev dev.yourapp.example.com
cloudflared tunnel --config ~/.cloudflared/config.yml run broadsky-dev
```

**Alternative: ngrok** (`ngrok http 3000`) — same workflow; free tier also has rotating URLs.

The tunnel approach also matters for testing webhooks (Dodo, future provider webhooks) since those need a publicly reachable URL.

## Deployment

- Local: `pnpm dev` runs Turbopack on port 3000.
- Worker preview: `pnpm preview` builds via OpenNext + `wrangler dev`.
- Production: `pnpm deploy` (or `wrangler deploy`). Secrets via `wrangler secret put <KEY>`. `BETTER_AUTH_URL` is a non-secret in `wrangler.jsonc:vars`.
- Migration: `npx wrangler d1 migrations apply aipostsc-auth-db --local` for dev D1, `--remote` for prod.

## What's stubbed / not done

See `.claude/CHECKPOINT.md` §3 and §4.
