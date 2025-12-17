// ============================================================================
// ANNOTATION DOMAIN TYPES
// ============================================================================

export interface AnnotationAuthor {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
}

export interface AnnotationPosition {
  x: number;
  y: number;
}

export interface AnnotationComment<A extends AnnotationAuthor = AnnotationAuthor> {
  id: string;
  annotationId: string;
  author: A;
  message: string;
  createdAt: string;
}

export interface AttachmentAnnotation<A extends AnnotationAuthor = AnnotationAuthor> {
  id: string;
  attachmentId: string;
  label: string;
  description?: string;
  x: number;
  y: number;
  author: A;
  createdAt: string;
  comments?: AnnotationComment<A>[];
  shape?: AnnotationShape; // Optional shape metadata for rendering different annotation types
}


export interface AnnotationThreadMeta {
  attachmentName?: string;
  attachmentVariant?: string | null;
  attachmentPreview?: string | null;
}

export type AnnotationThread<A extends AnnotationAuthor = AnnotationAuthor> =
  AttachmentAnnotation<A> & AnnotationThreadMeta;

export const ANNOTATION_TOOL_IDS = ['cursor','pin', 'box'] as const;
export type AnnotationToolId = (typeof ANNOTATION_TOOL_IDS)[number];

export type AnnotationShape =
  | { type: 'pin'; position: AnnotationPosition }
  | { type: 'box'; start: AnnotationPosition; end: AnnotationPosition };

export interface AnnotationDraft {
  id: string;
  tool: AnnotationToolId;
  shape: AnnotationShape;
  createdAt: number;
}

// ============================================================================
// UNDO/REDO HISTORY TYPES
// ============================================================================

export type AnnotationActionType = 'create' | 'move' | 'resize' | 'delete';

export interface AnnotationSnapshot {
  id: string;
  shape: AnnotationShape;
}

export interface AnnotationHistoryEntry {
  id: string;
  action: AnnotationActionType;
  timestamp: number;
  annotationId: string;
  snapshot: AnnotationSnapshot;
  previousSnapshot?: AnnotationSnapshot; // For move/resize operations
  fullAnnotation?: AttachmentAnnotation; // For create/delete operations - stores complete annotation for restoration
}

// ============================================================================
// ANNOTATION SAVE STATE TYPES
// ============================================================================

export const ANNOTATION_SAVE_STATUS = ['idle', 'saving', 'success', 'error'] as const;
export type AnnotationSaveStatus = (typeof ANNOTATION_SAVE_STATUS)[number];

export interface AnnotationSaveState {
  status: AnnotationSaveStatus;
  error?: string;
  lastSavedAt?: number;
}

export interface AnnotationSaveOperation {
  type: 'create' | 'update' | 'delete';
  annotationId: string;
  attachmentId: string;
}

// ============================================================================
// LOCAL-FIRST AUTOSAVE TYPES
// ============================================================================

/**
 * Mutation variables for annotation update with client revision tracking.
 * clientRevision is used to detect and ignore stale ACKs from out-of-order responses.
 */
export interface UpdateAnnotationMutationVariables {
  annotationId: string;
  shape?: AnnotationShape;
  description?: string;
  clientRevision: number;
}

/**
 * Tracks unsaved annotation state for UI indication
 */
export interface UnsavedAnnotationState {
  error?: Error;
  retryCount: number;
}

// ============================================================================
// STORED JSONB TYPES (for database persistence)
// These types match the JSONB structure stored in issue_attachments.annotations
// Requirements: 13.2
// ============================================================================

/**
 * Pin shape interface for clear type discrimination
 */
export interface PinShape {
  type: 'pin';
  position: AnnotationPosition;
}

/**
 * Box shape interface for clear type discrimination
 */
export interface BoxShape {
  type: 'box';
  start: AnnotationPosition;
  end: AnnotationPosition;
}

/**
 * Stored annotation comment structure in JSONB
 * Uses authorId instead of nested author object for denormalization
 */
export interface StoredAnnotationComment {
  id: string;
  authorId: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Stored attachment annotation structure in JSONB
 * Uses authorId instead of nested author object for denormalization
 */
export interface StoredAttachmentAnnotation {
  id: string;
  authorId: string;
  x: number;
  y: number;
  shape: AnnotationShape;
  label: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  comments: StoredAnnotationComment[];
}

// ============================================================================
// ANNOTATION PERMISSIONS TYPES
// Requirements: 8.1, 8.2, 8.3
// ============================================================================

/**
 * Permission flags for annotation operations
 * Derived from user's team/project role
 */
export interface AnnotationPermissions {
  /** Can view annotations on attachments */
  canView: boolean;
  /** Can create new annotations */
  canCreate: boolean;
  /** Can edit own annotations (move, resize, update description) */
  canEdit: boolean;
  /** Can edit any annotation regardless of author (TEAM_EDITOR+) */
  canEditAll: boolean;
  /** Can delete own annotations */
  canDelete: boolean;
  /** Can delete any annotation regardless of author (TEAM_EDITOR+) */
  canDeleteAll: boolean;
  /** Can add comments to annotations */
  canComment: boolean;
}
