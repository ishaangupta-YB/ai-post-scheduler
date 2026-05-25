# Broad Sky — Database Schema

Single D1 SQLite database (`aipostsc-auth-db`). 10 tables. All timestamps are `timestamp_ms` with default `unixepoch('subsecond')*1000` and `$onUpdate` for `updated_at` columns.

## ER overview

```
                     ┌───────────┐
                     │   users   │  PK id (text)
                     └─────┬─────┘
                           │
   ┌───────────┬───────────┼────────────────┬──────────────────┬──────────────┐
   ↓           ↓           ↓                ↓                  ↓              ↓
sessions   accounts  verifications  credit_transactions  payment_events    integrations
                                                                              │
                                                                              ↓
                                                                       scheduled_posts
                                                                              ↑
                                                       idea_groups → ideas ──┘

Cascade chains:
  users  ─cascade→ everything (FK onDelete: cascade)
  integrations ─cascade→ scheduled_posts (deleting integration cancels queued posts;
                                          NOTE: soft-disconnect avoids this path)
  idea_groups  ─set null→ ideas.groupId   (deleting a group orphans ideas, doesn't delete them)
  ideas        ─set null→ scheduled_posts.ideaId
```

---

## `users`
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `name` | text | |
| `email` | text NOT NULL UNIQUE | |
| `email_verified` | int (0/1) NOT NULL | |
| `image` | text | |
| `monthly_credit_balance` | int NOT NULL DEFAULT 25 | resets every 30d |
| `topup_credit_balance` | int NOT NULL DEFAULT 0 | lifetime, no expiry |
| `plan_id` | text NULL | "starter" / "creator" / "pro" / null = free |
| `plan_billing_cycle` | text NULL | enum: monthly / annual |
| `plan_status` | text NULL | enum: active / cancelled / past_due / null |
| `plan_period_end` | int NULL | monthly refresh anchor (timestamp_ms) — NOT Dodo's cycle end |
| `dodo_subscription_id` | text NULL | indexed |
| `created_at` / `updated_at` | int NOT NULL | |

Indexes: `email` (unique), `dodo_subscription_id`, `plan_period_end`.

## `sessions`
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `user_id` | text FK→users cascade | indexed |
| `token` | text NOT NULL UNIQUE | session cookie value |
| `expires_at` | int NOT NULL | |
| `ip_address`, `user_agent` | text | |
| `timezone`, `city`, `country`, `region`, `colo`, `latitude`, `longitude` | text | populated from CF context in `databaseHooks.session.create.before` |
| `created_at` / `updated_at` | int NOT NULL | |

Indexes: `token` (unique), `user_id`.

## `accounts`
Stores OAuth provider linkage for Better Auth sign-in (currently Google only).
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `user_id` | text FK→users cascade | indexed |
| `account_id` | text NOT NULL | provider's user id |
| `provider_id` | text NOT NULL | "google" |
| `access_token`, `refresh_token`, `id_token` | text | encrypted by Better Auth (`encryptOAuthTokens: true`) |
| `access_token_expires_at`, `refresh_token_expires_at` | int | |
| `scope`, `password` | text | |
| `created_at` / `updated_at` | int NOT NULL | |

## `verifications`
Email/OTP scratch table used by Better Auth.
| `id` PK, `identifier`, `value`, `expires_at`, timestamps |

---

## `credit_transactions`
Append-only ledger. Every credit mutation writes one row (a balance-split spend writes 2 rows — one per pool).
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `user_id` | text FK→users cascade | |
| `type` | text NOT NULL | enum: `spend` / `topup_purchase` / `monthly_grant` / `monthly_forfeit` / `refund` / `bonus` / `adjustment` |
| `pool` | text NOT NULL | enum: `monthly` / `topup` |
| `amount` | int NOT NULL | signed: positive = credit add, negative = spend |
| `balance_after` | int NOT NULL | the pool's balance after this row |
| `operation` | text | free-form, e.g. `generate-tweet`, `image-edit` |
| `payment_id`, `subscription_id`, `pack_id`, `plan_id` | text | provenance |
| `metadata` | json | provider-specific |
| `created_at` | int NOT NULL | |

Indexes: `(user_id, created_at)` for ledger history, `(user_id)`, `(payment_id)`, `(subscription_id)`.

