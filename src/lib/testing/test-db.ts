import fs from "fs"
import path from "path"
import { PGlite } from "@electric-sql/pglite"
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite"
import * as schema from "@/server/db/schema"

type TestDbContext = {
  db: PgliteDatabase<typeof schema>
  resetDatabase: () => Promise<void>
  closeDatabase: () => Promise<void>
}

/**
 * Run all drizzle SQL migrations inside the PGlite database.
 */
async function applyMigrations(client: PGlite) {
  const migrationsDir = path.resolve(process.cwd(), "drizzle")
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()

  for (const file of migrationFiles) {
    const sqlText = fs.readFileSync(path.join(migrationsDir, file), "utf8")
    await client.exec(sqlText)
  }
}

/**
 * Create a PGlite instance wired up to Drizzle.
 * This lets tests run with a real (WASM-based) Postgres engine.
 */
export async function createTestDb(): Promise<TestDbContext> {
  const client = new PGlite()
  
  // Wait for the database to be ready
  await client.waitReady

  // Apply migrations
  await applyMigrations(client)

  const db = drizzle(client, { schema })

  const resetDatabase = async () => {
    const tables = [
      "email_jobs",
      "verification_tokens",
      "sessions",
      "account",
      "team_invitations",
      "team_members",
      "teams",
      "projects",
      "users",
    ]

    // Truncate all tables
    for (const table of tables) {
      await client.exec(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`)
    }
  }

  const closeDatabase = async () => {
    await client.close()
  }

  return { db, resetDatabase, closeDatabase }
}
