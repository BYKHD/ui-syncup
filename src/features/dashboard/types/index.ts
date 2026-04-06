import type { IssuePriority, IssueStatus } from '@/features/issues/types'

// ============================================================================
// DASHBOARD DOMAIN TYPES
// ============================================================================

/**
 * An issue assigned to the current user, enriched with project context
 * needed for cross-project grouping on the dashboard.
 */
export interface MyIssue {
  id: string
  issueKey: string
  title: string
  priority: IssuePriority
  status: IssueStatus
  projectId: string
  projectName: string
  projectKey: string
  updatedAt: string
}

/**
 * Aggregated counts for the stats strip — current user only.
 */
export interface DashboardStats {
  open: number
  inProgress: number
  inReview: number
}

/**
 * A project group containing the issues assigned to the current user.
 */
export interface IssueProjectGroup {
  projectId: string
  projectName: string
  projectKey: string
  issues: MyIssue[]
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export type DashboardStatusFilter = IssueStatus | 'all'
export type DashboardPriorityFilter = IssuePriority | 'all'

export interface DashboardFilters {
  status: DashboardStatusFilter
  priority: DashboardPriorityFilter
  projectId: string | 'all'
}

export const DEFAULT_FILTERS: DashboardFilters = {
  status: 'all',
  priority: 'all',
  projectId: 'all',
}
