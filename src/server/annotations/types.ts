/**
 * Annotation Service Types
 *
 * Type definitions for annotation server-side operations.
 */

import type { StoredAttachmentAnnotation, StoredAnnotationComment, AnnotationShape } from '@/features/annotations/types';

// ============================================================================
// CRUD OPERATION TYPES
// ============================================================================

/**
 * Data required to create a new annotation
 */
export interface CreateAnnotationData {
  attachmentId: string;
  authorId: string;
  shape: AnnotationShape;
  description?: string;
}

/**
 * Data for updating an existing annotation
 */
export interface UpdateAnnotationData {
  shape?: AnnotationShape;
  description?: string;
}

/**
 * Result of annotation creation
 */
export interface CreateAnnotationResult {
  annotation: StoredAttachmentAnnotation;
  attachmentId: string;
}

/**
 * Result of annotation update
 */
export interface UpdateAnnotationResult {
  annotation: StoredAttachmentAnnotation;
  attachmentId: string;
}

// ============================================================================
// COMMENT OPERATION TYPES
// ============================================================================

/**
 * Data required to add a comment to an annotation
 */
export interface AddCommentData {
  attachmentId: string;
  annotationId: string;
  authorId: string;
  message: string;
}

/**
 * Data for updating an existing comment
 */
export interface UpdateCommentData {
  attachmentId: string;
  annotationId: string;
  commentId: string;
  authorId: string; // For author-only check
  message: string;
}

/**
 * Data for deleting a comment
 */
export interface DeleteCommentData {
  attachmentId: string;
  annotationId: string;
  commentId: string;
  authorId: string; // For author-only check
}

/**
 * Result of comment operations
 */
export interface CommentResult {
  comment: StoredAnnotationComment;
  annotationId: string;
  attachmentId: string;
}

// ============================================================================
// QUERY TYPES
// ============================================================================

/**
 * Parameters for getting annotations with context
 */
export interface GetAnnotationsParams {
  attachmentId: string;
}

/**
 * Result of annotation query including context
 */
export interface AnnotationsQueryResult {
  annotations: StoredAttachmentAnnotation[];
  attachmentId: string;
  issueId: string;
  teamId: string;
  projectId: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class AnnotationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AnnotationError';
  }
}

export class AnnotationNotFoundError extends AnnotationError {
  constructor(annotationId: string) {
    super(`Annotation ${annotationId} not found`, 'ANNOTATION_NOT_FOUND', 404);
    this.name = 'AnnotationNotFoundError';
  }
}

export class CommentNotFoundError extends AnnotationError {
  constructor(commentId: string) {
    super(`Comment ${commentId} not found`, 'COMMENT_NOT_FOUND', 404);
    this.name = 'CommentNotFoundError';
  }
}

export class AttachmentNotFoundError extends AnnotationError {
  constructor(attachmentId: string) {
    super(`Attachment ${attachmentId} not found`, 'ATTACHMENT_NOT_FOUND', 404);
    this.name = 'AttachmentNotFoundError';
  }
}

export class AnnotationLimitError extends AnnotationError {
  constructor() {
    super('Maximum of 50 annotations per attachment exceeded', 'ANNOTATION_LIMIT_EXCEEDED', 400);
    this.name = 'AnnotationLimitError';
  }
}

export class CommentPermissionError extends AnnotationError {
  constructor(action: 'edit' | 'delete') {
    super(`You can only ${action} your own comments`, 'COMMENT_PERMISSION_DENIED', 403);
    this.name = 'CommentPermissionError';
  }
}
