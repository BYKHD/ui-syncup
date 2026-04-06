import { STATUS_COLORS } from '@/features/issues/config'
import { cn } from '@/lib/utils'
import type { StatusColorConfig } from '@/features/issues/config'
import type { DashboardStats, DashboardStatusFilter } from '../types'

interface StatCardProps {
  label: string
  count: number
  active: boolean
  colors: StatusColorConfig
  onClick: () => void
}

function StatCard({ label, count, active, colors, onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex h-auto w-full flex-col items-start gap-1 rounded-lg border px-5 py-4 text-left transition-all',
        'outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] active:scale-[0.95] disabled:pointer-events-none disabled:opacity-50',
        active
          ? [colors.bg, colors.border, colors.text]
          : 'border-border bg-card text-foreground hover:bg-muted/50 dark:hover:bg-muted/50',
      )}
    >
      <span className="text-2xl font-semibold tabular-nums">{count}</span>
      <span className={cn('text-sm font-normal', active ? colors.text : 'text-muted-foreground')}>
        {label}
      </span>
    </button>
  )
}

interface DashboardStatsStripProps {
  stats: DashboardStats
  activeFilter: DashboardStatusFilter
  onFilterChange: (status: DashboardStatusFilter) => void
}

export function DashboardStatsStrip({
  stats,
  activeFilter,
  onFilterChange,
}: DashboardStatsStripProps) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      <StatCard
        label="Open"
        count={stats.open}
        active={activeFilter === 'open'}
        colors={STATUS_COLORS.open}
        onClick={() => onFilterChange(activeFilter === 'open' ? 'all' : 'open')}
      />
      <StatCard
        label="In Progress"
        count={stats.inProgress}
        active={activeFilter === 'in_progress'}
        colors={STATUS_COLORS.in_progress}
        onClick={() => onFilterChange(activeFilter === 'in_progress' ? 'all' : 'in_progress')}
      />
      <StatCard
        label="In Review"
        count={stats.inReview}
        active={activeFilter === 'in_review'}
        colors={STATUS_COLORS.in_review}
        onClick={() => onFilterChange(activeFilter === 'in_review' ? 'all' : 'in_review')}
      />
    </div>
  )
}
