import { pgTable, uuid, varchar, timestamp, index, uniqueIndex, pgEnum } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { users } from "./users";

/**
 * Project role enum
 */
export const projectRoleEnum = pgEnum('project_role', ['owner', 'editor', 'member', 'viewer']);

/**
 * Project members table - stores project membership with roles
 */
export const projectMembers = pgTable("project_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 50 }).notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  projectIdIdx: index("project_members_project_id_idx").on(table.projectId),
  userIdIdx: index("project_members_user_id_idx").on(table.userId),
  projectUserUnique: uniqueIndex("project_members_project_user_unique").on(table.projectId, table.userId),
}));
