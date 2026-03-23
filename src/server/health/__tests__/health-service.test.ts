import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../checks/database',          () => ({ checkDatabase:         vi.fn() }))
vi.mock('../checks/storage',           () => ({ checkStorage:          vi.fn() }))
vi.mock('../checks/cache',             () => ({ checkCache:            vi.fn() }))
vi.mock('../checks/env-config',        () => ({ checkEnvConfig:        vi.fn() }))
vi.mock('../checks/external-services', () => ({ checkExternalServices: vi.fn() }))
vi.mock('../checks/queue',             () => ({ checkQueue:            vi.fn() }))

import { checkDatabase }         from '../checks/database'
import { checkStorage }          from '../checks/storage'
import { checkCache }            from '../checks/cache'
import { checkEnvConfig }        from '../checks/env-config'
import { checkExternalServices } from '../checks/external-services'
import { checkQueue }            from '../checks/queue'
import { runHealthChecks }       from '../health-service'
import type { CheckResult }      from '../types'

const ok       = (msg = 'ok'):       CheckResult => ({ status: 'ok',       message: msg })
const degraded = (msg = 'degraded'): CheckResult => ({ status: 'degraded', message: msg })
const error    = (msg = 'error'):    CheckResult => ({ status: 'error',    message: msg })
const skip     = (msg = 'skip'):     CheckResult => ({ status: 'skip',     message: msg })

function setupMocks(overrides: Partial<Record<'database'|'storage'|'cache'|'envConfig'|'email'|'queue', CheckResult>> = {}) {
  vi.mocked(checkDatabase).mockResolvedValue(overrides.database ?? ok())
  vi.mocked(checkStorage).mockResolvedValue(overrides.storage ?? ok())
  vi.mocked(checkCache).mockResolvedValue(overrides.cache ?? skip())
  vi.mocked(checkEnvConfig).mockReturnValue(overrides.envConfig ?? ok())
  vi.mocked(checkExternalServices).mockReturnValue(overrides.email ?? ok())
  vi.mocked(checkQueue).mockResolvedValue(overrides.queue ?? ok())
}

describe('runHealthChecks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns READY when all checks are ok or skip', async () => {
    setupMocks()
    const report = await runHealthChecks()
    expect(report.overall).toBe('READY')
    expect(report.timestamp).toBeTruthy()
    expect(report.checks).toHaveProperty('database')
    expect(Object.keys(report.checks)).toHaveLength(6)
  })

  it('returns DEGRADED when any check is degraded', async () => {
    setupMocks({ cache: degraded('Cache slow') })
    const report = await runHealthChecks()
    expect(report.overall).toBe('DEGRADED')
  })

  it('returns NOT READY when any check has error status', async () => {
    setupMocks({ database: error('DB down') })
    const report = await runHealthChecks()
    expect(report.overall).toBe('NOT READY')
  })

  it('NOT READY takes precedence over DEGRADED', async () => {
    setupMocks({ database: error('DB down'), cache: degraded('Cache slow') })
    const report = await runHealthChecks()
    expect(report.overall).toBe('NOT READY')
  })

  it('runs async checks in parallel — completes in ~50ms not ~200ms', async () => {
    const delay = (ms: number) => new Promise<CheckResult>(r => setTimeout(() => r(ok()), ms))
    vi.mocked(checkDatabase).mockImplementation(() => delay(50))
    vi.mocked(checkStorage).mockImplementation(() => delay(50))
    vi.mocked(checkCache).mockImplementation(() => delay(50))
    vi.mocked(checkEnvConfig).mockReturnValue(ok())
    vi.mocked(checkExternalServices).mockReturnValue(ok())
    vi.mocked(checkQueue).mockImplementation(() => delay(50))

    const start = Date.now()
    await runHealthChecks()
    const elapsed = Date.now() - start

    expect(elapsed).toBeLessThan(150)
  })
})
