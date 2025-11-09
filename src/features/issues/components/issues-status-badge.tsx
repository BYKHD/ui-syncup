'use client'

import { DEFAULT_STATUS_ICON, STATUS_OPTIONS } from '@config/issue-options'
import type { StatusOption } from '@config/issue-options'
import type { IssueStatus } from '@lib/issues'
import { cn } from '@lib/utils'

const STATUS_OPTION_MAP = Object.fromEntries(
  STATUS_OPTIONS.map(option => [option.value, option])
) as Record<IssueStatus, StatusOption>

function normalizeStatus(value: string): IssueStatus | undefined {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_')

  switch (normalized) {
    case 'open':
    case 'in_progress':
    case 'in_review':
    case 'resolved':
    case 'archived':
      return normalized
    case 'in-progress':
      return 'in_progress'
    case 'in-review':
      return 'in_review'
    default:
      return undefined
  }
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export default function StatusBadge({
  status,
  className
}: StatusBadgeProps) {
  const statusKey = normalizeStatus(status)
  const option = statusKey ? STATUS_OPTION_MAP[statusKey] : undefined
  const Icon = option?.icon ?? DEFAULT_STATUS_ICON
  const label = option?.label ?? status

  return (
    <div className={cn('flex items-center gap-1 text-sm text-muted-foreground', className)}>
      <Icon className="size-3" />
      <span>{label}</span>
    </div>
  )
}
