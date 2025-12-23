/**
 * Project Invitations Schema
 * 
 * Stores invitations for users to join projects with specific roles.
 * Similar to team invitations but scoped to individual projects.
 */

import { sql } from "drizzle-orm";
import { index, pgTable, timestamp, uuid, varchar, uniqueIndex } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { users } from "./users";

export const projectInvitations = pgTable("project_invitations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(), // SHA-256 hash of token (64 hex chars)
  role: varchar("role", { length: 20 }).notNull(), // PROJECT_EDITOR | PROJECT_DEVELOPER | PROJECT_VIEWER
  invitedBy: uuid("invited_by").references(() => users.id).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tokenHashIdx: uniqueIndex("project_invitations_token_hash_idx").on(table.tokenHash),
  projectEmailIdx: index("project_invitations_project_email_idx").on(table.projectId, table.email),
  expiresIdx: index("project_invitations_expires_idx").on(table.expiresAt),
}));
