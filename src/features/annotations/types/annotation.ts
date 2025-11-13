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
}
