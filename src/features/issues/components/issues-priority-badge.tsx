'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { DEFAULT_PRIORITY_ICON, PRIORITY_OPTIONS } from '@/config/issue-options'
import type { IssuePriority } from '@/lib/issues'
import { cn } from '@/lib/utils'

const PRIORITY_OPTION_MAP = Object.fromEntries(
  PRIORITY_OPTIONS.map(option => [option.value, option])
) as Record<IssuePriority, (typeof PRIORITY_OPTIONS)[number]>

function normalizePriority(value: string): IssuePriority | undefined {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_')

  switch (normalized) {
    case 'critical':
    case 'high':
    case 'medium':
    case 'low':
      return normalized
    case 'highest':
      return 'critical'
    case 'urgent':
      return 'high'
    case 'normal':
      return 'medium'
    case 'minor':
      return 'low'
    default:
      return undefined
  }
}

interface PriorityBadgeProps {
  priority: string
  className?: string
}

export default function PriorityBadge({
  priority,
  className
}: PriorityBadgeProps) {
  const priorityKey = normalizePriority(priority)
  const option = priorityKey ? PRIORITY_OPTION_MAP[priorityKey] : undefined
  const Icon = option?.icon ?? DEFAULT_PRIORITY_ICON
  const label = option?.label ?? priority

  return (
    <TooltipProvider delayDuration={200} disableHoverableContent>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm',
              className
            )}
            role="status"
            aria-label={`Priority: ${label}`}
          >
            <Icon className="size-3" aria-hidden="true" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
