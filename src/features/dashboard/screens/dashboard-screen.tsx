'use client'

import { useState, useMemo } from 'react'
import { useSession } from '@/features/auth/hooks/use-session'
import { useMyIssues } from '../hooks/use-my-issues'
import { DashboardStatsStrip } from '../components/dashboard-stats-strip'
import { DashboardFiltersBar } from '../components/dashboard-filters'
import { DashboardProjectGroup } from '../components/dashboard-project-group'
import { DashboardEmptyState } from '../components/dashboard-empty-state'
import {
  groupIssuesByProject,
  filterIssues,
  computeStats,
} from '../utils/group-issues-by-project'
import { DEFAULT_FILTERS } from '../types'
import type { DashboardFilters } from '../types'

function getGreeting(name: string | undefined): string {
  const hour = new Date().getHours()
  const first = name?.split(' ')[0] ?? 'there'
  if (hour < 12) return `Good morning, ${first}`
  if (hour < 18) return `Good afternoon, ${first}`
  return `Good evening, ${first}`
}

export default function DashboardScreen() {
  const { user } = useSession()
  const { issues, isLoading, isError } = useMyIssues()
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS)

  const stats = useMemo(() => computeStats(issues), [issues])

  const filteredIssues = useMemo(
    () => filterIssues(issues, filters),
    [issues, filters],
  )

  const allGroups = useMemo(() => groupIssuesByProject(issues), [issues])
  const filteredGroups = useMemo(() => groupIssuesByProject(filteredIssues), [filteredIssues])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10 lg:px-10">
      {/* Greeting */}
      <h1 className="text-2xl font-semibold tracking-tight">
        {getGreeting(user?.name)}
      </h1>

      {/* Stats strip */}
      <DashboardStatsStrip
        stats={stats}
        activeFilter={filters.status}
        onFilterChange={(status) => setFilters((f) => ({ ...f, status }))}
      />

      {/* Filters */}
      <DashboardFiltersBar
        filters={filters}
        projectGroups={allGroups}
        onFiltersChange={setFilters}
      />

      {/* Issue list */}
      {isLoading ? (
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-md bg-muted/40" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-muted-foreground">
          Failed to load your issues. Try refreshing the page.
        </p>
      ) : filteredGroups.length === 0 ? (
        <DashboardEmptyState />
      ) : (
        <div className="flex flex-col gap-6">
          {filteredGroups.map((group) => (
            <DashboardProjectGroup key={group.projectId} group={group} />
          ))}
        </div>
      )}
    </div>
  )
}
