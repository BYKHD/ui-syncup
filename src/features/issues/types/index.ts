// ============================================================================
// ISSUE FEATURE DOMAIN TYPES
// Feature-specific types and re-exports
// ============================================================================

// Re-export issue domain types from the feature module
export type {
  IssueDetailData,
  IssueAttachment,
  AttachmentAnnotation,
  AttachmentReviewVariant,
  AnnotationStatus,
  AnnotationComment,
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
  StatusTransition,
} from './issue';

export {
  STATUS_TRANSITIONS,
  IssueDetailError,
  IssueDetailErrorType,
  IssueNotFoundError,
  IssuePermissionError,
  IssueNetworkError,
  AttachmentLoadError,
  ActivityLoadError,
} from './issue';

// ============================================================================
// FEATURE-SPECIFIC TYPES (if needed in the future)
// ============================================================================

// Add any feature-specific types here that don't belong in global types
