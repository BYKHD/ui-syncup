// ============================================================================
// ANNOTATION API EXPORTS
// ============================================================================

export {
  // Position schemas
  PositionSchema,
  type Position,
  // Shape schemas
  PinShapeSchema,
  BoxShapeSchema,
  AnnotationShapeSchema,
  type PinShape,
  type BoxShape,
  type AnnotationShapeType,
  // Annotation CRUD schemas
  CreateAnnotationSchema,
  UpdateAnnotationSchema,
  type CreateAnnotationInput,
  type UpdateAnnotationInput,
  // Comment CRUD schemas
  CreateCommentSchema,
  UpdateCommentSchema,
  type CreateCommentInput,
  type UpdateCommentInput,
  // Stored JSONB schemas
  StoredAnnotationCommentSchema,
  StoredAttachmentAnnotationSchema,
  AnnotationsArraySchema,
  type StoredAnnotationComment,
  type StoredAttachmentAnnotation,
  type AnnotationsArray,
} from './schemas';

// Mock API functions (to be replaced with real implementations in Phase 3)
export {
  saveAnnotationPosition,
  createAnnotation,
  type SaveAnnotationPositionParams,
  type SaveAnnotationPositionResponse,
  type CreateAnnotationParams,
  type CreateAnnotationResponse,
} from './save-annotation';

// Phase 4: Real API functions
export {
  getAnnotations,
  createAnnotation as createAnnotationApi,
  updateAnnotation,
  deleteAnnotation,
  transformToAttachmentAnnotation,
  type AnnotationWithAuthor,
  type GetAnnotationsResponse,
  type CreateAnnotationRequest,
  type CreateAnnotationResponse as CreateAnnotationApiResponse,
  type UpdateAnnotationRequest,
  type UpdateAnnotationResponse,
} from './annotations-api';

export {
  addComment,
  updateComment,
  deleteComment,
  markAsRead,
  type CommentWithAuthor,
  type AddCommentRequest,
  type AddCommentResponse,
  type UpdateCommentRequest,
  type UpdateCommentResponse,
  type MarkAsReadResponse,
} from './comments-api';
