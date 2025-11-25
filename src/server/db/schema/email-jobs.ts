import { sql } from "drizzle-orm";
import { integer, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";
import { verificationTokens } from "./verification-tokens";

export const emailJobs = pgTable("email_jobs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  tokenId: uuid("token_id").references(() => verificationTokens.id, { onDelete: "set null" }),
  type: varchar("type", { length: 50 }).notNull(), // 'verification' | 'password_reset' | 'welcome' | 'security_alert'
  to: varchar("to", { length: 320 }).notNull(),
  subject: text("subject").notNull(),
  template: varchar("template", { length: 100 }).notNull(),
  data: jsonb("data").notNull(),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'processing', 'completed', 'failed'
  lastError: text("last_error"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