## `payment_events`
Dodo webhook idempotency log. Insert-or-noop on every event delivery.
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | the Dodo `webhook-id` header value (or event id) |
| `payload` | json | the full event body for audit |
| `received_at` | int NOT NULL | |

A row's existence indicates "we've seen this event" — dispatch happens only on first insert.

---

## `integrations`
Per-user social-network linkage. **Unique** `(user_id, platform)` — one connection per platform per user. Upsert on reconnect. As of session 8 (2026-05-25) the OAuth flow is delegated to **Composio** — the real tokens live on Composio's side; we store only the `connectedAccountId` they hand back.
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | UUID generated by callback |
| `user_id` | text FK→users cascade | indexed |
| `platform` | text NOT NULL | enum: `TWITTER` / `INSTAGRAM` / `THREADS` / `FACEBOOK` / `LINKEDIN` / `YOUTUBE` / `TIKTOK` |
| `handle` | text | display name / username on provider |
| `profile_image`, `profile_url` | text | |
| `access_token`, `refresh_token` | text | **LEGACY** — kept for backward-compat; always null going forward (Composio holds tokens) |
| `token_expires_at` | int | LEGACY — always null going forward |
| `scope` | text | LEGACY — always null going forward |
| `composio_connected_account_id` | text | Composio-hosted `connectedAccountId` (nanoid). Used by `tools.execute()` lookups and by disconnect to call `composio.connectedAccounts.delete()`. Indexed. |
| `metadata` | json | `{ composio: { connectedAccountId, status, toolkitSlug }, providerAccountId?, raw?: {…} }` |
| `status` | text NOT NULL DEFAULT 'active' | enum: `active` / `expired` / `revoked` |
| `connected_at`, `last_sync_at` | int | |
| `created_at` / `updated_at` | int NOT NULL | |

Indexes: `(user_id)`, **UNIQUE** `(user_id, platform)` (leveraged by `onConflictDoUpdate` upsert), `(composio_connected_account_id)`.

**Disconnect semantics:** soft locally + hard on Composio. `POST /api/integrations/disconnect` first calls `composio.connectedAccounts.delete(composio_connected_account_id)` (best-effort, log-and-continue), then sets `status='revoked'` and nulls `access_token` / `refresh_token` / `token_expires_at` / `composio_connected_account_id`. The row persists for history; reconnect upserts back to `active` with a fresh `composio_connected_account_id`.

---

## `idea_groups`
Optional grouping for ideas.
| `id` PK · `user_id` FK→users cascade (indexed) · `name` · timestamps |

## `ideas`
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `user_id` | text FK→users cascade | indexed |
| `group_id` | text FK→idea_groups (set null) | indexed `(user_id, group_id)` |
| `title`, `description` | text | |
| `images`, `tags` | json text[] | stored as JSON strings |
| `sort_order` | int | manual ordering within group |
| `created_at` / `updated_at` | int NOT NULL | |

## `scheduled_posts`
Future cron-driven publisher will pull from this.
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `user_id` | text FK→users cascade | |
| `integration_id` | text FK→integrations cascade | indexed |
| `idea_id` | text FK→ideas (set null) | |
| `content` | text NOT NULL | |
| `images` | json | image asset references |
| `scheduled_at` | int NOT NULL | timestamp_ms — when to publish |
| `timezone` | text | author-display timezone |
| `status` | text NOT NULL DEFAULT 'draft' | enum: `draft` / `queued` / `publishing` / `published` / `failed` / `cancelled` |
| `published_at` | int | |
| `published_url`, `failure_reason` | text | |
| `attempt_count` | int NOT NULL DEFAULT 0 | retry counter |
| `created_at` / `updated_at` | int NOT NULL | |

Indexes: `(user_id, scheduled_at)`, `(status, scheduled_at)` (for the cron query), `(integration_id)`.

---

## Notes

- All FK `onDelete: cascade` from `users.id` — deleting a user wipes their entire data graph.
- JSON columns (`metadata`, `images`, `tags`) are stored as TEXT with `mode: "json"` — Drizzle serializes; query manually with `json_extract()` in raw SQL if needed.
- `unixepoch('subsecond') * 1000` defaults work with D1's SQLite 3.45+; reads come back as `Date` objects via Drizzle's `timestamp_ms` mode.
- No `down` migrations — Drizzle generates forward-only. Local dev wipes `.wrangler/state/v3/d1` when regenerating.
