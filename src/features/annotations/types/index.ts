export type {
  AnnotationAuthor,
  AnnotationComment,
  AnnotationPosition,
  AttachmentAnnotation,
  AnnotationThread,
  AnnotationThreadMeta,
  AnnotationToolId,
  AnnotationHistoryEntry,
  AnnotationShape,
  AnnotationDraft,
  AnnotationActionType,
  AnnotationSnapshot,
  AnnotationSaveStatus,
  AnnotationSaveState,
  AnnotationSaveOperation,
  // Local-first autosave types
  UpdateAnnotationMutationVariables,
  UnsavedAnnotationState,
  // Stored JSONB types (Task 6.2)
  PinShape,
  BoxShape,
  StoredAnnotationComment,
  StoredAttachmentAnnotation,
  // Permissions types (Task 6.3)
  AnnotationPermissions,
} from './annotation';
export { ANNOTATION_TOOL_IDS, ANNOTATION_SAVE_STATUS } from './annotation';
