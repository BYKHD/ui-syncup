#!/usr/bin/env bun
/**
 * Production-safe migration script
 * Uses Drizzle ORM's migrate() function which tracks applied migrations
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const DIRECT_URL = process.env.DIRECT_URL;

if (!DIRECT_URL) {
  console.error("❌ Error: DIRECT_URL environment variable is not set");
  console.error("Please set DIRECT_URL in your environment or .env.local file");
  process.exit(1);
}

async function runMigrations() {
  console.log("🔄 Starting database migrations...");
  console.log(`📍 Database: ${DIRECT_URL.split("@")[1]?.split("/")[0] || "hidden"}`);
  
  // Create postgres connection for migrations
  const migrationClient = postgres(DIRECT_URL, { max: 1 });
  const db = drizzle(migrationClient);

  try {
    console.log("📦 Applying migrations from ./drizzle folder...");
    
    await migrate(db, { migrationsFolder: "./drizzle" });
    
    console.log("✅ Migrations completed successfully!");
    
    // Close the connection
    await migrationClient.end();
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:");
    console.error(error);
    
    // Close the connection
    await migrationClient.end();
    
    process.exit(1);
  }
}

runMigrations();
