/**
 * Database Client Configuration
 * 
 * Provides a configured Drizzle ORM client for PostgreSQL (Supabase)
 * with environment-specific SSL settings and connection pooling.
 * 
 * @module lib/db
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env, isProduction } from './env'
import * as schema from '@/server/db/schema'

/**
 * PostgreSQL connection configuration
 * 
 * - Uses pooled connection string from DATABASE_URL
 * - Enables SSL in production for secure connections
 * - Configures connection pool size (max 10 connections)
 * - Sets idle timeout to prevent stale connections
 */
const connectionString = env.DATABASE_URL
// Respect explicit sslmode in the connection string; fall back to requiring SSL
// in production only when no sslmode param is present (e.g. plain docker postgres
// deployments that don't have SSL configured will pass sslmode=disable).
const urlHasSslMode = connectionString.includes('sslmode=')
const sslOption = urlHasSslMode ? undefined : (isProduction() ? 'require' : false)

const connectionOptions = {
  // SSL configuration: defer to sslmode in URL when present, else env-based default
  ...(sslOption !== undefined && { ssl: sslOption }),
  
  // Connection pool settings
  max: 10, // Maximum number of connections in pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds
  
  // Prepared statements for better performance
  prepare: true,
} as const

export { connectionString, connectionOptions }

/**
 * Create postgres client with environment-specific configuration
 * 
 * Production:
 * - SSL required for secure connections to Supabase
 * - Connection pooling enabled
 * 
 * Development:
 * - SSL disabled for local PostgreSQL
 * - Connection pooling enabled
 */
const client = postgres(connectionString, connectionOptions)
export const dbClient = client

/**
 * Drizzle ORM database instance
 * 
 * Provides type-safe database queries with the Drizzle ORM.
 * Import this instance to perform database operations throughout the application.
 * 
 * @example
 * ```ts
 * import { db } from '@/lib/db'
 * 
 * // Query users
 * const users = await db.select().from(usersTable)
 * 
 * // Insert a record
 * await db.insert(usersTable).values({ name: 'John', email: 'john@example.com' })
 * ```
 */
export const db = drizzle(client, { schema })

/**
 * Close database connection
 * 
 * Gracefully closes the database connection pool.
 * Should be called during application shutdown.
 * 
 * @example
 * ```ts
 * process.on('SIGTERM', async () => {
 *   await closeDatabase()
 *   process.exit(0)
 * })
 * ```
 */
export async function closeDatabase() {
  await client.end()
}
