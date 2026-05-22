import { relations, sql } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { users } from "./auth-schema"

export const creditTransactionType = [
  "purchase",
  "spend",
  "refund",
  "bonus",
  "adjustment",
] as const

export type CreditTransactionType = (typeof creditTransactionType)[number]

export const creditTransactions = sqliteTable(
  "credit_transactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", { enum: creditTransactionType }).notNull(),
    // Positive for grants (purchase/bonus/refund), negative for spends/adjustments. Always sums to current balance.
    amount: integer("amount").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    description: text("description"),
    // For purchases — Dodo Payments references
    paymentId: text("payment_id"),
    packId: text("pack_id"),
    // For spends — the AI operation that consumed credits
    operation: text("operation"),
    // Free-form JSON metadata (model used, prompt id, etc.)
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("credit_transactions_user_id_idx").on(table.userId),
    index("credit_transactions_payment_id_idx").on(table.paymentId),
    index("credit_transactions_created_at_idx").on(table.createdAt),
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
