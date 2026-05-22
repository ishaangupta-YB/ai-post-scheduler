import { relations, sql } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { users } from "./auth-schema"

export const creditTransactionType = [
  "spend",
  "topup_purchase", // one-time top-up payment landed
  "monthly_grant", // monthly reset grant (initial signup, plan activation, or renewal)
  "monthly_forfeit", // unused monthly credits forfeited at period end
  "refund",
  "bonus",
  "adjustment",
] as const

export type CreditTransactionType = (typeof creditTransactionType)[number]

export const creditPool = ["monthly", "topup"] as const
export type CreditPool = (typeof creditPool)[number]

export const creditTransactions = sqliteTable(
  "credit_transactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", { enum: creditTransactionType }).notNull(),
    // Which pool was affected. A single spend that splits across both pools writes
    // TWO rows (one per pool). Reset writes two rows (forfeit on monthly + grant on monthly).
    pool: text("pool", { enum: creditPool }).notNull(),
    // Positive for grants (topup_purchase / monthly_grant / bonus / refund / adjustment+).
    // Negative for spends and forfeits. Always sums (per pool) to current balance.
    amount: integer("amount").notNull(),
    // Balance of the AFFECTED pool after this entry was applied. Lets callers reconstruct
    // pool-level history without joining against users.
    balanceAfter: integer("balance_after").notNull(),
    description: text("description"),
    // Dodo references
    paymentId: text("payment_id"),
    subscriptionId: text("subscription_id"),
    // For purchases / grants — which plan or topup pack this row corresponds to
    planId: text("plan_id"),
    packId: text("pack_id"),
    // For spends — the AI operation that consumed credits
    operation: text("operation"),
    // Free-form JSON metadata (model used, prompt id, source event id, etc.)
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("credit_transactions_user_id_idx").on(table.userId),
    index("credit_transactions_user_id_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
    index("credit_transactions_payment_id_idx").on(table.paymentId),
    index("credit_transactions_subscription_id_idx").on(table.subscriptionId),
  ],
)

// Webhook idempotency — Dodo retries on non-2xx, so we record processed event IDs and short-circuit duplicates.
export const paymentEvents = sqliteTable("payment_events", {
  eventId: text("event_id").primaryKey(),
  eventType: text("event_type").notNull(),
  payload: text("payload", { mode: "json" }).notNull(),
  processedAt: integer("processed_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
})

export const creditTransactionsRelations = relations(
  creditTransactions,
  ({ one }) => ({
    user: one(users, {
      fields: [creditTransactions.userId],
      references: [users.id],
    }),
  }),
)
