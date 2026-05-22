import { relations, sql } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { users } from "./auth-schema"
import { integrations } from "./integrations-schema"

export const scheduledPostStatus = [
  "draft",
  "queued",
  "publishing",
  "published",
  "failed",
  "cancelled",
] as const
export type ScheduledPostStatus = (typeof scheduledPostStatus)[number]

// ── Idea groups ──────────────────────────────────────────────────────────────
// Optional folders to organize ideas. Ideas can also exist without a group.

export const ideaGroups = sqliteTable(
  "idea_groups",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("idea_groups_user_id_idx").on(table.userId)],
)

// ── Ideas ────────────────────────────────────────────────────────────────────
// Captured raw thoughts before drafting. images/tags stored as JSON string[].

export const ideas = sqliteTable(
  "ideas",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Deleting a group leaves its ideas behind (orphaned, ungrouped).
    groupId: text("group_id").references(() => ideaGroups.id, {
      onDelete: "set null",
    }),
    title: text("title"),
    description: text("description"),
    images: text("images", { mode: "json" }).$type<string[]>(),
    tags: text("tags", { mode: "json" }).$type<string[]>(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("ideas_user_id_idx").on(table.userId),
    index("ideas_user_id_group_id_idx").on(table.userId, table.groupId),
  ],
)

// ── Scheduled posts ──────────────────────────────────────────────────────────
// One row per (post × target integration). A cross-posting batch of N targets
// writes N rows. The cron-driven publisher worker (not yet built) range-scans
// (status, scheduledAt) to find dispatch candidates.

export const scheduledPosts = sqliteTable(
  "scheduled_posts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    integrationId: text("integration_id")
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
    // Optional back-link to the originating idea; deleting the idea preserves the post.
    ideaId: text("idea_id").references(() => ideas.id, {
      onDelete: "set null",
    }),
    content: text("content").notNull(),
    images: text("images", { mode: "json" }).$type<string[]>(),
    scheduledAt: integer("scheduled_at", { mode: "timestamp_ms" }).notNull(),
    // IANA tz id (e.g., 'America/New_York'). Stored alongside scheduledAt so the
    // user-visible "9 AM Monday" displays consistently across DST.
    timezone: text("timezone").notNull(),
    status: text("status", { enum: scheduledPostStatus })
      .notNull()
      .default("queued"),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    publishedUrl: text("published_url"),
    failureReason: text("failure_reason"),
    attemptCount: integer("attempt_count").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("scheduled_posts_user_id_scheduled_at_idx").on(
      table.userId,
      table.scheduledAt,
    ),
    // Worker dispatch index: SELECT WHERE status='queued' AND scheduled_at <= now ORDER BY scheduled_at
    index("scheduled_posts_status_scheduled_at_idx").on(
      table.status,
      table.scheduledAt,
    ),
    index("scheduled_posts_integration_id_idx").on(table.integrationId),
  ],
)

// ── Relations ────────────────────────────────────────────────────────────────

export const ideaGroupsRelations = relations(ideaGroups, ({ one, many }) => ({
  user: one(users, { fields: [ideaGroups.userId], references: [users.id] }),
  ideas: many(ideas),
}))

export const ideasRelations = relations(ideas, ({ one, many }) => ({
  user: one(users, { fields: [ideas.userId], references: [users.id] }),
  group: one(ideaGroups, {
    fields: [ideas.groupId],
    references: [ideaGroups.id],
  }),
  scheduledPosts: many(scheduledPosts),
}))

export const scheduledPostsRelations = relations(scheduledPosts, ({ one }) => ({
  user: one(users, {
    fields: [scheduledPosts.userId],
    references: [users.id],
  }),
  integration: one(integrations, {
    fields: [scheduledPosts.integrationId],
    references: [integrations.id],
  }),
  idea: one(ideas, {
    fields: [scheduledPosts.ideaId],
    references: [ideas.id],
  }),
}))
