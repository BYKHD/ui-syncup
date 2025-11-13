// ============================================================================
// ANNOTATIONS FEATURE BARREL
// ============================================================================

// Components
export { AnnotationLayer } from './components/annotation-layer';
export type { AnnotationLayerProps, ShapedAnnotation } from './components/annotation-layer';
export { AnnotationPin } from './components/annotation-pin';
export type { AnnotationPinProps } from './components/annotation-pin';
export { AnnotationBox } from './components/annotation-box';
export type { AnnotationBoxProps, BoxAnnotation } from './components/annotation-box';
export { AnnotationCanvas } from './components/annotation-canvas';
export type { AnnotationCanvasProps } from './components/annotation-canvas';
export { AnnotationCommentInput } from './components/annotation-comment-input';
export type { AnnotationCommentInputProps } from './components/annotation-comment-input';
export { AnnotationCommentsPanel } from './components/annotation-comments-panel';
export { AnnotationToolbar } from './components/annotation-toolbar';
export type { AnnotationToolbarProps } from './components/annotation-toolbar';
export { AnnotationDrawer } from './components/annotation-drawer';

// Types
export type {
  AnnotationAuthor,
  AnnotationComment,
  AnnotationPosition,
  AnnotationThread,
  AnnotationThreadMeta,
  AttachmentAnnotation,
  AnnotationToolId,
  AnnotationHistoryEntry,
  AnnotationShape,
  AnnotationDraft,
  AnnotationActionType,
  AnnotationSnapshot,
} from './types';
export { ANNOTATION_TOOL_IDS } from './types';

// Utils
export { mapAttachmentsToAnnotationThreads } from './utils';
export type { AnnotatedAttachment } from './utils';
export {
  createHistoryEntry,
  createSnapshot,
  addToHistory,
  shapesAreEqual,
} from './utils/history-manager';

// Hooks
export { useAnnotationTools } from './hooks/use-annotation-tools';
export { useAnnotationDrafts, draftToAnnotation } from './hooks/use-annotation-drafts';
export type { UseAnnotationDraftsOptions, UseAnnotationDraftsReturn } from './hooks/use-annotation-drafts';
export { useAnnotationsWithHistory } from './hooks/use-annotations-with-history';
export type { UseAnnotationsWithHistoryOptions } from './hooks/use-annotations-with-history';
export { useAnnotationSave } from './hooks/use-annotation-save';
export type { UseAnnotationSaveOptions, UseAnnotationSaveReturn } from './hooks/use-annotation-save';
