/**
 * Script to check pending emails in the queue
 * Run with: bun run scripts/check-email-queue.ts
 */

import { db } from "../src/lib/db";
import { emailJobs } from "../src/server/db/schema/email-jobs";
import { eq, sql } from "drizzle-orm";

async function checkEmailQueue() {
  try {
    console.log("📧 Checking email queue status...\n");

    // Count emails by status
    const statusCounts = await db
      .select({
        status: emailJobs.status,
        count: sql<number>`count(*)::int`,
      })
      .from(emailJobs)
      .groupBy(emailJobs.status);

    console.log("Email Queue Status:");
    console.log("─".repeat(50));

    if (statusCounts.length === 0) {
      console.log("No emails in queue");
    } else {
      statusCounts.forEach((row) => {
        console.log(`  ${row.status.padEnd(15)} : ${row.count}`);
      });
    }

    console.log("\n");

    // Show pending emails
    const pendingEmails = await db
      .select({
        id: emailJobs.id,
        type: emailJobs.type,
        to: emailJobs.to,
        attempts: emailJobs.attempts,
        status: emailJobs.status,
        createdAt: emailJobs.createdAt,
        lastError: emailJobs.lastError,
      })
      .from(emailJobs)
      .where(eq(emailJobs.status, "pending"))
      .orderBy(emailJobs.createdAt)
      .limit(10);

    if (pendingEmails.length > 0) {
      console.log(`Pending Emails (showing up to 10):`);
      console.log("─".repeat(50));
      pendingEmails.forEach((email, index) => {
        console.log(`\n${index + 1}. ${email.type} email to ${email.to}`);
        console.log(`   ID: ${email.id}`);
        console.log(`   Attempts: ${email.attempts}`);
        console.log(`   Created: ${email.createdAt.toISOString()}`);
        if (email.lastError) {
          console.log(`   Last Error: ${email.lastError}`);
        }
      });
      console.log("\n");
    }

    // Show recent completed/failed emails
    const recentEmails = await db
      .select({
        type: emailJobs.type,
        to: emailJobs.to,
        status: emailJobs.status,
        attempts: emailJobs.attempts,
        updatedAt: emailJobs.updatedAt,
      })
      .from(emailJobs)
      .orderBy(sql`${emailJobs.updatedAt} DESC`)
      .limit(5);

    if (recentEmails.length > 0) {
      console.log("Recent Email Jobs (last 5):");
      console.log("─".repeat(50));
      recentEmails.forEach((email, index) => {
        const statusEmoji =
          email.status === "completed" ? "✅" :
          email.status === "failed" ? "❌" :
          email.status === "processing" ? "⏳" : "⏸️";
        console.log(`${index + 1}. ${statusEmoji} ${email.type} to ${email.to} - ${email.status} (${email.updatedAt.toISOString()})`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("Error checking email queue:", error);
    process.exit(1);
  }
}

checkEmailQueue();
