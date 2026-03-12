import { z } from 'zod';

// ============================================================================
// POSITION SCHEMAS
// ============================================================================

/**
 * Position schema for normalized coordinates
 * Used for responsive annotation positioning across different viewport sizes
 * Note: Values can extend beyond 0-1 range to allow annotations outside canvas
 * Requirements: 10.1, 10.2
 */
export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export type Position = z.infer<typeof PositionSchema>;

// ============================================================================
// SHAPE SCHEMAS
// ============================================================================

/**
 * Pin shape schema - a point marker at specific coordinates
 */
export const PinShapeSchema = z.object({
  type: z.literal('pin'),
  position: PositionSchema,
});

/**
 * Box shape schema - a rectangular region with start and end points
 */
export const BoxShapeSchema = z.object({
  type: z.literal('box'),
  start: PositionSchema,
  end: PositionSchema,
});

/**
 * Discriminated union of annotation shapes
 */
export const AnnotationShapeSchema = z.discriminatedUnion('type', [
  PinShapeSchema,
  BoxShapeSchema,
]);

export type PinShape = z.infer<typeof PinShapeSchema>;
export type BoxShape = z.infer<typeof BoxShapeSchema>;
export type AnnotationShapeType = z.infer<typeof AnnotationShapeSchema>;

// ============================================================================
// ANNOTATION CRUD SCHEMAS
// ============================================================================

/**
 * Schema for creating a new annotation
 * Requirements: 10.1, 10.2
 */
export const CreateAnnotationSchema = z.object({
  attachmentId: z.string().uuid(),
  issueId: z.string().uuid(),
  shape: AnnotationShapeSchema,
  description: z.string().max(1000).optional(),
});

export type CreateAnnotationInput = z.infer<typeof CreateAnnotationSchema>;

/**
 * Schema for updating an existing annotation
 */
export const UpdateAnnotationSchema = z.object({
  shape: AnnotationShapeSchema.optional(),
  description: z.string().max(1000).optional(),
});

export type UpdateAnnotationInput = z.infer<typeof UpdateAnnotationSchema>;

// ============================================================================
// COMMENT CRUD SCHEMAS
// ============================================================================

/**
 * Schema for creating a new comment on an annotation
 */
export const CreateCommentSchema = z.object({
  message: z.string().min(1).max(5000),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;

/**
 * Schema for updating an existing comment
 */
export const UpdateCommentSchema = z.object({
  message: z.string().min(1).max(5000),
});

export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;

// ============================================================================
// STORED JSONB SCHEMAS (for database operations)
// ============================================================================

/**
 * Schema for stored annotation comment in JSONB
 */
export const StoredAnnotationCommentSchema = z.object({
  id: z.string().uuid(),
  authorId: z.string().uuid(),
  message: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type StoredAnnotationComment = z.infer<typeof StoredAnnotationCommentSchema>;

/**
 * Schema for stored annotation in JSONB (within issue_attachments.annotations)
 */
export const StoredAttachmentAnnotationSchema = z.object({
  id: z.string().uuid(),
  authorId: z.string().uuid(),
  x: z.number(),
  y: z.number(),
  shape: AnnotationShapeSchema,
  label: z.string(),
  description: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  comments: z.array(StoredAnnotationCommentSchema).default([]),
});

export type StoredAttachmentAnnotation = z.infer<typeof StoredAttachmentAnnotationSchema>;

/**
 * Schema for the annotations JSONB array in issue_attachments
 */
export const AnnotationsArraySchema = z.array(StoredAttachmentAnnotationSchema).max(50);

export type AnnotationsArray = z.infer<typeof AnnotationsArraySchema>;
