# LISTEN/NOTIFY + SSE Realtime Notifications Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Supabase Realtime with native PostgreSQL LISTEN/NOTIFY + Server-Sent Events so realtime push notifications work on any Postgres deployment (Docker, Coolify, Dokploy) without Supabase.

**Architecture:**
```
Postgres trigger (AFTER INSERT on notifications)
  → pg_notify('new_notification', '{"id":"...","user_id":"..."}')
  → Node.js LISTEN singleton (direct non-pooled connection via DIRECT_URL)
  → Redis pub/sub (cross-process fan-out, ioredis already in package.json)
  → SSE route /api/notifications/stream (App Router, authenticated)
  → Browser EventSource (replaces Supabase realtime channel)
```

**Tech Stack:** postgres.js `.listen()`, ioredis pub/sub, Next.js App Router ReadableStream, Postgres plpgsql trigger

---

## Critical Facts

- `use-notification-toast.ts` does NOT use `onNewNotification` — it watches React Query cache directly. Toast behavior is unchanged.
- Migration idx: 3, next `when`: `1769004396770`
- PGlite (test runner) does not support `pg_notify` — use `EXCEPTION WHEN OTHERS THEN NULL` in trigger body.
- No Redis client singleton exists yet — must be created.
- `getSession()` from `src/server/auth/session.ts` is the auth pattern for all API routes.
- SSE route uses `ReadableStream` + `Response` (App Router), NOT `res.write()`.
- `onNewNotification` callback type changes from `(notification: Notification)` to `(notification: Partial<Notification> & { id: string })` — safe because toast hook ignores it.

---

## Phase 1 — Environment

### Task 1: Add REDIS_URL to env schema

**Files:**
- Modify: `src/lib/env.ts` (after DIRECT_URL, before Supabase comment block)

**Step 1: Add REDIS_URL field**
```typescript
// Redis (optional — enables SSE push notifications; falls back to polling)
REDIS_URL: optionalString().describe(
  "Redis connection URL (enables SSE push notifications)"
),
```

**Step 2: Verify no TS errors**
Run: `bun run typecheck`
Expected: no new errors

**Step 3: Commit**
```bash
git add src/lib/env.ts
git commit -m "feat(env): add optional REDIS_URL to env schema"
```

---

## Phase 2 — Redis Client Singleton

### Task 2: Redis client

**Files:**
- Create: `src/lib/redis.ts`
- Create: `src/lib/__tests__/redis.test.ts`

**Step 1: Write the failing test**

`src/lib/__tests__/redis.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => {
  const mockPub = {
    publish: vi.fn().mockResolvedValue(1),
    duplicate: vi.fn(),
    on: vi.fn(),
  }
  mockPub.duplicate.mockReturnValue({ ...mockPub })
  const MockIoRedis = vi.fn().mockReturnValue(mockPub)
  return { MockIoRedis, mockPub }
})
vi.mock("ioredis", () => ({ default: mocks.MockIoRedis }))

describe("Redis singleton", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("returns null when REDIS_URL is not set", async () => {
    vi.stubEnv("REDIS_URL", "")
    const { getRedisPublisher } = await import("../redis")
    expect(getRedisPublisher()).toBeNull()
  })

  it("creates a client from REDIS_URL", async () => {
    vi.stubEnv("REDIS_URL", "redis://localhost:6379")
    const { getRedisPublisher } = await import("../redis")
    const client = getRedisPublisher()
    expect(mocks.MockIoRedis).toHaveBeenCalledWith("redis://localhost:6379", expect.any(Object))
    expect(client).not.toBeNull()
  })

  it("returns same instance on repeated calls (singleton)", async () => {
    vi.stubEnv("REDIS_URL", "redis://localhost:6379")
    const { getRedisPublisher } = await import("../redis")
    const a = getRedisPublisher()
    const b = getRedisPublisher()
    expect(a).toBe(b)
    expect(mocks.MockIoRedis).toHaveBeenCalledTimes(1)
  })

  it("getRedisSubscriber returns a duplicate of publisher", async () => {
    vi.stubEnv("REDIS_URL", "redis://localhost:6379")
    const { getRedisPublisher, getRedisSubscriber } = await import("../redis")
    getRedisPublisher()
    const sub = getRedisSubscriber()
    expect(mocks.mockPub.duplicate).toHaveBeenCalled()
    expect(sub).not.toBeNull()
  })
})
```

