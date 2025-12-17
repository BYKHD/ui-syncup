/**
 * Comment API Functions
 *
 * CRUD operations for annotation comments connecting to Phase 3 API endpoints.
 * Handles comment add, update, delete, and read status operations.
 *
 * @module features/annotations/api/comments-api
 */

import { apiClient } from '@/lib/api-client';
import type { AnnotationAuthor } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface CommentWithAuthor {
  id: string;
  authorId: string;
  author: AnnotationAuthor;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddCommentRequest {
  message: string;
  [key: string]: unknown; // Index signature for apiClient body type
}

export interface AddCommentResponse {
  comment: CommentWithAuthor;
}

export interface UpdateCommentRequest {
  message: string;
  [key: string]: unknown; // Index signature for apiClient body type
}

export interface UpdateCommentResponse {
  comment: CommentWithAuthor;
}

export interface MarkAsReadResponse {
  success: boolean;
  lastReadAt: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Add a comment to an annotation
 *
 * @param issueId - Issue UUID
 * @param attachmentId - Attachment UUID
 * @param annotationId - Annotation UUID
 * @param message - Comment message
 */
export async function addComment(
  issueId: string,
  attachmentId: string,
  annotationId: string,
  message: string
): Promise<AddCommentResponse> {
  return apiClient<AddCommentResponse>(
    `/api/issues/${issueId}/attachments/${attachmentId}/annotations/${annotationId}/comments`,
    {
      method: 'POST',
      body: { message } as AddCommentRequest,
    }
  );
}

/**
 * Update an existing comment
 *
 * Only the comment author can update their comment.
 *
 * @param issueId - Issue UUID
 * @param attachmentId - Attachment UUID
 * @param annotationId - Annotation UUID
 * @param commentId - Comment UUID
 * @param message - Updated message
 */
export async function updateComment(
  issueId: string,
  attachmentId: string,
  annotationId: string,
  commentId: string,
  message: string
): Promise<UpdateCommentResponse> {
  return apiClient<UpdateCommentResponse>(
    `/api/issues/${issueId}/attachments/${attachmentId}/annotations/${annotationId}/comments/${commentId}`,
    {
      method: 'PATCH',
      body: { message } as UpdateCommentRequest,
    }
  );
}

/**
 * Delete a comment
 *
 * Only the comment author can delete their comment.
 *
 * @param issueId - Issue UUID
 * @param attachmentId - Attachment UUID
 * @param annotationId - Annotation UUID
 * @param commentId - Comment UUID
 */
export async function deleteComment(
  issueId: string,
  attachmentId: string,
  annotationId: string,
  commentId: string
): Promise<void> {
  await apiClient<void>(
    `/api/issues/${issueId}/attachments/${attachmentId}/annotations/${annotationId}/comments/${commentId}`,
    {
      method: 'DELETE',
    }
  );
}

/**
 * Mark an annotation as read by the current user
 *
 * Updates the read status timestamp for tracking unread comments.
 *
 * @param issueId - Issue UUID
 * @param attachmentId - Attachment UUID
 * @param annotationId - Annotation UUID
 */
export async function markAsRead(
  issueId: string,
  attachmentId: string,
  annotationId: string
): Promise<MarkAsReadResponse> {
  return apiClient<MarkAsReadResponse>(
    `/api/issues/${issueId}/attachments/${attachmentId}/annotations/${annotationId}/read`,
    {
      method: 'POST',
    }
  );
}
