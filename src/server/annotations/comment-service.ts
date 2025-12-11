/**
 * Comment Service
 *
 * Manages comments within annotations stored in the JSONB structure.
 * Comments are nested within annotations in the issue_attachments.annotations array.
 *
 * Requirements: 3.2, 11.1, 11.2, 11.3, 11.4
 */

import { db } from '@/lib/db';
import { issueAttachments } from '@/server/db/schema/issue-attachments';
import { eq, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { randomUUID } from 'crypto';
import type { StoredAnnotationComment } from '@/features/annotations/types';
import { getAnnotationsByAttachment } from './annotation-service';
import { sanitizeComment, containsDangerousContent } from './sanitize';
import {
  AnnotationNotFoundError,
  CommentNotFoundError,
  CommentPermissionError,
  type AddCommentData,
  type UpdateCommentData,
  type DeleteCommentData,
  type CommentResult,
} from './types';

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

/**
 * Add a comment to an annotation
 *
 * @param data - Comment data including message and author
 * @returns Created comment result
 * @throws AnnotationNotFoundError if annotation doesn't exist
 */
export async function addComment(data: AddCommentData): Promise<CommentResult> {
  const { attachmentId, annotationId, authorId, message } = data;

  // Log if dangerous content was detected
  if (containsDangerousContent(message)) {
    logger.warn('comment.dangerous_content_detected', {
      attachmentId,
      annotationId,
      authorId,
    });
  }

  // Sanitize message
  const sanitizedMessage = sanitizeComment(message);

  // Get current annotations
  const result = await getAnnotationsByAttachment(attachmentId);
  const annotationIndex = result.annotations.findIndex((a) => a.id === annotationId);

  if (annotationIndex === -1) {
    throw new AnnotationNotFoundError(annotationId);
  }

  const annotation = result.annotations[annotationIndex];
  const now = new Date().toISOString();
  const commentId = randomUUID();

  const newComment: StoredAnnotationComment = {
    id: commentId,
    authorId,
    message: sanitizedMessage,
    createdAt: now,
    updatedAt: now,
  };

  // Add comment to annotation
  const updatedAnnotation = {
    ...annotation,
    comments: [...annotation.comments, newComment],
    updatedAt: now,
  };

  // Update annotations array
  const updatedAnnotations = [...result.annotations];
  updatedAnnotations[annotationIndex] = updatedAnnotation;

  await db
    .update(issueAttachments)
    .set({
      annotations: sql`${JSON.stringify(updatedAnnotations)}::jsonb`,
    })
    .where(eq(issueAttachments.id, attachmentId));

  logger.info('comment.added', {
    commentId,
    annotationId,
    attachmentId,
    authorId,
  });

  return {
    comment: newComment,
    annotationId,
    attachmentId,
  };
}

/**
 * Update a comment
 *
 * Only the comment author can update their comment.
 *
 * @param data - Update data including new message
 * @returns Updated comment result
 * @throws AnnotationNotFoundError if annotation doesn't exist
 * @throws CommentNotFoundError if comment doesn't exist
 * @throws CommentPermissionError if user is not the author
 */
export async function updateComment(data: UpdateCommentData): Promise<CommentResult> {
  const { attachmentId, annotationId, commentId, authorId, message } = data;

  // Sanitize message
  const sanitizedMessage = sanitizeComment(message);

  // Get current annotations
  const result = await getAnnotationsByAttachment(attachmentId);
  const annotationIndex = result.annotations.findIndex((a) => a.id === annotationId);

  if (annotationIndex === -1) {
    throw new AnnotationNotFoundError(annotationId);
  }

  const annotation = result.annotations[annotationIndex];
  const commentIndex = annotation.comments.findIndex((c) => c.id === commentId);

  if (commentIndex === -1) {
    throw new CommentNotFoundError(commentId);
  }

  const existingComment = annotation.comments[commentIndex];

  // Author-only check
  if (existingComment.authorId !== authorId) {
    throw new CommentPermissionError('edit');
  }

  const now = new Date().toISOString();

  const updatedComment: StoredAnnotationComment = {
    ...existingComment,
    message: sanitizedMessage,
    updatedAt: now,
  };

  // Update comment in annotation
  const updatedComments = [...annotation.comments];
  updatedComments[commentIndex] = updatedComment;

  const updatedAnnotation = {
    ...annotation,
    comments: updatedComments,
    updatedAt: now,
  };

  // Update annotations array
  const updatedAnnotations = [...result.annotations];
  updatedAnnotations[annotationIndex] = updatedAnnotation;

  await db
    .update(issueAttachments)
    .set({
      annotations: sql`${JSON.stringify(updatedAnnotations)}::jsonb`,
    })
    .where(eq(issueAttachments.id, attachmentId));

  logger.info('comment.updated', {
    commentId,
    annotationId,
    attachmentId,
    authorId,
  });

  return {
    comment: updatedComment,
    annotationId,
    attachmentId,
  };
}

/**
 * Delete a comment
 *
 * Only the comment author can delete their comment.
 *
 * @param data - Delete data including comment and author info
 * @throws AnnotationNotFoundError if annotation doesn't exist
 * @throws CommentNotFoundError if comment doesn't exist
 * @throws CommentPermissionError if user is not the author
 */
export async function deleteComment(data: DeleteCommentData): Promise<void> {
  const { attachmentId, annotationId, commentId, authorId } = data;

  // Get current annotations
  const result = await getAnnotationsByAttachment(attachmentId);
  const annotationIndex = result.annotations.findIndex((a) => a.id === annotationId);

  if (annotationIndex === -1) {
    throw new AnnotationNotFoundError(annotationId);
  }

  const annotation = result.annotations[annotationIndex];
  const comment = annotation.comments.find((c) => c.id === commentId);

  if (!comment) {
    throw new CommentNotFoundError(commentId);
  }

  // Author-only check
  if (comment.authorId !== authorId) {
    throw new CommentPermissionError('delete');
  }

  const now = new Date().toISOString();

  // Remove comment from annotation
  const updatedAnnotation = {
    ...annotation,
    comments: annotation.comments.filter((c) => c.id !== commentId),
    updatedAt: now,
  };

  // Update annotations array
  const updatedAnnotations = [...result.annotations];
  updatedAnnotations[annotationIndex] = updatedAnnotation;

  await db
    .update(issueAttachments)
    .set({
      annotations: sql`${JSON.stringify(updatedAnnotations)}::jsonb`,
    })
    .where(eq(issueAttachments.id, attachmentId));

  logger.info('comment.deleted', {
    commentId,
    annotationId,
    attachmentId,
    authorId,
  });
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get all comments for an annotation
 *
 * @param attachmentId - Attachment UUID
 * @param annotationId - Annotation UUID
 * @returns Array of comments
 * @throws AnnotationNotFoundError if annotation doesn't exist
 */
export async function getCommentsByAnnotation(
  attachmentId: string,
  annotationId: string
): Promise<StoredAnnotationComment[]> {
  const result = await getAnnotationsByAttachment(attachmentId);
  const annotation = result.annotations.find((a) => a.id === annotationId);

  if (!annotation) {
    throw new AnnotationNotFoundError(annotationId);
  }

  return annotation.comments;
}

/**
 * Get comment count for an annotation
 *
 * @param attachmentId - Attachment UUID
 * @param annotationId - Annotation UUID
 * @returns Number of comments
 */
export async function getCommentCount(
  attachmentId: string,
  annotationId: string
): Promise<number> {
  const comments = await getCommentsByAnnotation(attachmentId, annotationId);
  return comments.length;
}
