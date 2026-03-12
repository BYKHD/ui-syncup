#!/usr/bin/env bun
// scripts/admin-reset-password.ts

/**
 * CLI Script: Admin Password Reset
 * 
 * Usage: bun run admin:reset-password <email>
 * 
 * This script generates a new temporary password for a user.
 * Useful for self-hosted instances without email configuration.
 */

import { db } from "@/lib/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/server/auth/password";
import { randomBytes } from "crypto";

const TEMP_PASSWORD_LENGTH = 16;

async function resetPassword(email: string): Promise<void> {
  console.log("");
  console.log("🔐 Admin Password Reset");
  console.log("========================");
  console.log("");

  // Validate email argument
  if (!email || !email.includes("@")) {
    console.error("❌ Error: Invalid email address");
    console.error("");
    console.error("Usage: bun run admin:reset-password <email>");
    process.exit(1);
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Find user by email
  console.log(`Looking up user: ${normalizedEmail}`);
  
  const user = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
    columns: {
      id: true,
      email: true,
      name: true,
    },
  });

  if (!user) {
    console.error("");
    console.error(`❌ Error: User with email "${normalizedEmail}" not found`);
    console.error("");
    console.error("Please check the email address and try again.");
    process.exit(1);
  }

  console.log(`Found user: ${user.name || "(no name)"} (ID: ${user.id})`);

  // Generate temporary password
  const tempPassword = randomBytes(TEMP_PASSWORD_LENGTH)
    .toString("base64url")
    .slice(0, TEMP_PASSWORD_LENGTH);

  // Hash password
  console.log("Generating new password...");
  const hashedPassword = await hashPassword(tempPassword);

  // Update user password
  await db.update(users)
    .set({
      passwordHash: hashedPassword,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  // Output success
  console.log("");
  console.log("✅ Password reset successfully!");
  console.log("");
  console.log("┌──────────────────────────────────────────────────────┐");
  console.log("│                                                      │");
  console.log(`│  Temporary Password: ${tempPassword.padEnd(32)} │`);
  console.log("│                                                      │");
  console.log("└──────────────────────────────────────────────────────┘");
  console.log("");
  console.log("⚠️  Please change this password after signing in.");
  console.log("⚠️  This password was only displayed once and is not stored.");
  console.log("");
}

// Main execution
const email = process.argv[2];

if (!email) {
  console.error("");
  console.error("Admin Password Reset Tool");
  console.error("=========================");
  console.error("");
  console.error("Usage: bun run admin:reset-password <email>");
  console.error("");
  console.error("Example:");
  console.error("  bun run admin:reset-password admin@example.com");
  console.error("");
  process.exit(1);
}

resetPassword(email)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("");
    console.error("❌ Error:", error.message);
    console.error("");
    process.exit(1);
  });
