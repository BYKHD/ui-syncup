'use client'

import {
  DEFAULT_STATUS_ICON,
  DEFAULT_STATUS_COLOR,
  STATUS_OPTIONS,
  STATUS_COLORS,
} from '@/features/issues/config'
import type { StatusOption, StatusColorConfig } from '@/features/issues/config'
import type { IssueStatus } from '@/features/issues/types'
import { cn } from '@/lib/utils'

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
  /** Display variant: 'pill' (colored background) or 'minimal' (dot + text) */
  variant?: 'pill' | 'minimal'
  /** Size variant */
  size?: 'sm' | 'md'
}

/**
 * IssueStatusBadge - Displays issue status with semantic colors
 * 
 * Variants:
 * - pill: Colored background with icon and label (default)
 * - minimal: Small colored dot with label text
 */
export default function StatusBadge({
  status,
  className,
  variant = 'pill',
  size = 'sm',
}: StatusBadgeProps) {
  const statusKey = normalizeStatus(status)
  const option = statusKey ? STATUS_OPTION_MAP[statusKey] : undefined
  const colors: StatusColorConfig = statusKey ? STATUS_COLORS[statusKey] : DEFAULT_STATUS_COLOR
  const Icon = option?.icon ?? DEFAULT_STATUS_ICON
  const label = option?.label ?? status

  if (variant === 'minimal') {
    return (
      <div className={cn(
        'flex items-center gap-2',
        size === 'sm' ? 'text-xs' : 'text-sm',
        className
      )}>
        <span 
          className={cn(
            'inline-block shrink-0 rounded-full',
            size === 'sm' ? 'size-2' : 'size-2.5',
            colors.dot
          )} 
          aria-hidden="true" 
        />
        <span className="text-muted-foreground">{label}</span>
      </div>
    )
  }

  // Default: pill variant with colored background
  return (
    <div 
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        colors.bg,
        colors.text,
        colors.border,
        className
      )}
    >
      <Icon className={cn(size === 'sm' ? 'size-3' : 'size-3.5')} aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