**Step 2: Run test to confirm it fails**
Run: `bun run test src/lib/__tests__/redis.test.ts`
Expected: FAIL — `getRedisPublisher is not a function`

**Step 3: Implement `src/lib/redis.ts`**
```typescript
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
```

**Step 4: Run test to confirm it passes**
Run: `bun run test src/lib/__tests__/redis.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**
```bash
git add src/lib/redis.ts src/lib/__tests__/redis.test.ts
git commit -m "feat(infra): add lazy Redis pub/sub client singletons"
```

---

## Phase 3 — Postgres LISTEN Singleton

### Task 3: pg-listener

**Files:**
- Create: `src/lib/pg-listener.ts`
- Create: `src/lib/__tests__/pg-listener.test.ts`

**Step 1: Write the failing test**

`src/lib/__tests__/pg-listener.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.stubEnv("DIRECT_URL", "postgresql://test:test@localhost:5432/testdb")

const mocks = vi.hoisted(() => {
  let listenCb: ((payload: string) => void) | null = null
  const mockUnlisten = vi.fn()
  const mockEnd = vi.fn().mockResolvedValue(undefined)
  const mockListen = vi.fn().mockImplementation(async (_ch, cb) => {
    listenCb = cb
    return { unlisten: mockUnlisten }
  })
  const mockSql = { listen: mockListen, end: mockEnd }
  const MockPostgres = vi.fn().mockReturnValue(mockSql)
  const mockPublish = vi.fn().mockResolvedValue(1)
  const mockPublisher = { publish: mockPublish }
  return { MockPostgres, mockSql, mockListen, mockEnd, mockPublish, mockPublisher, getCb: () => listenCb }
})

vi.mock("postgres", () => ({ default: mocks.MockPostgres }))
vi.mock("../redis", () => ({ getRedisPublisher: () => mocks.mockPublisher }))

describe("pg-listener", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("calls postgres.js listen on 'new_notification'", async () => {
    const { startPgListener } = await import("../pg-listener")
    await startPgListener()
    expect(mocks.mockListen).toHaveBeenCalledWith("new_notification", expect.any(Function))
  })

  it("uses DIRECT_URL with max:1", async () => {
    const { startPgListener } = await import("../pg-listener")
    await startPgListener()
    expect(mocks.MockPostgres).toHaveBeenCalledWith(
      "postgresql://test:test@localhost:5432/testdb",
      expect.objectContaining({ max: 1 })
    )
  })

  it("publishes to Redis channel keyed by user_id", async () => {
    const { startPgListener } = await import("../pg-listener")
    await startPgListener()
    const payload = JSON.stringify({ id: "n-1", user_id: "u-abc" })
    mocks.getCb()!(payload)
    expect(mocks.mockPublish).toHaveBeenCalledWith("notifications:u-abc", payload)
  })

  it("silently ignores malformed JSON payloads", async () => {
    const { startPgListener } = await import("../pg-listener")
    await startPgListener()
    expect(() => mocks.getCb()!("not-json")).not.toThrow()
    expect(mocks.mockPublish).not.toHaveBeenCalled()
  })

  it("is idempotent — second call is a no-op", async () => {
    const { startPgListener } = await import("../pg-listener")
    await startPgListener()
    await startPgListener()
    expect(mocks.MockPostgres).toHaveBeenCalledTimes(1)
  })
})
```

**Step 2: Run test to confirm it fails**
Run: `bun run test src/lib/__tests__/pg-listener.test.ts`
Expected: FAIL — `startPgListener is not a function`

**Step 3: Implement `src/lib/pg-listener.ts`**
```typescript
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
```

**Step 4: Run test to confirm it passes**
Run: `bun run test src/lib/__tests__/pg-listener.test.ts`
Expected: PASS (5 tests)

**Step 5: Commit**
```bash
git add src/lib/pg-listener.ts src/lib/__tests__/pg-listener.test.ts
git commit -m "feat(infra): add PostgreSQL LISTEN singleton with Redis fan-out"
```

---

## Phase 4 — Database Trigger Migration

### Task 4: pg_notify trigger

**Files:**
- Create: `drizzle/0003_notifications_pg_listen_trigger.sql`
- Modify: `drizzle/meta/_journal.json`

**Step 1: Create migration SQL**

`drizzle/0003_notifications_pg_listen_trigger.sql`:
```sql
-- =============================================================================
-- Migration: Add pg_notify trigger for real-time notifications
-- =============================================================================
-- Fires pg_notify('new_notification', '{"id":"<uuid>","user_id":"<uuid>"}')
-- after each INSERT on the notifications table.
--
-- Payload contains only {id, user_id} — well under the 8KB pg_notify limit.
-- The SSE client fetches full notification data from existing API routes.
--
-- EXCEPTION block makes this PGlite-safe (pg_notify is unsupported in PGlite).
-- =============================================================================

