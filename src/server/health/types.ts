export type CheckStatus = 'ok' | 'degraded' | 'error' | 'skip'
export type OverallStatus = 'READY' | 'DEGRADED' | 'NOT READY'

export interface CheckResult {
  status: CheckStatus
  message: string
  latencyMs?: number
  hint?: string
  detail?: Record<string, unknown>
}

export interface HealthReport {
  overall: OverallStatus
  timestamp: string
  checks: {
    database:  CheckResult
    storage:   CheckResult
    cache:     CheckResult
    envConfig: CheckResult
    email:     CheckResult
    queue:     CheckResult
  }
}
