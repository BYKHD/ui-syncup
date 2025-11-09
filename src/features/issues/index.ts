// Components
export { default as IssuesList } from './components/issues-list'
export { IssuesCreateDialog } from './components/issues-create-dialog'
export { IssuesListFilter } from './components/issues-list-filter'

// Hooks
export { useIssueFilters } from './hooks/use-issue-filters'
export type { IssueFilters } from './hooks/use-issue-filters'

// Re-export Issue type from mocks for convenience
export type { Issue } from '@/mocks/issue.fixtures'
