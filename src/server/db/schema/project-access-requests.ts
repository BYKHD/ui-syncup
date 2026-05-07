/**
 * Project Access Requests Schema
 *
 * Stores user-initiated requests to join a project. Differs from
 * `project_invitations`: requests are receiver-initiated (no token, no email
 * indirection — uses `requesterUserId` directly).
 */

import { sql } from "drizzle-orm";
import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { users } from "./users";

export const projectAccessRequests = pgTable("project_access_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  requesterUserId: uuid("requester_user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  message: varchar("message", { length: 500 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
    // pending | approved | declined | superseded | cancelled
  decidedByUserId: uuid("decided_by_user_id").references(() => users.id),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  declineCooldownUntil: timestamp("decline_cooldown_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // At most one pending request per (project, user). Race-safe under concurrent
  // POSTs: a 23505 against this index means a duplicate request is in flight.
  // Mirrors project_invitations.activeInvitationUniqueIdx.
  pendingUniqueIdx: uniqueIndex("project_access_requests_pending_unique_idx")
    .on(table.projectId, table.requesterUserId)
    .where(sql`${table.status} = 'pending'`),
  projectStatusIdx: index("project_access_requests_project_status_idx")
    .on(table.projectId, table.status),
  requesterIdx: index("project_access_requests_requester_idx").on(table.requesterUserId),
}));

export type ProjectAccessRequestRow = typeof projectAccessRequests.$inferSelect;
export type NewProjectAccessRequestRow = typeof projectAccessRequests.$inferInsert;
