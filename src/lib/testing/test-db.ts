import fs from "fs"
import path from "path"
import { randomUUID } from "crypto"

import { sql } from "drizzle-orm"
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import { newDb, DataType, type IMemoryDb } from "pg-mem"

import * as schema from "@/server/db/schema"

type TestDbContext = {
  db: NodePgDatabase<typeof schema>
  resetDatabase: () => Promise<void>
  closeDatabase: () => Promise<void>
}

/**
 * Run all drizzle SQL migrations inside the in-memory database.
 */
function applyMigrations(memoryDb: IMemoryDb) {
  const migrationsDir = path.resolve(process.cwd(), "drizzle")
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()

  for (const file of migrationFiles) {
    const sqlText = fs.readFileSync(path.join(migrationsDir, file), "utf8")
    memoryDb.public.none(sqlText)
  }
}

/**
 * Create an in-memory Postgres instance (pg-mem) wired up to Drizzle.
 * This lets tests run without a real Postgres service while keeping the
 * same schema and constraints.
 */
export function createTestDb(): TestDbContext {
  const memoryDb = newDb({ autoCreateForeignKeyIndices: true })

  // Functions used by the schema defaults
  memoryDb.public.registerFunction({
    name: "gen_random_uuid",
    returns: DataType.uuid,
    implementation: randomUUID,
    impure: true,
  })
  memoryDb.public.registerFunction({
    name: "now",
    returns: DataType.timestamp,
    implementation: () => new Date(),
    impure: true,
  })

  applyMigrations(memoryDb)

  const pg = memoryDb.adapters.createPg()
  const pool = new pg.Pool()
  const originalQuery = pool.query.bind(pool)

  // pg-mem doesn't support pg's custom type parsers or rowMode,
  // so strip those options and simulate array mode when requested.
  pool.query = ((queryText: unknown, params?: unknown) => {
    let expectArrayResult = false
    let patchedQuery = queryText

    if (typeof queryText === "object" && queryText !== null) {
      const q = { ...(queryText as Record<string, unknown>) }

      if ("types" in q) {
        delete q.types
      }

      if ("rowMode" in q) {
        expectArrayResult = q.rowMode === "array"
        delete q.rowMode
      }

      patchedQuery = q
    }

    const result = originalQuery(patchedQuery as never, params as never)

    if (expectArrayResult && typeof result?.then === "function") {
      return (result as Promise<{ rows: unknown[]; [key: string]: unknown }>).then((res) => ({
        ...res,
        rows: res.rows.map((row: unknown) =>
          Array.isArray(row) ? row : Object.values(row as Record<string, unknown>)
        ),
      }))
    }

    return result
  }) as typeof pool.query

  const db = drizzle(pool, { schema })

  const resetDatabase = async () => {
    const tables = [
      "email_jobs",
      "user_roles",
      "verification_tokens",
      "sessions",
      "account",
      "team_invitations",
      "team_members",
      "teams",
      "projects",
      "users",
    ]

    for (const table of tables) {
      await db.execute(sql.raw(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`))
    }
  }

  const closeDatabase = async () => {
    await pool.end()
  }

  return { db, resetDatabase, closeDatabase }
}