CREATE OR REPLACE FUNCTION notify_new_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  payload TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    BEGIN
      payload := json_build_object(
        'id',      NEW.id,
        'user_id', NEW.recipient_id
      )::TEXT;
      PERFORM pg_notify('new_notification', payload);
    EXCEPTION WHEN OTHERS THEN
      -- pg_notify is unsupported in PGlite/test environments; silently skip
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS trigger_notify_new_notification ON notifications;
--> statement-breakpoint

CREATE TRIGGER trigger_notify_new_notification
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_notification();
```

**Step 2: Add journal entry**

Add to the `entries` array in `drizzle/meta/_journal.json`:
```json
{
  "idx": 3,
  "version": "7",
  "when": 1769004396770,
  "tag": "0003_notifications_pg_listen_trigger",
  "breakpoints": true
}
```

**Step 3: Apply migration to dev database**
Run: `bun run db:migrate`
Expected: `Migration applied: 0003_notifications_pg_listen_trigger`

**Step 4: Verify trigger in database**
```sql
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name = 'trigger_notify_new_notification';
-- Expected: 1 row returned
```

**Step 5: Commit**
```bash
git add drizzle/0003_notifications_pg_listen_trigger.sql drizzle/meta/_journal.json
git commit -m "feat(db): add pg_notify trigger on notifications INSERT"
```

---

## Phase 5 — SSE Route

### Task 5: `/api/notifications/stream`

**Files:**
- Create: `src/app/api/notifications/stream/route.ts`
- Create: `src/app/api/notifications/stream/__tests__/route.test.ts`

**Step 1: Write the failing test**

`src/app/api/notifications/stream/__tests__/route.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => {
  const mockGetSession = vi.fn()
  let msgHandler: ((ch: string, msg: string) => void) | null = null
  const mockSub = {
    subscribe: vi.fn().mockResolvedValue(undefined),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
    on: vi.fn().mockImplementation((_e, h) => { msgHandler = h }),
    removeListener: vi.fn(),
  }
  return { mockGetSession, mockSub, getMsg: () => msgHandler }
})

vi.mock("@/server/auth/session", () => ({ getSession: mocks.mockGetSession }))
vi.mock("@/lib/redis", () => ({ getRedisSubscriber: () => mocks.mockSub }))
vi.mock("@/lib/pg-listener", () => ({ startPgListener: vi.fn().mockResolvedValue(undefined) }))

import { GET } from "../route"

describe("GET /api/notifications/stream", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when unauthenticated", async () => {
    mocks.mockGetSession.mockResolvedValue(null)
    const res = await GET(new Request("http://localhost/api/notifications/stream"))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe("UNAUTHORIZED")
  })

  it("returns 200 with text/event-stream content type", async () => {
    mocks.mockGetSession.mockResolvedValue({ id: "u-1", email: "t@t.com" })
    const res = await GET(new Request("http://localhost/api/notifications/stream"))
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("text/event-stream")
    expect(res.headers.get("Cache-Control")).toBe("no-cache, no-transform")
  })

  it("subscribes to the correct Redis channel for the user", async () => {
    mocks.mockGetSession.mockResolvedValue({ id: "u-abc", email: "t@t.com" })
    await GET(new Request("http://localhost/api/notifications/stream"))
    expect(mocks.mockSub.subscribe).toHaveBeenCalledWith("notifications:u-abc")
  })

  it("emits a 'connected' event as the first chunk", async () => {
    mocks.mockGetSession.mockResolvedValue({ id: "u-1", email: "t@t.com" })
    const res = await GET(new Request("http://localhost/api/notifications/stream"))
    const reader = res.body!.getReader()
    const { value } = await reader.read()
    const text = new TextDecoder().decode(value)
    expect(text).toContain("event: connected")
    reader.releaseLock()
  })
})
```

**Step 2: Run test to confirm it fails**
Run: `bun run test src/app/api/notifications/stream/__tests__/route.test.ts`
Expected: FAIL — `Cannot find module '../route'`

**Step 3: Implement `src/app/api/notifications/stream/route.ts`**
```typescript
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
```

**Step 4: Run test to confirm it passes**
Run: `bun run test src/app/api/notifications/stream/__tests__/route.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**
```bash
git add src/app/api/notifications/stream/route.ts src/app/api/notifications/stream/__tests__/route.test.ts
git commit -m "feat(api): add SSE stream endpoint for push notifications"
```

