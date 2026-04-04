import { sql } from "drizzle-orm";
import { pgTable, uuid, varchar, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";
import { teams } from "./teams";

/**
 * Instance Settings Table
 * 
 * Singleton table storing instance-level configuration for self-hosted deployments.
 * Only one row should exist in this table (enforced by singleton index).
 */
export const instanceSettings = pgTable("instance_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  /** Display name for the instance (shown in UI) */
  instanceName: varchar("instance_name", { length: 100 }).notNull().default("UI SyncUp"),
  
  /** Default workspace ID for single-workspace mode */
  defaultWorkspaceId: uuid("default_workspace_id").references(() => teams.id, { onDelete: "set null" }),
  
  /** Default role for new users in single-team mode */
  defaultMemberRole: varchar("default_member_role", { length: 50 }).notNull().default("TEAM_MEMBER"),
  
  /** Timestamp when setup was completed; NULL means setup is required */
  setupCompletedAt: timestamp("setup_completed_at", { withTimezone: true }),
  
  /** User ID of the admin who completed setup */
  adminUserId: uuid("admin_user_id").references(() => users.id, { onDelete: "set null" }),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
// eslint-disable-next-line @typescript-eslint/no-unused-vars
}, (_table) => ({
  // Singleton constraint: ensures only one row can exist
  singletonIdx: uniqueIndex("instance_settings_singleton").on(sql`(TRUE)`),
}));

/**
 * Type for instance settings record
 */
export type InstanceSettings = typeof instanceSettings.$inferSelect;
export type NewInstanceSettings = typeof instanceSettings.$inferInsert;
