import { cn } from '@/lib/utils'
import type { OverallStatus } from '../types'

const config: Record<OverallStatus, { label: string; className: string }> = {
  'READY':     { label: 'READY',     className: 'bg-green-100  text-green-800  border-green-200'  },
  'DEGRADED':  { label: 'DEGRADED',  className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  'NOT READY': { label: 'NOT READY', className: 'bg-red-100    text-red-800    border-red-200'    },
}

export function OverallBadge({ status }: { status: OverallStatus }) {
  const { label, className } = config[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold tracking-wide',
        className
      )}
    >
      {label}
    </span>
  )
}
