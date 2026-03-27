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
    const res = await GET(new Request("http://localhost/api/notifications/stream") as unknown as import("next/server").NextRequest)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe("UNAUTHORIZED")
  })

  it("returns 200 with text/event-stream content type", async () => {
    mocks.mockGetSession.mockResolvedValue({ id: "u-1", email: "t@t.com" })
    const res = await GET(new Request("http://localhost/api/notifications/stream") as unknown as import("next/server").NextRequest)
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("text/event-stream")
    expect(res.headers.get("Cache-Control")).toBe("no-cache, no-transform")
  })

  it("subscribes to the correct Redis channel for the user", async () => {
    mocks.mockGetSession.mockResolvedValue({ id: "u-abc", email: "t@t.com" })
    await GET(new Request("http://localhost/api/notifications/stream") as unknown as import("next/server").NextRequest)
    expect(mocks.mockSub.subscribe).toHaveBeenCalledWith("notifications:u-abc")
  })

  it("emits a 'connected' event as the first chunk", async () => {
    mocks.mockGetSession.mockResolvedValue({ id: "u-1", email: "t@t.com" })
    const res = await GET(new Request("http://localhost/api/notifications/stream") as unknown as import("next/server").NextRequest)
    const reader = res.body!.getReader()
    const { value } = await reader.read()
    const text = new TextDecoder().decode(value)
    expect(text).toContain("event: connected")
    reader.releaseLock()
  })
})
