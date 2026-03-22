import { describe, it, expect, vi, afterEach } from 'vitest'

const { mockCreateConnection } = vi.hoisted(() => ({
  mockCreateConnection: vi.fn(),
}))

vi.mock('net', () => ({
  default: { createConnection: mockCreateConnection },
}))

import { checkCache } from '../cache'

describe('checkCache', () => {
  const originalEnv = { ...process.env }
  afterEach(() => {
    process.env = { ...originalEnv }
    vi.clearAllMocks()
  })

  it('returns skip when REDIS_URL is not set', async () => {
    delete process.env.REDIS_URL
    const result = await checkCache()
    expect(result.status).toBe('skip')
    expect(result.message).toContain('not configured')
    expect(mockCreateConnection).not.toHaveBeenCalled()
  })

  it('returns error when REDIS_URL has invalid format', async () => {
    process.env.REDIS_URL = 'not-a-url'
    const result = await checkCache()
    expect(result.status).toBe('error')
    expect(result.hint).toContain('REDIS_URL')
  })

  it('returns ok when TCP connection succeeds', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379'
    const fakeSocket = { on: vi.fn(), destroy: vi.fn() }
    fakeSocket.on.mockImplementation((event: string, cb: () => void) => {
      if (event === 'connect') setTimeout(cb, 0)
      return fakeSocket
    })
    mockCreateConnection.mockReturnValue(fakeSocket)

    const result = await checkCache()

    expect(result.status).toBe('ok')
    expect(result.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('returns error when TCP connection is refused', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379'
    const fakeSocket = { on: vi.fn(), destroy: vi.fn() }
    fakeSocket.on.mockImplementation((event: string, cb: (err?: Error) => void) => {
      if (event === 'error') setTimeout(() => cb(new Error('ECONNREFUSED')), 0)
      return fakeSocket
    })
    mockCreateConnection.mockReturnValue(fakeSocket)

    const result = await checkCache()

    expect(result.status).toBe('error')
    expect(result.hint).toContain('REDIS_URL')
  })
})
