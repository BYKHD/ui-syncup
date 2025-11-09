import { useState, useMemo } from 'react'
import type { Issue, IssueStatus } from '@/mocks/issue.fixtures'

// Infer types from mock data usage
type IssuePriority = 'critical' | 'high' | 'medium' | 'low'
type IssueType = 'bug' | 'feature' | 'improvement'

export interface IssueFilters {
  search: string
  status: 'all' | IssueStatus
  type: 'all' | IssueType
  priority: 'all' | IssuePriority
  sortBy: 'key' | 'title' | 'updated' | 'created' | 'priority'
  sortOrder: 'asc' | 'desc'
}

const DEFAULT_FILTERS: IssueFilters = {
  search: '',
  status: 'all',
  type: 'all',
  priority: 'all',
  sortBy: 'updated',
  sortOrder: 'desc',
}

const PRIORITY_ORDER: Record<IssuePriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

export function useIssueFilters(issues: Issue[]) {
  const [filters, setFilters] = useState<IssueFilters>(DEFAULT_FILTERS)

  const filteredIssues = useMemo(() => {
    let result = [...issues]

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(
        (issue) =>
          issue.title.toLowerCase().includes(searchLower) ||
          issue.description?.toLowerCase().includes(searchLower) ||
          issue.issueKey.toLowerCase().includes(searchLower)
      )
    }

    // Status filter
    if (filters.status !== 'all') {
      result = result.filter((issue) => issue.status === filters.status)
    }

    // Type filter
    if (filters.type !== 'all') {
      result = result.filter((issue) => issue.type === filters.type)
    }

    // Priority filter
    if (filters.priority !== 'all') {
      result = result.filter((issue) => issue.priority === filters.priority)
    }

    // Sort
    result.sort((a, b) => {
      let compareValue = 0

      switch (filters.sortBy) {
        case 'key':
          compareValue = a.issueKey.localeCompare(b.issueKey)
          break
        case 'title':
          compareValue = a.title.localeCompare(b.title)
          break
        case 'updated':
          compareValue = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          break
        case 'created':
          compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'priority':
          compareValue = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
          break
        default:
          compareValue = 0
      }

      return filters.sortOrder === 'asc' ? compareValue : -compareValue
    })

    return result
  }, [issues, filters])

  return {
    filters,
    setFilters,
    filteredIssues,
    totalCount: issues.length,
    filteredCount: filteredIssues.length,
  }
}
