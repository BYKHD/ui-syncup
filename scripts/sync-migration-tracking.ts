#!/usr/bin/env bun
/**
 * Sync migration tracking table with already-applied migrations
 * Use this when migrations were applied via drizzle-kit migrate (which doesn't track)
 */
import postgres from "postgres";
import * as dotenv from "dotenv";
import { createHash } from "crypto";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

dotenv.config({ path: ".env.local" });

const DIRECT_URL = process.env.DIRECT_URL;

if (!DIRECT_URL) {
  console.error("❌ Error: DIRECT_URL environment variable is not set");
  process.exit(1);
}

// TypeScript type assertion - DIRECT_URL is guaranteed to exist here
const dbUrl: string = DIRECT_URL;

async function syncMigrationTracking() {
  console.log("🔄 Syncing migration tracking table...");

  const client = postgres(dbUrl, { max: 1 });

  try {
    // Read all migration files
    const migrationsDir = "./drizzle";
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith(".sql"))
      .sort();

    console.log(`📦 Found ${files.length} migration files`);

    // Check which tables exist
    const tablesResult = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'sessions', 'verification_tokens', 'user_roles', 'email_jobs')
    `;

    const existingTables = tablesResult.map(r => r.table_name);
    console.log(`📊 Existing tables: ${existingTables.join(", ")}`);

    if (existingTables.length === 0) {
      console.log("✅ No tables exist yet - migrations haven't been applied");
      await client.end();
      process.exit(0);
    }

    // Check current tracking state
    const tracked = await client`
      SELECT hash, created_at 
      FROM drizzle.__drizzle_migrations 
      ORDER BY id
    `;

    console.log(`📝 Currently tracked: ${tracked.length} migrations`);

    if (tracked.length === files.length) {
      console.log("✅ Tracking table is already in sync");
      await client.end();
      process.exit(0);
    }

    // Compute hashes for migration files
    const migrations = files.map((file, idx) => {
      const content = readFileSync(join(migrationsDir, file), "utf-8");
      const hash = createHash("sha256").update(content).digest("hex");
      return {
        idx,
        file,
        hash,
        timestamp: Date.now(),
      };
    });

    // Insert missing migrations into tracking table
    console.log("📝 Inserting migration records...");
    
    for (const migration of migrations) {
      const exists = tracked.find(t => t.hash === migration.hash);
      if (!exists) {
        await client`
          INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
          VALUES (${migration.hash}, ${migration.timestamp})
          ON CONFLICT DO NOTHING
        `;
        console.log(`  ✓ Tracked: ${migration.file}`);
      } else {
        console.log(`  - Already tracked: ${migration.file}`);
      }
    }

    console.log("✅ Migration tracking synced successfully!");
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Sync failed:");
    console.error(error);
    await client.end();
    process.exit(1);
  }
}

syncMigrationTracking();
