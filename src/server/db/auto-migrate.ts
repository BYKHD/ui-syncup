import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import path from 'path'

/**
 * Runs pending Drizzle migrations on app startup.
 * Safe to call on every boot — no-op when the schema is already up to date.
 * Uses DIRECT_URL (not pooled DATABASE_URL) as required by Drizzle's migrator.
 */
export async function autoMigrate(): Promise<void> {
  const directUrl = process.env.DIRECT_URL

  if (!directUrl) {
    console.warn('[db] autoMigrate: DIRECT_URL is not set — skipping migrations')
    return
  }

  const client = postgres(directUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
  })

  try {
    const db = drizzle(client)
    const migrationsFolder = path.join(process.cwd(), 'drizzle')

    console.log('[db] Checking for pending migrations...')
    await migrate(db, { migrationsFolder })
    console.log('[db] Migrations up to date')
  } catch (error) {
    console.error('[db] Migration failed:', error)
    throw error
  } finally {
    await client.end()
  }
}
