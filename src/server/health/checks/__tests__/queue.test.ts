import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: { execute: vi.fn() },
}))
vi.mock('@/server/email/worker', () => ({
  getWorkerStatus: vi.fn(),
}))

import { db } from '@/lib/db'
import { getWorkerStatus } from '@/server/email/worker'
import { checkQueue } from '../queue'

const mockExecute      = vi.mocked(db.execute)
const mockWorkerStatus = vi.mocked(getWorkerStatus)

describe('checkQueue', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns ok when worker is running and queue is healthy', async () => {
    mockWorkerStatus.mockReturnValue({ isRunning: true, isProcessing: false })
    mockExecute.mockResolvedValue([{ count: 3 }] as never)

    const result = await checkQueue()

    expect(result.status).toBe('ok')
    expect(result.detail?.pendingJobs).toBe(3)
    expect(result.detail?.workerRunning).toBe(true)
  })

  it('returns degraded when worker is not running', async () => {
    mockWorkerStatus.mockReturnValue({ isRunning: false, isProcessing: false })
    mockExecute.mockResolvedValue([{ count: 0 }] as never)

    const result = await checkQueue()

    expect(result.status).toBe('degraded')
    expect(result.hint).toContain('worker')
  })

  it('returns error when DB query fails', async () => {
    mockWorkerStatus.mockReturnValue({ isRunning: true, isProcessing: false })
    mockExecute.mockRejectedValue(new Error('relation "email_jobs" does not exist'))

    const result = await checkQueue()

    expect(result.status).toBe('error')
    expect(result.hint).toContain('migrations')
  })
})
