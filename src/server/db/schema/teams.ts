import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid, varchar, integer } from "drizzle-orm/pg-core";

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 50 }).notNull(),
  slug: varchar("slug", { length: 60 }).notNull().unique(),
  description: text("description"),
  image: text("image"),
  planId: varchar("plan_id", { length: 20 }).notNull().default("free"),
  billableSeats: integer("billable_seats").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  slugIdx: index("teams_slug_idx").on(table.slug),
  planIdx: index("teams_plan_idx").on(table.planId),
}));
