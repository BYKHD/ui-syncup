import { sql } from "drizzle-orm";
import { index, pgTable, timestamp, uuid, varchar, uniqueIndex } from "drizzle-orm/pg-core";
import { teams } from "./teams";
import { users } from "./users";

export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  managementRole: varchar("management_role", { length: 20 }), // TEAM_OWNER | TEAM_ADMIN | null
  operationalRole: varchar("operational_role", { length: 20 }).notNull(), // TEAM_EDITOR | TEAM_MEMBER | TEAM_VIEWER
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  invitedBy: uuid("invited_by").references(() => users.id),
}, (table) => ({
  teamUserIdx: uniqueIndex("team_members_team_user_idx").on(table.teamId, table.userId),
  userIdx: index("team_members_user_idx").on(table.userId),
  teamIdx: index("team_members_team_idx").on(table.teamId),
}));
