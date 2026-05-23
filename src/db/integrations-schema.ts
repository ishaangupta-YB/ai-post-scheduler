import { relations, sql } from "drizzle-orm"
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

import { users } from "./auth-schema"

// Supported social networks. Keep aligned with IntegrationTypeEnum in
// src/lib/constants/integrations.tsx — the constants file is the user-facing
// taxonomy; this enum is the DB-level enforcement.
export const integrationPlatforms = [
  "TWITTER",
  "INSTAGRAM",
  "THREADS",
  "FACEBOOK",
  "LINKEDIN",
  "YOUTUBE",
  "TIKTOK",
] as const
export type IntegrationPlatform = (typeof integrationPlatforms)[number]

export const integrationStatus = ["active", "expired", "revoked"] as const
export type IntegrationStatus = (typeof integrationStatus)[number]

export const integrations = sqliteTable(
  "integrations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    platform: text("platform", { enum: integrationPlatforms }).notNull(),
    handle: text("handle"),
    profileImage: text("profile_image"),
    profileUrl: text("profile_url"),
    // OAuth credentials. Stored as plaintext today; before any real OAuth ships,
    // wrap in envelope-encryption (AES-GCM with a KEK in Workers Secrets).
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: integer("token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    // Platform-specific data (e.g., LinkedIn organization IDs, Instagram business account ID).
    metadata: text("metadata", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
    status: text("status", { enum: integrationStatus })
      .notNull()
      .default("active"),
    connectedAt: integer("connected_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    lastSyncAt: integer("last_sync_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("integrations_user_id_idx").on(table.userId),
    // One connection per platform per user. To allow multiple Twitter accounts later,
    // drop this index in a migration and update sidebar / picker UI accordingly.
    uniqueIndex("integrations_user_id_platform_unique").on(
      table.userId,
      table.platform,
    ),
  ],
)

export const integrationsRelations = relations(integrations, ({ one }) => ({
  user: one(users, {
    fields: [integrations.userId],
    references: [users.id],
  }),
}))
