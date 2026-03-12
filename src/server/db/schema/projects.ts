import { pgTable, uuid, varchar, text, timestamp, index, uniqueIndex, pgEnum } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { teams } from "./teams";

/**
 * Project visibility enum
 */
export const projectVisibilityEnum = pgEnum('project_visibility', ['public', 'private']);

/**
 * Project status enum
 */
export const projectStatusEnum = pgEnum('project_status', ['active', 'archived']);

/**
 * Projects table - stores UI projects for tracking feedback and issues
 */
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  key: varchar("key", { length: 10 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 255 }),
  visibility: varchar("visibility", { length: 10 }).notNull().default('private'),
  status: varchar("status", { length: 10 }).notNull().default('active'),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  teamIdIdx: index("projects_team_id_idx").on(table.teamId),
  statusIdx: index("projects_status_idx").on(table.status),
  visibilityIdx: index("projects_visibility_idx").on(table.visibility),
  // Composite index for performance
  teamFiltersIdx: index("projects_team_filters_idx").on(table.teamId, table.status, table.visibility),
  // Partial unique indexes (only for non-deleted projects)
  teamKeyUnique: uniqueIndex("projects_team_key_unique").on(table.teamId, table.key).where(sql`deleted_at IS NULL`),
  teamSlugUnique: uniqueIndex("projects_team_slug_unique").on(table.teamId, table.slug).where(sql`deleted_at IS NULL`),
}));
