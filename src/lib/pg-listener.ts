/**
 * PostgreSQL LISTEN Singleton
 *
 * Maintains one persistent, non-pooled Postgres connection on the
 * 'new_notification' channel. Forwards payloads to Redis pub/sub.
 *
 * MUST use DIRECT_URL (not DATABASE_URL) — pgBouncer transaction mode
 * does not support persistent LISTEN connections.
 */
import postgres from "postgres"
import { logger } from "./logger"
import { getRedisPublisher } from "./redis"

const CHANNEL = "new_notification"

interface NotifyPayload {
  id: string
  user_id: string
}

let started = false
let listenerSql: ReturnType<typeof postgres> | null = null

export async function startPgListener(): Promise<void> {
  if (started) return
  started = true

  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL
  if (!connectionString) {
    logger.error("[pg-listener] No database URL configured; LISTEN disabled")
    started = false
    return
  }

  const urlHasSslMode = connectionString.includes("sslmode=")
  const isProduction = process.env.NODE_ENV === "production"
  const sslOption = urlHasSslMode ? undefined : isProduction ? ("require" as const) : false

  listenerSql = postgres(connectionString, {
    max: 1,
    idle_timeout: 0,
    connect_timeout: 10,
    prepare: false,
    ...(sslOption !== undefined && { ssl: sslOption }),
  })

  const redisPublisher = getRedisPublisher()

  try {
    await listenerSql.listen(CHANNEL, (rawPayload: string) => {
      let payload: NotifyPayload
      try {
        payload = JSON.parse(rawPayload) as NotifyPayload
      } catch {
        logger.warn("[pg-listener] malformed JSON payload:", rawPayload)
        return
      }
      if (!payload.user_id) {
        logger.warn("[pg-listener] payload missing user_id:", payload)
        return
      }
      if (redisPublisher) {
        redisPublisher
          .publish(`notifications:${payload.user_id}`, rawPayload)
          .catch((err) => logger.error("[pg-listener] Redis publish error:", err))
      }
    })
    logger.info(`[pg-listener] Listening on channel: ${CHANNEL}`)
  } catch (err) {
    logger.error("[pg-listener] Failed to start LISTEN:", err)
    started = false
    await listenerSql.end().catch(() => {})
    listenerSql = null
  }
}

export async function stopPgListener(): Promise<void> {
  if (listenerSql) {
    await listenerSql.end().catch(() => {})
    listenerSql = null
    started = false
  }
}
