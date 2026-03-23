import { describe, it, expect } from 'vitest'
import type { CheckResult, HealthReport, OverallStatus, CheckStatus } from '../types'

describe('health types shape', () => {
  it('CheckStatus values are the expected literals', () => {
    const statuses: CheckStatus[] = ['ok', 'degraded', 'error', 'skip']
    expect(statuses).toHaveLength(4)
  })

  it('OverallStatus values are the expected literals', () => {
    const statuses: OverallStatus[] = ['READY', 'DEGRADED', 'NOT READY']
    expect(statuses).toHaveLength(3)
  })

  it('CheckResult has required shape', () => {
    const result: CheckResult = {
      status: 'ok',
      message: 'Database connected',
      latencyMs: 12,
    }
    expect(result.status).toBe('ok')
  })

  it('HealthReport has all 6 check keys', () => {
    const report: HealthReport = {
      overall: 'READY',
      timestamp: new Date().toISOString(),
      checks: {
        database:  { status: 'ok',   message: 'ok' },
        storage:   { status: 'ok',   message: 'ok' },
        cache:     { status: 'skip', message: 'not configured' },
        envConfig: { status: 'ok',   message: 'ok' },
        email:     { status: 'ok',   message: 'ok' },
        queue:     { status: 'ok',   message: 'ok' },
      },
    }
    expect(Object.keys(report.checks)).toHaveLength(6)
  })
})
