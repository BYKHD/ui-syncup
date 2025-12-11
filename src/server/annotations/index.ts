/**
 * Annotation Server Services
 *
 * Barrel export for all annotation-related server-side services.
 */

// Annotation CRUD
export {
  getAnnotationsByAttachment,
  getAnnotationById,
  getAnnotationCount,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
  MAX_ANNOTATIONS_PER_ATTACHMENT,
} from './annotation-service';

// Comment operations
export {
  addComment,
  updateComment,
  deleteComment,
  getCommentsByAnnotation,
  getCommentCount,
} from './comment-service';

// Permission utilities
export {
  getAnnotationPermissions,
  canPerformAction,
} from './permission-utils';

// Sanitization
export {
  sanitizeComment,
  containsDangerousContent,
} from './sanitize';

// Types
export type {
  CreateAnnotationData,
  UpdateAnnotationData,
  CreateAnnotationResult,
  UpdateAnnotationResult,
  AddCommentData,
  UpdateCommentData,
  DeleteCommentData,
  CommentResult,
  GetAnnotationsParams,
  AnnotationsQueryResult,
} from './types';

// Errors
export {
  AnnotationError,
  AnnotationNotFoundError,
  CommentNotFoundError,
  AttachmentNotFoundError,
  AnnotationLimitError,
  CommentPermissionError,
} from './types';
