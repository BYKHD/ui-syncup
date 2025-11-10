// ============================================================================
// ISSUE FEATURE DOMAIN TYPES
// Feature-specific types and re-exports
// ============================================================================

// Re-export all global issue types
export type {
  IssueDetailData,
  IssueAttachment,
  IssueUser,
  IssuePermissions,
  ActivityEntry,
  ActivityType,
  ActivityChange,
  ActivityTimelineResponse,
  CanvasViewState,
  ImageSelectorProps,
  WorkflowControlProps,
  IssueDetailResponse,
  IssueUpdatePayload,
  IssueUpdateResponse,
  IssueDeletePayload,
  IssuePriority,
  IssueType,
  IssueStatus,
} from '@/types/issue';

export {
  STATUS_TRANSITIONS,
  IssueDetailError,
  IssueDetailErrorType,
  IssueNotFoundError,
  IssuePermissionError,
  IssueNetworkError,
  AttachmentLoadError,
  ActivityLoadError,
} from '@/types/issue';

// ============================================================================
// FEATURE-SPECIFIC TYPES (if needed in the future)
// ============================================================================

// Add any feature-specific types here that don't belong in global types
