/**
 * SSE Notification Stream
 * GET /api/notifications/stream
 *
 * Streams server-sent events to authenticated browser clients.
 * Events are sourced from Redis pub/sub (fan-out from pg-listener).
 *
 * SSE events:
 *   connected    — emitted on open, confirms user is subscribed
 *   notification — emitted when a new notification arrives
 *   heartbeat    — emitted every 30s to prevent proxy timeouts
 */
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/server/auth/session"
import { getRedisSubscriber } from "@/lib/redis"
import { startPgListener } from "@/lib/pg-listener"
import { logger } from "@/lib/logger"

// Start the pg LISTEN connection once per Node.js process/worker.
// In Next.js App Router, this runs when the route module is first loaded.
void startPgListener()

const HEARTBEAT_MS = 30_000

function sse(event: string, data: string, id?: string): string {
  return `${id ? `id: ${id}\n` : ""}event: ${event}\ndata: ${data}\n\n`
}

export async function GET(request: NextRequest): Promise<Response> {
  const user = await getSession()
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    )
  }

  const userId = user.id
  const redisSub = getRedisSubscriber()

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      const send = (event: string, data: string, id?: string) => {
        try { controller.enqueue(enc.encode(sse(event, data, id))) } catch { /* closed */ }
      }

      send("connected", JSON.stringify({ userId }))

      const channel = `notifications:${userId}`

      function onMessage(ch: string, msg: string) {
        if (ch !== channel) return
        try {
          const p = JSON.parse(msg) as { id?: string }
          send("notification", msg, p.id)
        } catch {
          logger.warn("[sse] malformed Redis message:", msg)
        }
      }

      if (redisSub) {
        redisSub.on("message", onMessage)
        await redisSub.subscribe(channel).catch((e) =>
          logger.error("[sse] Redis subscribe error:", e)
        )
      } else {
        logger.warn("[sse] Redis not configured — push events disabled for userId:", userId)
      }

      const heartbeat = setInterval(() => {
        send("heartbeat", `{"ts":${Date.now()}}`)
      }, HEARTBEAT_MS)

      function cleanup() {
        clearInterval(heartbeat)
        if (redisSub) {
          redisSub.removeListener("message", onMessage)
          redisSub.unsubscribe(channel).catch(() => {})
        }
        try { controller.close() } catch { /* already closed */ }
        logger.info(`[sse] disconnected: userId=${userId}`)
      }

      request.signal.addEventListener("abort", cleanup, { once: true })
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