---

## Phase 6 — Replace the Hook

### Task 6: Replace `use-notification-subscription.ts`

**Files:**
- Replace: `src/features/notifications/hooks/use-notification-subscription.ts`
- Replace: `src/features/notifications/hooks/__tests__/use-notification-subscription.test.ts` (if it exists)

**Step 1: Write the failing test**

`src/features/notifications/hooks/__tests__/use-notification-subscription.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createElement } from "react"

// Mock EventSource globally
const mocks = vi.hoisted(() => {
  let openCb: (() => void) | null = null
  let errorCb: ((e: Event) => void) | null = null
  const evtHandlers = new Map<string, (e: MessageEvent) => void>()
  const mock = {
    close: vi.fn(),
    addEventListener: vi.fn((type: string, h: unknown) => {
      if (type === "open") openCb = h as () => void
      else if (type === "error") errorCb = h as (e: Event) => void
      else evtHandlers.set(type, h as (e: MessageEvent) => void)
    }),
    removeEventListener: vi.fn(),
    readyState: 0,
    _open() { openCb?.() },
    _error(e: Event) { errorCb?.(e) },
    _msg(type: string, data: string) {
      evtHandlers.get(type)?.(new MessageEvent(type, { data }))
    },
    _reset() {
      openCb = null
      errorCb = null
      evtHandlers.clear()
    },
  }
  const MockES = vi.fn().mockReturnValue(mock)
  return { MockES, mock }
})
vi.stubGlobal("EventSource", mocks.MockES)

import { useNotificationSubscription } from "../use-notification-subscription"

describe("useNotificationSubscription (SSE)", () => {
  let qc: QueryClient
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mock._reset()
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  })
  afterEach(() => qc.clear())

  const wrap = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)

  it("does not connect when userId is null", () => {
    renderHook(() => useNotificationSubscription({ userId: null }), { wrapper: wrap })
    expect(mocks.MockES).not.toHaveBeenCalled()
  })

  it("connects to /api/notifications/stream", () => {
    renderHook(() => useNotificationSubscription({ userId: "u-1" }), { wrapper: wrap })
    expect(mocks.MockES).toHaveBeenCalledWith("/api/notifications/stream")
  })

  it("isConnected becomes true on open", async () => {
    const { result } = renderHook(
      () => useNotificationSubscription({ userId: "u-1" }),
      { wrapper: wrap }
    )
    act(() => mocks.mock._open())
    await waitFor(() => expect(result.current.isConnected).toBe(true))
  })

  it("invalidates queries on notification event", async () => {
    const spy = vi.spyOn(qc, "invalidateQueries")
    renderHook(() => useNotificationSubscription({ userId: "u-1" }), { wrapper: wrap })
    act(() => mocks.mock._open())
    act(() => mocks.mock._msg("notification", JSON.stringify({ id: "n-1", user_id: "u-1" })))
    await waitFor(() => expect(spy).toHaveBeenCalled())
  })

  it("calls onNewNotification callback with id", async () => {
    const cb = vi.fn()
    renderHook(
      () => useNotificationSubscription({ userId: "u-1", onNewNotification: cb }),
      { wrapper: wrap }
    )
    act(() => mocks.mock._open())
    act(() => mocks.mock._msg("notification", JSON.stringify({ id: "n-1", user_id: "u-1" })))
    await waitFor(() => expect(cb).toHaveBeenCalledWith(expect.objectContaining({ id: "n-1" })))
  })

  it("falls back to polling on error", async () => {
    const { result } = renderHook(
      () => useNotificationSubscription({ userId: "u-1", fallbackPollingInterval: 100 }),
      { wrapper: wrap }
    )
    act(() => mocks.mock._error(new Event("error")))
    await waitFor(() => expect(result.current.isPolling).toBe(true))
    expect(result.current.isConnected).toBe(false)
  })

  it("closes EventSource on unmount", () => {
    const { unmount } = renderHook(
      () => useNotificationSubscription({ userId: "u-1" }),
      { wrapper: wrap }
    )
    unmount()
    expect(mocks.mock.close).toHaveBeenCalled()
  })

  it("reconnect() creates a new connection", async () => {
    const { result } = renderHook(
      () => useNotificationSubscription({ userId: "u-1" }),
      { wrapper: wrap }
    )
    act(() => mocks.mock._open())
    await waitFor(() => expect(result.current.isConnected).toBe(true))
    act(() => result.current.reconnect())
    expect(mocks.mock.close).toHaveBeenCalled()
    expect(mocks.MockES).toHaveBeenCalledTimes(2)
  })
})
```

