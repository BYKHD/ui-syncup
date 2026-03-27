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
  const MockPostgres = vi.fn().mockImplementation(function () { return mockSql })
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
