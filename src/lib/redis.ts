import Redis from "ioredis"
import { logger } from "./logger"

let publisher: Redis | null = null
let subscriber: Redis | null = null

function createClient(url: string): Redis {
  const client = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
  })
  client.on("error", (err) => logger.error("[redis] connection error:", err))
  return client
}

export function getRedisPublisher(): Redis | null {
  const url = process.env.REDIS_URL
  if (!url) return null
  if (!publisher) {
    publisher = createClient(url)
    logger.info("[redis] publisher connected")
  }
  return publisher
}

export function getRedisSubscriber(): Redis | null {
  const pub = getRedisPublisher()
  if (!pub) return null
  if (!subscriber) {
    subscriber = pub.duplicate()
    subscriber.on("error", (err) => logger.error("[redis] subscriber error:", err))
    logger.info("[redis] subscriber connected")
  }
  return subscriber
}