**Step 2: Run test to confirm it fails**
Run: `bun run test src/features/notifications/hooks/__tests__/use-notification-subscription.test.ts`
Expected: FAIL — existing Supabase implementation doesn't match

**Step 3: Replace `src/features/notifications/hooks/use-notification-subscription.ts`**

> **Note:** `onNewNotification` type changes from `(notification: Notification)` to `(notification: Partial<Notification> & { id: string })`. This is safe — `use-notification-toast.ts` does not use this callback; it watches the React Query cache directly.

```typescript
/**
 * USE NOTIFICATION SUBSCRIPTION HOOK (SSE version)
 *
 * Subscribes to real-time notification events via Server-Sent Events.
 * Falls back to polling if EventSource is unavailable or connection fails.
 */
import { useEffect, useRef, useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { notificationKeys } from "./use-notifications"
import type { Notification } from "../api"

export interface UseNotificationSubscriptionOptions {
  userId: string | null
  enabled?: boolean
  onNewNotification?: (notification: Partial<Notification> & { id: string }) => void
  fallbackPollingInterval?: number
}

export interface UseNotificationSubscriptionResult {
  isConnected: boolean
  isPolling: boolean
  error: Error | null
  reconnect: () => void
}

const SSE_ENDPOINT = "/api/notifications/stream"

export function useNotificationSubscription({
  userId,
  enabled = true,
  onNewNotification,
  fallbackPollingInterval = 30000,
}: UseNotificationSubscriptionOptions): UseNotificationSubscriptionResult {
  const queryClient = useQueryClient()
  const esRef = useRef<EventSource | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const startPolling = useCallback(() => {
    if (pollingRef.current) return
    setIsPolling(true)
    pollingRef.current = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() })
    }, fallbackPollingInterval)
  }, [queryClient, fallbackPollingInterval])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    setIsPolling(false)
  }, [])

  const connect = useCallback(() => {
    if (!userId || !enabled) return

    if (typeof EventSource === "undefined") {
      startPolling()
      return
    }

    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }

    const es = new EventSource(SSE_ENDPOINT)
    esRef.current = es

    es.addEventListener("open", () => {
      setIsConnected(true)
      setError(null)
      stopPolling()
    })

    es.addEventListener("notification", (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as { id: string; user_id: string }
        queryClient.invalidateQueries({ queryKey: notificationKeys.all })
        onNewNotification?.({ id: payload.id })
      } catch { /* malformed */ }
    })

    es.addEventListener("error", () => {
      setIsConnected(false)
      setError(new Error("SSE connection failed"))
      startPolling()
    })
  }, [userId, enabled, queryClient, onNewNotification, startPolling, stopPolling])

  const reconnect = useCallback(() => {
    setError(null)
    stopPolling()
    connect()
  }, [connect, stopPolling])

  useEffect(() => {
    if (!enabled || !userId) {
      if (esRef.current) { esRef.current.close(); esRef.current = null }
      stopPolling()
      setIsConnected(false)
      return
    }
    connect()
    return () => {
      if (esRef.current) { esRef.current.close(); esRef.current = null }
      stopPolling()
    }
  }, [userId, enabled, connect, stopPolling])

  return { isConnected, isPolling, error, reconnect }
}
```

