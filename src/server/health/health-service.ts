import { checkDatabase }         from './checks/database'
import { checkStorage }          from './checks/storage'
import { checkCache }            from './checks/cache'
import { checkEnvConfig }        from './checks/env-config'
import { checkExternalServices } from './checks/external-services'
import { checkQueue }            from './checks/queue'
import type { CheckResult, CheckStatus, HealthReport, OverallStatus } from './types'

function computeOverall(checks: Record<string, CheckResult>): OverallStatus {
  const statuses = Object.values(checks).map((c) => c.status) as CheckStatus[]
  if (statuses.includes('error'))    return 'NOT READY'
  if (statuses.includes('degraded')) return 'DEGRADED'
  return 'READY'
}

export async function runHealthChecks(): Promise<HealthReport> {
  const [database, storage, cache, queue] = await Promise.all([
    checkDatabase(),
    checkStorage(),
    checkCache(),
    checkQueue(),
  ])

  // Synchronous checks — no I/O needed
  const envConfig = checkEnvConfig()
  const email     = checkExternalServices()

  const checks = { database, storage, cache, envConfig, email, queue }

  return {
    overall: computeOverall(checks),
    timestamp: new Date().toISOString(),
    checks,
  }
}
