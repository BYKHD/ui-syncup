import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: { execute: vi.fn() },
}))

import { db } from '@/lib/db'
import { checkDatabase } from '../database'

const mockExecute = vi.mocked(db.execute)

describe('checkDatabase', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns ok with latencyMs when DB responds', async () => {
    mockExecute
      .mockResolvedValueOnce([{ now: new Date() }] as never)     // SELECT NOW()
      .mockResolvedValueOnce([{ id: 2, hash: 'abc' }] as never)  // migrations query

    const result = await checkDatabase()

    expect(result.status).toBe('ok')
    expect(result.latencyMs).toBeGreaterThanOrEqual(0)
    expect(result.detail?.migrationVersion).toBe('2')
    expect(result.hint).toBeUndefined()
  })

  it('returns error when DB throws', async () => {
    mockExecute.mockRejectedValue(new Error('Connection refused'))

    const result = await checkDatabase()

    expect(result.status).toBe('error')
    expect(result.message).toContain('Connection refused')
    expect(result.hint).toContain('DATABASE_URL')
  })

  it('reports ok and migrationVersion "unknown" when migrations table is missing', async () => {
    mockExecute
      .mockResolvedValueOnce([{ now: new Date() }] as never)
      .mockRejectedValueOnce(new Error('relation "__drizzle_migrations" does not exist'))

    const result = await checkDatabase()

    expect(result.status).toBe('ok')
    expect(result.detail?.migrationVersion).toBe('unknown')
  })
})
