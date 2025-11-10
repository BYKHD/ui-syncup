/**
 * FILTER ISSUES UTILITY
 * Pure utility functions for filtering and sorting issues (no React)
 */

import type { Issue, IssueStatus } from '@/mocks/issue.fixtures';

// ============================================================================
// TYPES
// ============================================================================

type IssuePriority = 'critical' | 'high' | 'medium' | 'low';
type IssueType = 'bug' | 'feature' | 'improvement';

export interface IssueFilters {
  search: string;
  status: 'all' | IssueStatus;
  type: 'all' | IssueType;
  priority: 'all' | IssuePriority;
  sortBy: 'key' | 'title' | 'updated' | 'created' | 'priority';
  sortOrder: 'asc' | 'desc';
}

export const DEFAULT_FILTERS: IssueFilters = {
  search: '',
  status: 'all',
  type: 'all',
  priority: 'all',
  sortBy: 'updated',
  sortOrder: 'desc',
};

// ============================================================================
// CONSTANTS
// ============================================================================

const PRIORITY_ORDER: Record<IssuePriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Filter issues by search term
 */
export function filterBySearch(issues: Issue[], search: string): Issue[] {
  if (!search) return issues;

  const searchLower = search.toLowerCase();
  return issues.filter(
    (issue) =>
      issue.title.toLowerCase().includes(searchLower) ||
      issue.description?.toLowerCase().includes(searchLower) ||
      issue.issueKey.toLowerCase().includes(searchLower)
  );
}

/**
 * Filter issues by status
 */
export function filterByStatus(issues: Issue[], status: IssueFilters['status']): Issue[] {
  if (status === 'all') return issues;
  return issues.filter((issue) => issue.status === status);
}

/**
 * Filter issues by type
 */
export function filterByType(issues: Issue[], type: IssueFilters['type']): Issue[] {
  if (type === 'all') return issues;
  return issues.filter((issue) => issue.type === type);
}

/**
 * Filter issues by priority
 */
export function filterByPriority(issues: Issue[], priority: IssueFilters['priority']): Issue[] {
  if (priority === 'all') return issues;
  return issues.filter((issue) => issue.priority === priority);
}

/**
 * Sort issues by field and order
 */
export function sortIssues(
  issues: Issue[],
  sortBy: IssueFilters['sortBy'],
  sortOrder: IssueFilters['sortOrder']
): Issue[] {
  const sorted = [...issues];

  sorted.sort((a, b) => {
    let compareValue = 0;

    switch (sortBy) {
      case 'key':
        compareValue = a.issueKey.localeCompare(b.issueKey);
        break;
      case 'title':
        compareValue = a.title.localeCompare(b.title);
        break;
      case 'updated':
        compareValue = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
      case 'created':
        compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'priority':
        compareValue = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        break;
      default:
        compareValue = 0;
    }

    return sortOrder === 'asc' ? compareValue : -compareValue;
  });

  return sorted;
}

/**
 * Apply all filters to an issue list
 * Pure function - no side effects
 */
export function filterAndSortIssues(issues: Issue[], filters: IssueFilters): Issue[] {
  let result = issues;

  // Apply filters
  result = filterBySearch(result, filters.search);
  result = filterByStatus(result, filters.status);
  result = filterByType(result, filters.type);
  result = filterByPriority(result, filters.priority);

  // Apply sorting
  result = sortIssues(result, filters.sortBy, filters.sortOrder);

  return result;
}
