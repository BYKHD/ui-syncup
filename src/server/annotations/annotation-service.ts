/**
 * Annotation Service
 *
 * Core business logic for annotation CRUD operations.
 * Annotations are stored as a JSONB array within the issue_attachments table.
 *
 * Requirements: 1.4, 2.1, 4.3, 4.5, 13.3, 13.5
 */

import { db } from '@/lib/db';
import { issueAttachments } from '@/server/db/schema/issue-attachments';
import { eq, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { randomUUID } from 'crypto';
import type { StoredAttachmentAnnotation, AnnotationShape } from '@/features/annotations/types';
import {
  AnnotationNotFoundError,
  AttachmentNotFoundError,
  AnnotationLimitError,
  type CreateAnnotationData,
  type UpdateAnnotationData,
  type CreateAnnotationResult,
  type UpdateAnnotationResult,
  type AnnotationsQueryResult,
} from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Maximum annotations per attachment (enforced by DB constraint)
 */
export const MAX_ANNOTATIONS_PER_ATTACHMENT = 50;

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get all annotations for an attachment
 *
 * @param attachmentId - Attachment UUID
 * @returns Annotations query result with context
 * @throws AttachmentNotFoundError if attachment doesn't exist
 */
export async function getAnnotationsByAttachment(
  attachmentId: string
): Promise<AnnotationsQueryResult> {
  const attachment = await db.query.issueAttachments.findFirst({
    where: eq(issueAttachments.id, attachmentId),
    columns: {
      id: true,
      issueId: true,
      teamId: true,
      projectId: true,
      annotations: true,
    },
  });

  if (!attachment) {
    throw new AttachmentNotFoundError(attachmentId);
  }

  const annotations = (attachment.annotations as StoredAttachmentAnnotation[]) || [];

  return {
    annotations,
    attachmentId: attachment.id,
    issueId: attachment.issueId,
    teamId: attachment.teamId,
    projectId: attachment.projectId,
  };
}

/**
 * Get a single annotation by ID
 *
 * @param attachmentId - Attachment UUID
 * @param annotationId - Annotation UUID
 * @returns Annotation or null if not found
 */
export async function getAnnotationById(
  attachmentId: string,
  annotationId: string
): Promise<StoredAttachmentAnnotation | null> {
  const result = await getAnnotationsByAttachment(attachmentId);
  return result.annotations.find((a) => a.id === annotationId) || null;
}

/**
 * Get annotation count for an attachment
 *
 * @param attachmentId - Attachment UUID
 * @returns Number of annotations
 */
export async function getAnnotationCount(attachmentId: string): Promise<number> {
  const result = await db
    .select({
      count: sql<number>`jsonb_array_length(${issueAttachments.annotations})`,
    })
    .from(issueAttachments)
    .where(eq(issueAttachments.id, attachmentId));

  return result[0]?.count ?? 0;
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

/**
 * Create a new annotation
 *
 * Appends to the JSONB array with limit check (max 50).
 *
 * @param data - Annotation creation data
 * @returns Created annotation result
 * @throws AttachmentNotFoundError if attachment doesn't exist
 * @throws AnnotationLimitError if limit exceeded
 */
export async function createAnnotation(
  data: CreateAnnotationData
): Promise<CreateAnnotationResult> {
  const { attachmentId, authorId, shape, description } = data;

  // Get current annotation count
  const currentCount = await getAnnotationCount(attachmentId);
  
  if (currentCount >= MAX_ANNOTATIONS_PER_ATTACHMENT) {
    throw new AnnotationLimitError();
  }

  // Generate label based on position (next number)
  const label = String(currentCount + 1);

  // Extract x, y from shape for backward compatibility
  const { x, y } = extractCoordinates(shape);

  const now = new Date().toISOString();
  const annotationId = randomUUID();

  const newAnnotation: StoredAttachmentAnnotation = {
    id: annotationId,
    authorId,
    x,
    y,
    shape,
    label,
    description,
    createdAt: now,
    updatedAt: now,
    comments: [],
  };

  // Append to JSONB array
  const [updated] = await db
    .update(issueAttachments)
    .set({
      annotations: sql`${issueAttachments.annotations} || ${JSON.stringify(newAnnotation)}::jsonb`,
    })
    .where(eq(issueAttachments.id, attachmentId))
    .returning({ id: issueAttachments.id });

  if (!updated) {
    throw new AttachmentNotFoundError(attachmentId);
  }

  logger.info('annotation.created', {
    annotationId,
    attachmentId,
    authorId,
    shape: shape.type,
  });

  return {
    annotation: newAnnotation,
    attachmentId,
  };
}

/**
 * Update an annotation
 *
 * @param attachmentId - Attachment UUID
 * @param annotationId - Annotation UUID
 * @param data - Update data
 * @returns Updated annotation result
 * @throws AttachmentNotFoundError if attachment doesn't exist
 * @throws AnnotationNotFoundError if annotation doesn't exist
 */
export async function updateAnnotation(
  attachmentId: string,
  annotationId: string,
  data: UpdateAnnotationData
): Promise<UpdateAnnotationResult> {
  // Get current annotations
  const result = await getAnnotationsByAttachment(attachmentId);
  const annotationIndex = result.annotations.findIndex((a) => a.id === annotationId);

  if (annotationIndex === -1) {
    throw new AnnotationNotFoundError(annotationId);
  }

  const existingAnnotation = result.annotations[annotationIndex];
  const now = new Date().toISOString();

  // Build updated annotation
  const updatedAnnotation: StoredAttachmentAnnotation = {
    ...existingAnnotation,
    updatedAt: now,
  };

  if (data.shape !== undefined) {
    updatedAnnotation.shape = data.shape;
    const { x, y } = extractCoordinates(data.shape);
    updatedAnnotation.x = x;
    updatedAnnotation.y = y;
  }

  if (data.description !== undefined) {
    updatedAnnotation.description = data.description;
  }

  // Update annotation in JSONB array
  const updatedAnnotations = [...result.annotations];
  updatedAnnotations[annotationIndex] = updatedAnnotation;

  await db
    .update(issueAttachments)
    .set({
      annotations: sql`${JSON.stringify(updatedAnnotations)}::jsonb`,
    })
    .where(eq(issueAttachments.id, attachmentId));

  logger.info('annotation.updated', {
    annotationId,
    attachmentId,
    changes: Object.keys(data),
  });

  return {
    annotation: updatedAnnotation,
    attachmentId,
  };
}

/**
 * Delete an annotation
 *
 * @param attachmentId - Attachment UUID
 * @param annotationId - Annotation UUID
 * @throws AttachmentNotFoundError if attachment doesn't exist
 * @throws AnnotationNotFoundError if annotation doesn't exist
 */
export async function deleteAnnotation(
  attachmentId: string,
  annotationId: string
): Promise<void> {
  // Get current annotations
  const result = await getAnnotationsByAttachment(attachmentId);
  const annotationIndex = result.annotations.findIndex((a) => a.id === annotationId);

  if (annotationIndex === -1) {
    throw new AnnotationNotFoundError(annotationId);
  }

  // Remove annotation and re-label remaining annotations
  const updatedAnnotations = result.annotations
    .filter((a) => a.id !== annotationId)
    .map((a, index) => ({
      ...a,
      label: String(index + 1), // Re-number labels
    }));

  await db
    .update(issueAttachments)
    .set({
      annotations: sql`${JSON.stringify(updatedAnnotations)}::jsonb`,
    })
    .where(eq(issueAttachments.id, attachmentId));

  logger.info('annotation.deleted', {
    annotationId,
    attachmentId,
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract x, y coordinates from a shape
 */
function extractCoordinates(shape: AnnotationShape): { x: number; y: number } {
  if (shape.type === 'pin') {
    return shape.position;
  }
  // For box, use center point
  return {
    x: (shape.start.x + shape.end.x) / 2,
    y: (shape.start.y + shape.end.y) / 2,
  };
}
