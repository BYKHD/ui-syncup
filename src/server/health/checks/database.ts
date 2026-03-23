import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import type { CheckResult } from '../types'

export async function checkDatabase(): Promise<CheckResult> {
  const start = performance.now()

  try {
    await db.execute(sql`SELECT NOW()`)
    const latencyMs = Math.round(performance.now() - start)

    // Read the highest applied migration index from Drizzle's migrations table
    let migrationVersion = 'unknown'
    try {
      const rows = await db.execute(
        sql`SELECT id FROM drizzle.__drizzle_migrations ORDER BY id DESC LIMIT 1`
      )
      const row = rows[0] as { id: number } | undefined
      if (row) migrationVersion = String(row.id)
    } catch {
      // Fresh DB before first migrate — no migrations table yet
    }

    return {
      status: 'ok',
      message: 'Database connected',
      latencyMs,
      detail: { migrationVersion },
    }
  } catch (error) {
    const latencyMs = Math.round(performance.now() - start)
    const message = error instanceof Error ? error.message : 'Unknown database error'
    return {
      status: 'error',
      message,
      latencyMs,
      hint: 'Check DATABASE_URL environment variable and ensure the database is running',
    }
  }
}
