/**
 * Issue Service Types
 *
 * Type definitions for issue service operations.
 */

import type { Issue, NewIssue } from "@/server/db/schema/issues";
import type { IssueAttachment, NewIssueAttachment } from "@/server/db/schema/issue-attachments";
import type { IssueActivity, NewIssueActivity } from "@/server/db/schema/issue-activities";

// ============================================================================
// ISSUE TYPES
// ============================================================================

/**
 * Issue type enum values
 */
export type IssueType = "bug" | "visual" | "accessibility" | "content" | "other";

/**
 * Issue priority enum values
 */
export type IssuePriority = "low" | "medium" | "high" | "critical";

/**
 * Issue status enum values
 */
export type IssueStatus = "open" | "in_progress" | "in_review" | "resolved" | "archived";

/**
 * Issue with related user information
 */
export interface IssueWithDetails extends Issue {
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
  reporter: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  attachmentCount?: number;
}

/**
 * Parameters for listing issues
 */
export interface ListIssuesParams {
  projectId: string;
  status?: IssueStatus;
  type?: IssueType;
  priority?: IssuePriority;
  assigneeId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Result of listing issues
 */
export interface IssueListResult {
  items: IssueWithDetails[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Data for creating a new issue
 */
export interface CreateIssueData {
  projectId: string;
  reporterId: string;
  title: string;
  description?: string | null;
  type?: IssueType;
  priority?: IssuePriority;
  status?: IssueStatus;
  assigneeId?: string | null;
  coverImageUrl?: string | null;
  page?: string | null;
  figmaLink?: string | null;
  jiraLink?: string | null;
}

/**
 * Data for updating an issue
 */
export interface UpdateIssueData {
  title?: string;
  description?: string | null;
  type?: IssueType;
  priority?: IssuePriority;
  status?: IssueStatus;
  assigneeId?: string | null;
  coverImageUrl?: string | null;
  page?: string | null;
  figmaLink?: string | null;
  jiraLink?: string | null;
}

// ============================================================================
// ATTACHMENT TYPES
// ============================================================================

/**
 * Attachment review variant enum values
 */
export type AttachmentReviewVariant = "as_is" | "to_be" | "reference";

/**
 * Attachment with uploader information
 */
export interface AttachmentWithUploader extends IssueAttachment {
  uploadedBy: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

/**
 * Data for creating a new attachment
 */
export interface CreateAttachmentData {
  teamId: string; // Denormalized for multi-tenant queries
  projectId: string; // Denormalized for multi-tenant queries
  issueId: string;
  uploadedById: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  reviewVariant?: AttachmentReviewVariant;
}

// ============================================================================
// ACTIVITY TYPES
// ============================================================================

/**
 * Activity type enum values
 */
export type ActivityType =
  | "created"
  | "status_changed"
  | "priority_changed"
  | "type_changed"
  | "title_changed"
  | "description_changed"
  | "assignee_changed"
  | "comment_added"
  | "attachment_added"
  | "attachment_removed"
  | "annotation_created"
  | "annotation_updated"
  | "annotation_commented"
  | "annotation_deleted";

/**
 * Structure for field change tracking
 */
export interface FieldChange {
  field: string;
  from: unknown;
  to: unknown;
}

/**
 * Activity with actor information
 */
export interface ActivityWithActor extends IssueActivity {
  actor: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  changes: FieldChange[] | null;
}

/**
 * Parameters for listing activities
 */
export interface ListActivitiesParams {
  issueId: string;
  type?: ActivityType;
  page?: number;
  limit?: number;
}

/**
 * Result of listing activities
 */
export interface ActivityListResult {
  items: ActivityWithActor[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Data for logging an activity
 */
export interface LogActivityData {
  teamId: string; // Denormalized for multi-tenant queries
  projectId: string; // Denormalized for multi-tenant queries
  issueId: string;
  actorId: string;
  type: ActivityType;
  changes?: FieldChange[];
  comment?: string | null;
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export type { Issue, NewIssue };
export type { IssueAttachment, NewIssueAttachment };
export type { IssueActivity, NewIssueActivity };
