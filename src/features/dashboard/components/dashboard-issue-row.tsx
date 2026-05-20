import Link from 'next/link'
import { STATUS_COLORS, DEFAULT_STATUS_COLOR } from '@/features/issues/config'
import PriorityBadge from '@/features/issues/components/issues-priority-badge'
import IssueStatusBadge from '@/features/issues/components/issues-status-badge'
import { RelativeTime } from '@/components/shared/relative-time'
import { cn } from '@/lib/utils'
import type { IssueStatus } from '@/features/issues/types'
import type { MyIssue } from '../types'

function getStatusColor(status: string) {
  const normalized = status?.trim().toLowerCase().replace(/\s+/g, '_') as IssueStatus
  return STATUS_COLORS[normalized] ?? DEFAULT_STATUS_COLOR
}

interface DashboardIssueRowProps {
  issue: MyIssue
}

export function DashboardIssueRow({ issue }: DashboardIssueRowProps) {
  const statusColors = getStatusColor(issue.status)

  return (
    <Link
      href={`/issue/${issue.id}`}
      className={cn(
        'flex items-center gap-3 rounded-sm px-3 py-2.5 transition-colors duration-150',
        statusColors.rowBorder,
        statusColors.rowHoverBg,
      )}
    >
      {/* Priority icon */}
      <PriorityBadge priority={issue.priority} />

      {/* Issue key */}
      <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
        {issue.issueKey}
      </span>

      {/* Title */}
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {issue.title}
      </span>

      {/* Status badge */}
      <IssueStatusBadge status={issue.status} />

      {/* Updated time */}
      <RelativeTime
        date={issue.updatedAt}
        className="w-20 shrink-0 text-right text-xs text-muted-foreground"
      />
    </Link>
  )
}
