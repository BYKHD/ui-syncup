/**
 * Annotation API Functions
 *
 * CRUD operations for annotations connecting to Phase 3 API endpoints.
 * Uses apiClient for consistent error handling and credentials.
 *
 * @module features/annotations/api/annotations-api
 */

import { apiClient } from '@/lib/api-client';
import type { AnnotationShape, AttachmentAnnotation } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface AnnotationWithAuthor {
  id: string;
  attachmentId: string;
  authorId: string;
  author: {
    id: string;
    name: string;
    email: string | null;
    avatarUrl: string | null;
  };
  x: number;
  y: number;
  shape: AnnotationShape;
  label: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  comments: Array<{
    id: string;
    authorId: string;
    author: {
      id: string;
      name: string;
      email: string | null;
      avatarUrl: string | null;
    };
    message: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface GetAnnotationsResponse {
  annotations: AnnotationWithAuthor[];
}

export interface CreateAnnotationRequest {
  shape: AnnotationShape;
  description?: string;
  [key: string]: unknown; // Index signature for apiClient body type
}

export interface CreateAnnotationResponse {
  annotation: AnnotationWithAuthor;
}

export interface UpdateAnnotationRequest {
  shape?: AnnotationShape;
  description?: string;
  [key: string]: unknown; // Index signature for apiClient body type
}

export interface UpdateAnnotationResponse {
  annotation: AnnotationWithAuthor;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get all annotations for an attachment
 *
 * @param issueId - Issue UUID
 * @param attachmentId - Attachment UUID
 */
export async function getAnnotations(
  issueId: string,
  attachmentId: string
): Promise<GetAnnotationsResponse> {
  return apiClient<GetAnnotationsResponse>(
    `/api/issues/${issueId}/attachments/${attachmentId}/annotations`
  );
}

/**
 * Create a new annotation on an attachment
 *
 * @param issueId - Issue UUID
 * @param attachmentId - Attachment UUID
 * @param data - Annotation shape and optional description
 */
export async function createAnnotation(
  issueId: string,
  attachmentId: string,
  data: CreateAnnotationRequest
): Promise<CreateAnnotationResponse> {
  return apiClient<CreateAnnotationResponse>(
    `/api/issues/${issueId}/attachments/${attachmentId}/annotations`,
    {
      method: 'POST',
      body: data,
    }
  );
}

/**
 * Update an existing annotation
 *
 * @param issueId - Issue UUID
 * @param attachmentId - Attachment UUID
 * @param annotationId - Annotation UUID
 * @param data - Updated shape and/or description
 */
export async function updateAnnotation(
  issueId: string,
  attachmentId: string,
  annotationId: string,
  data: UpdateAnnotationRequest
): Promise<UpdateAnnotationResponse> {
  return apiClient<UpdateAnnotationResponse>(
    `/api/issues/${issueId}/attachments/${attachmentId}/annotations/${annotationId}`,
    {
      method: 'PATCH',
      body: data,
    }
  );
}

/**
 * Delete an annotation
 *
 * @param issueId - Issue UUID
 * @param attachmentId - Attachment UUID
 * @param annotationId - Annotation UUID
 */
export async function deleteAnnotation(
  issueId: string,
  attachmentId: string,
  annotationId: string
): Promise<void> {
  await apiClient<void>(
    `/api/issues/${issueId}/attachments/${attachmentId}/annotations/${annotationId}`,
    {
      method: 'DELETE',
    }
  );
}

// ============================================================================
// TRANSFORM HELPERS
// ============================================================================

/**
 * Transform API annotation to frontend AttachmentAnnotation type
 */
export function transformToAttachmentAnnotation(
  apiAnnotation: AnnotationWithAuthor
): AttachmentAnnotation {
  return {
    id: apiAnnotation.id,
    attachmentId: apiAnnotation.attachmentId,
    label: apiAnnotation.label,
    description: apiAnnotation.description,
    x: apiAnnotation.x,
    y: apiAnnotation.y,
    shape: apiAnnotation.shape,
    author: {
      id: apiAnnotation.author.id,
      name: apiAnnotation.author.name,
      email: apiAnnotation.author.email ?? undefined,
      avatarUrl: apiAnnotation.author.avatarUrl,
    },
    createdAt: apiAnnotation.createdAt,
    comments: apiAnnotation.comments?.map((c) => ({
      id: c.id,
      annotationId: apiAnnotation.id,
      author: {
        id: c.author.id,
        name: c.author.name,
        email: c.author.email ?? undefined,
        avatarUrl: c.author.avatarUrl,
      },
      message: c.message,
      createdAt: c.createdAt,
    })),
  };
}
