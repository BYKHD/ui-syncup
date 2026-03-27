import { describe, it, expect, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => {
  const mockPub = {
    publish: vi.fn().mockResolvedValue(1),
    duplicate: vi.fn(),
    on: vi.fn(),
  }
  mockPub.duplicate.mockReturnValue({ ...mockPub })
  const MockIoRedis = vi.fn().mockImplementation(function () { return mockPub })
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
