/**
 * Script to manually process the email queue once
 * Run with: bun run scripts/process-email-queue.ts
 */

import { processEmailQueue } from "../src/server/email/queue";
import { logger } from "../src/lib/logger";

async function processQueue() {
  try {
    console.log("🚀 Processing email queue...\n");

    // Process the queue once
    const processed = await processEmailQueue();

    console.log(`\n✅ Processed ${processed} email(s).`);
    console.log("\nRun 'bun run scripts/check-email-queue.ts' to check the updated status.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error processing email queue:", error);
    process.exit(1);
  }
}

processQueue();
