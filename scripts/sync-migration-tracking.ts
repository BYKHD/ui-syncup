#!/usr/bin/env bun
/**
 * Sync migration tracking table with already-applied migrations.
 *
 * Use this when migrations were applied via drizzle-kit push / direct SQL
 * (which don't update drizzle.__drizzle_migrations), causing migrate() to
 * try re-running migrations that are already present in the schema.
 *
 * For each migration file the script checks whether its effects are already
 * present in the database before inserting a tracking record.  This means:
 *   - Migrations whose schema changes are present   → marked as applied
 *   - Migrations whose schema changes are NOT present → left pending
 *
 * Running `bun run migrate` after this script will apply only the pending ones.
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

const dbUrl: string = DIRECT_URL;

// ============================================================================
// Per-migration applied-state detectors
//
// Add an entry here whenever a new migration is created.
//
// Return true  → migration has already been applied (mark as tracked, skip)
// Return false → migration has NOT been applied yet (leave pending for migrate())
// ============================================================================

type AppliedChecker = (client: postgres.Sql) => Promise<boolean>;

const MIGRATION_APPLIED_CHECKS: Record<string, AppliedChecker> = {
  "0000_safe_machine_man.sql": async (client) => {
    const [row] = await client`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      ) AS applied
    `;
    return row.applied as boolean;
  },

  "0001_drop_user_roles.sql": async (client) => {
    // Applied when user_roles no longer exists
    const [row] = await client`
      SELECT NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_roles'
      ) AS applied
    `;
    return row.applied as boolean;
  },
};

// ============================================================================
// Main
// ============================================================================

async function syncMigrationTracking() {
  console.log("🔄 Syncing migration tracking table...");

  const client = postgres(dbUrl, { max: 1 });

  try {
    const migrationsDir = "./drizzle";
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    console.log(`📦 Found ${files.length} migration file(s)`);

    // Ensure the drizzle tracking schema/table exists
    await client`CREATE SCHEMA IF NOT EXISTS drizzle`;
    await client`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id        serial  PRIMARY KEY,
        hash      text    NOT NULL,
        created_at bigint
      )
    `;

    // Load currently tracked hashes
    const tracked = await client`
      SELECT hash FROM drizzle.__drizzle_migrations ORDER BY id
    `;
    const trackedHashes = new Set(tracked.map((r) => r.hash as string));
    console.log(`📝 Currently tracked: ${trackedHashes.size} migration(s)`);

    let synced = 0;
    let skipped = 0;
    let pending = 0;

    for (const file of files) {
      const content = readFileSync(join(migrationsDir, file), "utf-8");
      const hash = createHash("sha256").update(content).digest("hex");

      if (trackedHashes.has(hash)) {
        console.log(`  - Already tracked: ${file}`);
        skipped++;
        continue;
      }

      // Determine whether this migration's effects are already in the DB
      const checker = MIGRATION_APPLIED_CHECKS[file];
      if (!checker) {
        console.warn(`  ⚠️  No applied-check defined for ${file} — leaving as pending`);
        pending++;
        continue;
      }

      const alreadyApplied = await checker(client);

      if (alreadyApplied) {
        await client`
          INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
          VALUES (${hash}, ${Date.now()})
          ON CONFLICT DO NOTHING
        `;
        console.log(`  ✓ Marked as applied: ${file}`);
        synced++;
      } else {
        console.log(`  ⏳ Pending (not yet applied): ${file}`);
        pending++;
      }
    }

    console.log("\n✅ Sync complete:");
    console.log(`   Already tracked : ${skipped}`);
    console.log(`   Newly synced     : ${synced}`);
    console.log(`   Pending (will run on next migrate): ${pending}`);

    if (pending > 0) {
      console.log("\n   Run 'bun run migrate' to apply the pending migration(s).");
    }

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Sync failed:", error);
    await client.end();
    process.exit(1);
  }
}

syncMigrationTracking();
