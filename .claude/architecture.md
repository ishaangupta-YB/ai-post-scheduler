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
│   ├── oauth/                           → Per-platform OAuth (see flow below)
│   │   ├── index.ts                       factory + getProviderConfig + getAppUrl
│   │   ├── types.ts                       OAuthProvider interface, errors
│   │   ├── state.ts                       HMAC-signed state token (BETTER_AUTH_SECRET)
│   │   ├── pkce.ts                        PKCE pair + cookie name helper
│   │   ├── crypto.ts                      AES-GCM-256 encrypt/decrypt (INTEGRATION_TOKEN_KEK)
│   │   └── providers/                     twitter, linkedin, instagram, threads, facebook, youtube, tiktok
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

## Integrations OAuth flow

```
   ┌──────────┐                  ┌─────────────────────────┐
   │ Connect  │ ───POST {platform} ─→ POST /api/integrations/connect
   └──────────┘                     │
                                    │ getOAuthProvider(p) — 503 if env missing
                                    │ createOAuthState(HMAC over BETTER_AUTH_SECRET, 10-min TTL)
                                    │ if PKCE: createPkcePair + Set-Cookie bs_pkce_<hash(state)>
                                    ↓
                                    returns { url: provider authorization URL }
                                    ↓
        browser → window.location.href = url
                                    ↓
                              Provider (Twitter / LinkedIn / IG / etc.)
                                    ↓
                                    user approves
                                    ↓
                              GET /api/integrations/callback?code=…&state=…
                                    │
                                    │ verifyOAuthState (HMAC, exp check, platform whitelist)
                                    │ session.user.id === state.userId
                                    │ if PKCE: read verifier cookie keyed by getPkceCookieName(state)
                                    │ provider.exchangeCodeForToken
                                    │ provider.getProfile
                                    │ AES-GCM encrypt access_token + refresh_token
                                    │ db.insert(integrations).onConflictDoUpdate([userId, platform])
                                    ↓
                              302 /dashboard/integrations?connected=true&platform=…
                              <CallbackToastBanner /> reads params → toast + strips query
```

### Disconnect (soft)
```
POST /api/integrations/disconnect { integrationId }
  → UPDATE integrations SET access_token=null, refresh_token=null, status='revoked'
  WHERE id=? AND user_id=?
```
The row is preserved (history, audit). Scheduled posts referencing it are NOT cascade-deleted — they'll fail at publish time if the integration is still revoked then.

### Security

- **State**: HMAC-SHA256 with `BETTER_AUTH_SECRET`. 10-minute TTL. Random 16-byte nonce. Constant-time signature comparison. State token must split into exactly 2 segments; malformed/oversegmented values rejected.
- **PKCE**: S256 challenge. Verifier in HTTP-only, SameSite=Lax cookie, name derived from `sha256(state)`. Required for Twitter (X); optional/unused for others.
- **Tokens at rest**: AES-GCM-256 with `INTEGRATION_TOKEN_KEK` (32 random bytes, base64). IV is random per-encryption, prepended as `${b64u(iv)}.${b64u(ct)}`. Rotating the KEK invalidates all stored tokens.
- **Cross-account guard**: callback verifies `session.user.id === state.userId` — refuses to attach a token granted to a different account than the one that initiated the flow.
- **Open-redirect defense**: callback's `safeRedirectPath()` allows only `/dashboard/*` paths with no `..`, `\\`, `:`, or `//` prefix. Anything else (including a tampered `state.redirectTo`) falls back to `/dashboard/integrations`.
- **Stored metadata bounding**: `profile.raw` is JSON-bounded to 4 KB before persisting (wraps oversized payloads in `{ _truncated: true, _bytes, head }`).
- **Disconnect**: SELECT-then-UPDATE pattern. The SELECT checks `(id, user_id)` AND verifies the row's `platform` is in the supported enum before mutating. The user-scoping alone already prevents auth bypass; the platform check is defense-in-depth.
- **Misconfiguration**: missing env vars throw `ProviderNotConfiguredError` → 503 with `missing: ["TWITTER_CLIENT_ID", …]`. UI toast surfaces the env-var list verbatim.

### Token refresh

`src/lib/oauth/refresh.ts` exposes `refreshIntegrationTokens(integrationId, userId)` — decrypts the stored refresh token, calls `provider.refreshToken`, re-encrypts, and writes back via a scoped UPDATE. Falls back to the previous refresh token if the provider's response omits one (LinkedIn/Google rotate, Twitter sometimes rotates).

Supported providers (have OAuth 2.0 `refresh_token` grant):
- **Twitter** (with `offline.access` scope)
- **LinkedIn**
- **YouTube** (with `access_type=offline&prompt=consent`)
- **TikTok**

Not supported (no `refresh_token` grant; use long-lived-token exchange instead):
- **Facebook**, **Instagram**, **Threads** — Meta family. Their access tokens are short-lived (~1 hour) from the auth-code exchange; we should be exchanging them for 60-day long-lived tokens before storing. Marked as TODO in the provider files. Implement before the publisher daemon ships.

The `refresh.ts` helper throws `IntegrationNotRefreshableError` if a caller tries to refresh a Meta provider.

### Adding a new platform
1. Add the enum value to `IntegrationTypeEnum` and `integrationPlatforms`; regenerate migration if no prod data, else write an ALTER.
2. Add a brand icon + the 4 metadata records in `src/lib/constants/integrations.tsx`.
3. Implement `src/lib/oauth/providers/<name>.ts` exporting an `OAuthProvider`.
4. Wire it into `getOAuthProvider` (and `ENV_PREFIX` if non-obvious) in `src/lib/oauth/index.ts`.
5. Add `<NAME>_CLIENT_ID/SECRET/AUTH_URL/TOKEN_URL/PROFILE_URL/SCOPES` to `.dev.vars.example` and `env-extra.d.ts`.

## Local development with OAuth providers

Most providers require a public **HTTPS** redirect URI even in development — `http://localhost` is rejected by Twitter, LinkedIn, all of Meta (Facebook / Instagram / Threads), and TikTok. Only Google (YouTube) allows `http://localhost:<port>`.

To test live OAuth flows on a dev machine, expose the local dev server via a tunnel.

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
