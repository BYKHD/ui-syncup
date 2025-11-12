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


export type AnnotationThread<A extends AnnotationAuthor = AnnotationAuthor> =
  AttachmentAnnotation<A>;

export const ANNOTATION_TOOL_IDS = ['pin', 'box', 'arrow'] as const;
export type AnnotationToolId = (typeof ANNOTATION_TOOL_IDS)[number];

export interface AnnotationHistoryEntry {
  id: string;
  label: string;
  timestamp: number;
}

export type AnnotationShape =
  | { type: 'pin'; position: AnnotationPosition }
  | { type: 'box'; start: AnnotationPosition; end: AnnotationPosition }
  | { type: 'arrow'; start: AnnotationPosition; end: AnnotationPosition };

export interface AnnotationDraft {
  id: string;
  tool: AnnotationToolId;
  shape: AnnotationShape;
  createdAt: number;
}
