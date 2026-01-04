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
export { AnnotationAnnotationsPanel } from './components/annotation-annotations-panel';
export type { AnnotationAnnotationsPanelProps } from './components/annotation-annotations-panel';
export { AnnotationThreadPreview } from './components/annotation-thread-preview';
export type { AnnotationThreadPreviewProps } from './components/annotation-thread-preview';
export { AnnotationToolbar } from './components/annotation-toolbar';
export type { AnnotationToolbarProps } from './components/annotation-toolbar';
export { AnnotationDrawer } from './components/annotation-drawer';
export { AnnotatedAttachmentView } from './components/annotated-attachment-view';
export type { AnnotatedAttachmentViewProps } from './components/annotated-attachment-view';
export { AnnotationThreadPanel } from './components/annotation-thread-panel';
export type { AnnotationThreadPanelProps } from './components/annotation-thread-panel';
export { KeyboardShortcutsModal } from './components/keyboard-shortcuts-modal';
export type { KeyboardShortcutsModalProps } from './components/keyboard-shortcuts-modal';
export { AnnotationPopover } from './components/annotation-popover';


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
  AnnotationPermissions,
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
export { useAnnotationEditState } from './hooks/use-annotation-edit-state';
export type { AnnotationEditState, UseAnnotationEditStateReturn } from './hooks/use-annotation-edit-state';

// Phase 4 Integration Hooks
export {
  useAnnotationIntegration,
  annotationKeys,
  type UseAnnotationIntegrationOptions,
  type UseAnnotationIntegrationResult,
} from './hooks/use-annotation-integration';

export {
  useAnnotationComments,
  type UseAnnotationCommentsOptions,
  type UseAnnotationCommentsResult,
} from './hooks/use-annotation-comments';

export {
  useAnnotationPermissions,
  useCanPerformAnnotationAction,
  type UseAnnotationPermissionsOptions,
  type UseAnnotationPermissionsResult,
} from './hooks/use-annotation-permissions';

// UX Enhancement Hooks
export {
  useAnnotationBatchSave,
  type UseAnnotationBatchSaveOptions,
  type UseAnnotationBatchSaveResult,
  type BatchSaveItem,
} from './hooks/use-annotation-batch-save';

export {
  useAutoSave,
  type UseAutoSaveOptions,
  type UseAutoSaveResult,
} from './hooks/use-auto-save';

export {
  useAnnotationPopover,
  type PopoverMode,
  type PopoverState,
} from './hooks/use-annotation-popover';

