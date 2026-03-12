/**
 * Script to retry failed emails
 * Run with: bun run scripts/retry-failed-emails.ts
 */

import { db } from "../src/lib/db";
import { emailJobs } from "../src/server/db/schema/email-jobs";
import { eq, sql } from "drizzle-orm";

async function retryFailedEmails() {
  try {
    console.log("🔄 Retrying failed emails...\n");

    // Find all failed emails
    const failedEmails = await db
      .select({
        id: emailJobs.id,
        type: emailJobs.type,
        to: emailJobs.to,
        attempts: emailJobs.attempts,
        lastError: emailJobs.lastError,
        createdAt: emailJobs.createdAt,
      })
      .from(emailJobs)
      .where(eq(emailJobs.status, "failed"));

    if (failedEmails.length === 0) {
      console.log("✅ No failed emails found in the queue.");
      process.exit(0);
    }

    console.log(`Found ${failedEmails.length} failed email(s):\n`);
    failedEmails.forEach((email, index) => {
      console.log(`${index + 1}. ${email.type} to ${email.to}`);
      console.log(`   ID: ${email.id}`);
      console.log(`   Attempts: ${email.attempts}`);
      console.log(`   Created: ${email.createdAt.toISOString()}`);
      if (email.lastError) {
        console.log(`   Last Error: ${email.lastError.substring(0, 100)}...`);
      }
      console.log("");
    });

    // Reset failed emails to pending status and reset attempts
    const result = await db
      .update(emailJobs)
      .set({
        status: "pending",
        attempts: 0,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(emailJobs.status, "failed"))
      .returning({ id: emailJobs.id });

    console.log(`✅ Reset ${result.length} email(s) to pending status.`);
    console.log("\nThe email worker will automatically process them within 30 seconds.");
    console.log("Run 'bun run scripts/check-email-queue.ts' to check the status.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error retrying failed emails:", error);
    process.exit(1);
  }
}

retryFailedEmails();
