import { index, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const signupIntents = pgTable("signup_intents", {
  email: varchar("email", { length: 320 }).primaryKey(),
  callbackUrl: varchar("callback_url", { length: 2048 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  expiresIdx: index("signup_intents_expires_idx").on(table.expiresAt),
}));
