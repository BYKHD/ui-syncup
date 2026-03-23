'use client'

import { useHealth } from '../hooks/use-health'
import { OverallBadge } from '../components/overall-badge'
import { CheckCard } from '../components/check-card'
import type { CheckResult } from '../types'

const CHECK_LABELS: Record<string, string> = {
  database:  'Database',
  storage:   'Storage',
  cache:     'Cache',
  envConfig: 'Environment Config',
  email:     'External Services (Email)',
  queue:     'Queue / Background Jobs',
}

export function HealthScreen() {
  const { data, isLoading, error, dataUpdatedAt } = useHealth(30_000)

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground text-sm animate-pulse">Running health checks…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-destructive text-sm">
          Failed to load health data. Is the server reachable?
        </p>
      </div>
    )
  }

  const lastChecked = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : '—'

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Platform Health</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Last checked at {lastChecked} · Auto-refreshes every 30s
          </p>
        </div>
        <OverallBadge status={data.overall} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(Object.entries(data.checks) as [string, CheckResult][]).map(([key, result]) => (
          <CheckCard
            key={key}
            name={CHECK_LABELS[key] ?? key}
            result={result}
          />
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Checked at {new Date(data.timestamp).toLocaleString()}
      </p>
    </div>
  )
}
