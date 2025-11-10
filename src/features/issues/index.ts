// ============================================================================
// ISSUE FEATURE BARREL EXPORTS
// Public API surface for the issues feature
// ============================================================================

// Screens (main entry points)
export { default as IssueDetailsScreen } from './screens/issue-details-screen-new';
export { EnhancedResponsiveIssueLayoutSkeleton } from './screens/issue-details-skeletons';

// List Components
export { default as IssuesList } from './components/issues-list';
export { IssuesCreateDialog } from './components/issues-create-dialog';
export { IssuesListFilter } from './components/issues-list-filter';

// Detail Components (for composition)
export { default as ResponsiveIssueLayout } from './components/responsive-issue-layout';
export { default as IssueDetailsPanel } from './components/issue-details-panel';
export { default as IssueAttachmentsView } from './components/issue-attachments-view';

// Hooks
export {
  useIssueDetails,
  useIssueActivities,
  useIssueUpdate,
  useIssueDelete,
  useIssueFilters,
} from './hooks';
export type { IssueFilters } from './hooks/use-issue-filters';

// Types
export type {
  IssueDetailData,
  IssueAttachment,
  IssuePermissions,
  ActivityEntry,
  ActivityType,
  IssuePriority,
  IssueType,
  IssueStatus,
} from './types';

// Re-export Issue type from mocks for convenience
export type { Issue } from '@/mocks/issue.fixtures';

// API (for advanced use cases)
export {
  getIssueDetails,
  getIssueActivities,
  updateIssue,
  deleteIssue,
} from './api';
