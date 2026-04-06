import type { MyIssue, IssueProjectGroup, DashboardFilters } from '../types'

/**
 * Groups a flat list of assigned issues by project, preserving
 * projects in the order they first appear.
 */
export function groupIssuesByProject(issues: MyIssue[]): IssueProjectGroup[] {
  const map = new Map<string, IssueProjectGroup>()

  for (const issue of issues) {
    const existing = map.get(issue.projectId)
    if (existing) {
      existing.issues.push(issue)
    } else {
      map.set(issue.projectId, {
        projectId: issue.projectId,
        projectName: issue.projectName,
        projectKey: issue.projectKey,
        issues: [issue],
      })
    }
  }

  return Array.from(map.values())
}

/**
 * Applies dashboard filters to a flat issue list before grouping.
 */
export function filterIssues(issues: MyIssue[], filters: DashboardFilters): MyIssue[] {
  return issues.filter((issue) => {
    if (filters.status !== 'all' && issue.status !== filters.status) return false
    if (filters.priority !== 'all' && issue.priority !== filters.priority) return false
    if (filters.projectId !== 'all' && issue.projectId !== filters.projectId) return false
    return true
  })
}

/**
 * Computes stats counts from the full (unfiltered) issue list.
 */
export function computeStats(issues: MyIssue[]) {
  return {
    open: issues.filter((i) => i.status === 'open').length,
    inProgress: issues.filter((i) => i.status === 'in_progress').length,
    inReview: issues.filter((i) => i.status === 'in_review').length,
  }
}
