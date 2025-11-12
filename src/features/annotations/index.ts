// ============================================================================
// ANNOTATIONS FEATURE BARREL
// ============================================================================

// Components
export { AnnotationLayer } from './components/annotation-layer';
export { AnnotationPin } from './components/annotation-pin';
export { AnnotationCommentsPanel } from './components/annotation-comments-panel';
export { AnnotationToolbar } from './components/annotation-toolbar';
export { AnnotationDrawer } from './components/annotation-drawer';

// Types
export type {
  AnnotationAuthor,
  AnnotationComment,
  AnnotationPosition,
  AnnotationStatus,
  AnnotationThread,
  AnnotationThreadMeta,
  AttachmentAnnotation,
  AnnotationToolId,
  AnnotationHistoryEntry,
  AnnotationShape,
  AnnotationDraft,
} from './types';
export { ANNOTATION_TOOL_IDS } from './types';

// Utils
export { mapAttachmentsToAnnotationThreads } from './utils';
export type { AnnotatedAttachment } from './utils';

// Hooks
export { useAnnotationTools } from './hooks/use-annotation-tools';