**Step 4: Run test to confirm it passes**
Run: `bun run test src/features/notifications/hooks/__tests__/use-notification-subscription.test.ts`
Expected: PASS (8 tests)

**Step 5: Run full test suite to catch regressions**
Run: `bun run test`
Expected: same pass/fail ratio as before (any pre-existing failures are unrelated)

**Step 6: Commit**
```bash
git add src/features/notifications/hooks/use-notification-subscription.ts \
        src/features/notifications/hooks/__tests__/use-notification-subscription.test.ts
git commit -m "feat(notifications): replace Supabase Realtime with EventSource SSE"
```

---

## Phase 7 — Cleanup (after E2E verification)

### Task 7: Remove Supabase

**Step 1: Delete `src/lib/supabase-client.ts`**

**Step 2: Remove Supabase fields from `src/lib/env.ts`**
```typescript
// DELETE these two fields:
NEXT_PUBLIC_SUPABASE_URL: optionalUrl().describe(...),
NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString().describe(...),
// Also delete the comment line above them
```

**Step 3: Uninstall `@supabase/supabase-js`**
```bash
bun remove @supabase/supabase-js
```

**Step 4: Remove fake publication from `src/lib/testing/test-db.ts`**
```typescript
// DELETE this block:
await client.exec(`
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
`)
```

**Step 5: Remove supabase scripts from `package.json`**
```json
// DELETE:
"supabase:start": "supabase start",
"supabase:stop": "supabase stop",
"supabase:status": "supabase status",
```

**Step 6: Update `.env.example` and `.env.development`** — remove the `NEXT_PUBLIC_SUPABASE_*` comment blocks

**Step 7: Run full test suite one final time**
Run: `bun run test`

**Step 8: Commit**
```bash
git add -A
git commit -m "chore: remove @supabase/supabase-js — replaced by native pg LISTEN/NOTIFY + SSE"
```

---

## End-to-End Verification

Run after Phase 6 and before Phase 7 cleanup:

**1. Infrastructure**
```bash
bun run dev:stack    # starts Redis + Postgres via Docker
bun run db:migrate   # apply trigger migration
```

**2. Verify trigger exists**
```sql
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name = 'trigger_notify_new_notification';
```

**3. Test SSE endpoint with curl**
```bash
curl -N -H "Cookie: better-auth.session_token=<your-token>" \
  http://localhost:3000/api/notifications/stream
# Expected output:
# event: connected
# data: {"userId":"..."}
#
# (heartbeat every 30s)
```

**4. Browser network tab** — filter by `stream`, confirm `text/event-stream` response

**5. Trigger a notification** — assign an issue or invite a user. Confirm the bell updates without page refresh.

**6. Polling fallback test** — stop Redis (`docker stop <redis-container>`), confirm `isPolling=true` in React DevTools and that unread count still updates.

---

## File Summary

| Action | Path |
|--------|------|
| Modify | `src/lib/env.ts` |
| Create | `src/lib/redis.ts` |
| Create | `src/lib/__tests__/redis.test.ts` |
| Create | `src/lib/pg-listener.ts` |
| Create | `src/lib/__tests__/pg-listener.test.ts` |
| Create | `src/app/api/notifications/stream/route.ts` |
| Create | `src/app/api/notifications/stream/__tests__/route.test.ts` |
| Create | `drizzle/0003_notifications_pg_listen_trigger.sql` |
| Modify | `drizzle/meta/_journal.json` |
| Replace | `src/features/notifications/hooks/use-notification-subscription.ts` |
| Replace | `src/features/notifications/hooks/__tests__/use-notification-subscription.test.ts` |
| Delete (Phase 7) | `src/lib/supabase-client.ts` |
| Modify (Phase 7) | `src/lib/env.ts` (remove Supabase fields) |
| Modify (Phase 7) | `package.json` |
| Modify (Phase 7) | `src/lib/testing/test-db.ts` |
