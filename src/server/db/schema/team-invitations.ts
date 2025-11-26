import { sql } from "drizzle-orm";
import { index, pgTable, timestamp, uuid, varchar, uniqueIndex } from "drizzle-orm/pg-core";
import { teams } from "./teams";
import { users } from "./users";

export const teamInvitations = pgTable("team_invitations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  managementRole: varchar("management_role", { length: 20 }), // TEAM_OWNER | TEAM_ADMIN | null
  operationalRole: varchar("operational_role", { length: 20 }).notNull(), // TEAM_EDITOR | TEAM_MEMBER | TEAM_VIEWER
  invitedBy: uuid("invited_by").references(() => users.id).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tokenIdx: uniqueIndex("team_invitations_token_idx").on(table.token),
  teamEmailIdx: index("team_invitations_team_email_idx").on(table.teamId, table.email),
  expiresIdx: index("team_invitations_expires_idx").on(table.expiresAt),
}));
