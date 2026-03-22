import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/server/health', () => ({
  runHealthChecks: vi.fn(),
}))

import { runHealthChecks } from '@/server/health'
import { GET } from '../route'
import type { HealthReport } from '@/server/health'

function makeReport(overall: HealthReport['overall']): HealthReport {
  return {
    overall,
    timestamp: '2026-01-01T00:00:00.000Z',
    checks: {
      database:  { status: 'ok',   message: 'ok' },
      storage:   { status: 'ok',   message: 'ok' },
      cache:     { status: 'skip', message: 'skip' },
      envConfig: { status: 'ok',   message: 'ok' },
      email:     { status: 'ok',   message: 'ok' },
      queue:     { status: 'ok',   message: 'ok' },
    },
  }
}

describe('GET /api/health', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 200 with full report when READY', async () => {
    vi.mocked(runHealthChecks).mockResolvedValue(makeReport('READY'))
    const response = await GET()
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.overall).toBe('READY')
    expect(body.checks).toBeDefined()
    expect(body.timestamp).toBeTruthy()
  })

  it('returns 503 when NOT READY', async () => {
    vi.mocked(runHealthChecks).mockResolvedValue(makeReport('NOT READY'))
    const response = await GET()
    expect(response.status).toBe(503)
    expect((await response.json()).overall).toBe('NOT READY')
  })

  it('returns 200 when DEGRADED', async () => {
    vi.mocked(runHealthChecks).mockResolvedValue(makeReport('DEGRADED'))
    const response = await GET()
    expect(response.status).toBe(200)
    expect((await response.json()).overall).toBe('DEGRADED')
  })

  it('returns 500 if health service throws unexpectedly', async () => {
    vi.mocked(runHealthChecks).mockRejectedValue(new Error('Unexpected'))
    const response = await GET()
    expect(response.status).toBe(500)
  })
})
