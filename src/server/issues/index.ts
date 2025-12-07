/**
 * Issues Module - Server Services
 *
 * Barrel export for issue-related server-side services.
 */

// Issue Service
export {
  getIssueById,
  getIssueByKey,
  getIssuesByProject,
  createIssue,
  updateIssue,
  deleteIssue,
} from "./issue-service";

// Attachment Service
export {
  getAttachmentsByIssue,
  getAttachment,
  getTotalAttachmentSize,
  createAttachment,
  deleteAttachment,
  generateR2Path,
  isImageType,
  MAX_FILE_SIZE,
  MAX_TOTAL_SIZE_PER_ISSUE,
} from "./attachment-service";

// Activity Service
export {
  getActivitiesByIssue,
  getActivity,
  logActivity,
  logCommentActivity,
  logAttachmentActivity,
} from "./activity-service";

// Types
export type {
  // Issue types
  Issue,
  NewIssue,
  IssueType,
  IssuePriority,
  IssueStatus,
  IssueWithDetails,
  ListIssuesParams,
  IssueListResult,
  CreateIssueData,
  UpdateIssueData,
  // Attachment types
  IssueAttachment,
  NewIssueAttachment,
  AttachmentReviewVariant,
  AttachmentWithUploader,
  CreateAttachmentData,
  // Activity types
  IssueActivity,
  NewIssueActivity,
  ActivityType,
  FieldChange,
  ActivityWithActor,
  ListActivitiesParams,
  ActivityListResult,
  LogActivityData,
} from "./types";
