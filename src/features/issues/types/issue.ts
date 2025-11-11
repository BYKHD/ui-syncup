import { ISSUE_WORKFLOW } from '@/config/workflow'

// ============================================================================
// ISSUE DOMAIN ENUMS
// ============================================================================

export type IssuePriority = 'critical' | 'high' | 'medium' | 'low'
export type IssueType = 'bug' | 'feature' | 'improvement'
export type IssueStatus = keyof typeof ISSUE_WORKFLOW

// ============================================================================
// USER & ACTOR TYPES
// ============================================================================

export interface IssueUser {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
}

// ============================================================================
// ATTACHMENT TYPES
// ============================================================================

export type AttachmentReviewVariant = 'as_is' | 'to_be' | 'reference'

export type AnnotationStatus = 'open' | 'in_review' | 'resolved'

export interface AnnotationComment {
  id: string
  annotationId: string
  author: IssueUser
  message: string
  createdAt: string
}

export interface AttachmentAnnotation {
  id: string
  attachmentId: string
  label: string
  description?: string
  status: AnnotationStatus
  x: number // relative position (0 - 1)
  y: number // relative position (0 - 1)
  author: IssueUser
  createdAt: string
  comments?: AnnotationComment[]
}

export interface IssueAttachment {
  id: string
  issueId: string
  fileName: string
  fileSize: number
  fileType: string
  url: string
  thumbnailUrl?: string | null
  width?: number | null
  height?: number | null
  uploadedBy: IssueUser
  createdAt: string
  reviewVariant?: AttachmentReviewVariant
  annotations?: AttachmentAnnotation[]
}

// ============================================================================
// CANVAS & VIEW STATE TYPES
// ============================================================================

export interface CanvasViewState {
  zoom: number
  panX: number
  panY: number
  fitMode: 'fit' | 'fill' | 'actual'
}

export interface ImageSelectorProps {
  attachments: IssueAttachment[]
  selectedAttachmentId: string
  onSelect: (attachmentId: string) => void
  layout?: 'thumbnails' | 'dropdown'
}

// ============================================================================
// WORKFLOW & STATUS TYPES
// ============================================================================

export interface StatusTransition {
  from: IssueStatus
  to: readonly IssueStatus[]
}

export const STATUS_TRANSITIONS: Record<IssueStatus, readonly IssueStatus[]> = Object.fromEntries(
  Object.entries(ISSUE_WORKFLOW).map(([status, config]) => [
    status,
    config.allowedTransitions as readonly IssueStatus[],
  ]),
) as Record<IssueStatus, readonly IssueStatus[]>

export interface WorkflowControlProps {
  currentStatus: IssueStatus
  onStatusChange: (newStatus: IssueStatus) => void
  isLoading?: boolean
  disabled?: boolean
}

// ============================================================================
// ACTIVITY TIMELINE TYPES
// ============================================================================

export type ActivityType =
  | 'created'
  | 'status_changed'
  | 'priority_changed'
  | 'type_changed'
  | 'title_changed'
  | 'description_changed'
  | 'assignee_changed'
  | 'comment_added'
  | 'attachment_added'
  | 'attachment_removed'

export interface ActivityChange {
  field: string
  oldValue?: string | null
  newValue?: string | null
}

export interface ActivityEntry {
  id: string
  issueId: string
  type: ActivityType
  actor: IssueUser
  changes?: ActivityChange[]
  comment?: string | null
  createdAt: string
}

export interface ActivityTimelineResponse {
  activities: ActivityEntry[]
  hasMore: boolean
  nextCursor: string | null
}

// ============================================================================
// PERMISSIONS TYPES
// ============================================================================

export interface IssuePermissions {
  canEdit: boolean
  canDelete: boolean
  canComment: boolean
  canAssign?: boolean
  canChangeStatus?: boolean
}

// ============================================================================
// ISSUE DETAIL TYPES
// ============================================================================

export interface IssueDetailData {
  id: string
  issueKey: string
  title: string
  description: string
  type: IssueType
  priority: IssuePriority
  status: IssueStatus
  projectId: string
  projectKey?: string
  projectName?: string
  assignee?: IssueUser | null
  reporter: IssueUser
  attachments?: IssueAttachment[]
  coverImageUrl?: string | null
  createdAt: string
  updatedAt: string
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface IssueDetailResponse {
  issue: IssueDetailData
}

export interface IssueUpdatePayload {
  field: string
  value: any
  actorId: string
}

export interface IssueUpdateResponse {
  issue: IssueDetailData
  activity?: ActivityEntry
}

export interface IssueDeletePayload {
  actorId: string
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export enum IssueDetailErrorType {
  NOT_FOUND = 'NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  ATTACHMENT_LOAD_ERROR = 'ATTACHMENT_LOAD_ERROR',
  ACTIVITY_LOAD_ERROR = 'ACTIVITY_LOAD_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class IssueDetailError extends Error {
  constructor(
    message: string,
    public type: IssueDetailErrorType,
    public statusCode?: number,
  ) {
    super(message)
    this.name = 'IssueDetailError'
  }
}

export class IssueNotFoundError extends IssueDetailError {
  constructor(issueId: string) {
    super(`Issue ${issueId} not found`, IssueDetailErrorType.NOT_FOUND, 404)
    this.name = 'IssueNotFoundError'
  }
}

export class IssuePermissionError extends IssueDetailError {
  constructor(issueId: string) {
    super(`You don't have permission to view issue ${issueId}`, IssueDetailErrorType.PERMISSION_DENIED, 403)
    this.name = 'IssuePermissionError'
  }
}

export class IssueNetworkError extends IssueDetailError {
  constructor(message: string) {
    super(message, IssueDetailErrorType.NETWORK_ERROR)
    this.name = 'IssueNetworkError'
  }
}

export class AttachmentLoadError extends IssueDetailError {
  constructor(message: string) {
    super(message, IssueDetailErrorType.ATTACHMENT_LOAD_ERROR)
    this.name = 'AttachmentLoadError'
  }
}

export class ActivityLoadError extends IssueDetailError {
  constructor(message: string) {
    super(message, IssueDetailErrorType.ACTIVITY_LOAD_ERROR)
    this.name = 'ActivityLoadError'
  }
}
