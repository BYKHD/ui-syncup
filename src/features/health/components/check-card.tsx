import { cn } from '@/lib/utils'
import type { CheckResult, CheckStatus } from '../types'

const statusConfig: Record<CheckStatus, { dot: string; label: string }> = {
  ok:       { dot: 'bg-green-500',  label: 'OK'       },
  degraded: { dot: 'bg-yellow-500', label: 'Degraded' },
  error:    { dot: 'bg-red-500',    label: 'Error'    },
  skip:     { dot: 'bg-gray-400',   label: 'N/A'      },
}

export function CheckCard({ name, result }: { name: string; result: CheckResult }) {
  const { dot, label } = statusConfig[result.status]

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm">{name}</span>
        <div className="flex items-center gap-1.5">
          <span className={cn('h-2.5 w-2.5 rounded-full', dot)} />
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{result.message}</p>

      {result.latencyMs !== undefined && (
        <p className="text-xs text-muted-foreground mt-1">{result.latencyMs}ms</p>
      )}

      {result.hint && (
        <div className="mt-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium">Hint: </span>{result.hint}
        </div>
      )}

      {result.detail && result.status !== 'ok' && (
        <details className="mt-2">
          <summary className="text-xs text-muted-foreground cursor-pointer">Details</summary>
          <pre className="text-xs mt-1 overflow-auto rounded bg-muted p-2">
            {JSON.stringify(result.detail, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}
