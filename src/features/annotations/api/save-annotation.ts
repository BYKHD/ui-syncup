// ============================================================================
// SAVE ANNOTATION API (MOCK)
// Simulates saving annotation position changes to backend
// ============================================================================

import type { AttachmentAnnotation, AnnotationShape } from '@/features/annotations/types';

export interface SaveAnnotationPositionParams {
  issueId: string;
  attachmentId: string;
  annotationId: string;
  shape: AnnotationShape;
  actorId: string;
}

export interface SaveAnnotationPositionResponse {
  annotation: AttachmentAnnotation;
  timestamp: string;
}

export interface CreateAnnotationParams {
  issueId: string;
  attachmentId: string;
  shape: AnnotationShape;
  label: string;
  description?: string;
  actorId: string;
}

export interface CreateAnnotationResponse {
  annotation: AttachmentAnnotation;
  timestamp: string;
}

/**
 * Saves annotation position changes
 *
 * MOCK IMPLEMENTATION: Simulates network delay and returns updated annotation
 * TODO: Replace with actual API call when backend is ready
 */
export async function saveAnnotationPosition(
  params: SaveAnnotationPositionParams
): Promise<SaveAnnotationPositionResponse> {
  const { annotationId, shape, actorId } = params;

  // Simulate realistic network delay (300-600ms)
  const delay = 300 + Math.random() * 300;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Simulate occasional network errors (5% chance)
  if (Math.random() < 0.05) {
    throw new Error('Network error: Failed to save annotation position');
  }

  // Extract x, y from shape for backward compatibility
  const { x, y } = shape.type === 'pin'
    ? shape.position
    : {
        x: (shape.start.x + shape.end.x) / 2,
        y: (shape.start.y + shape.end.y) / 2,
      };

  // Create mock updated annotation
  const updatedAnnotation: AttachmentAnnotation = {
    id: annotationId,
    attachmentId: params.attachmentId,
    label: '1', // Mock label
    x,
    y,
    shape,
    author: {
      id: actorId,
      name: 'Current User',
      email: 'user@example.com',
    },
    createdAt: new Date().toISOString(),
  };

  return {
    annotation: updatedAnnotation,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Creates a new annotation
 *
 * MOCK IMPLEMENTATION: Simulates network delay and returns new annotation
 * TODO: Replace with actual API call when backend is ready
 */
export async function createAnnotation(
  params: CreateAnnotationParams
): Promise<CreateAnnotationResponse> {
  const { shape, label, description, actorId, attachmentId } = params;

  // Simulate realistic network delay (400-700ms)
  const delay = 400 + Math.random() * 300;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Simulate occasional network errors (3% chance)
  if (Math.random() < 0.03) {
    throw new Error('Network error: Failed to create annotation');
  }

  // Extract x, y from shape for backward compatibility
  const { x, y } = shape.type === 'pin'
    ? shape.position
    : {
        x: (shape.start.x + shape.end.x) / 2,
        y: (shape.start.y + shape.end.y) / 2,
      };

  // Generate unique ID
  const annotationId = `ann_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Create mock annotation
  const newAnnotation: AttachmentAnnotation = {
    id: annotationId,
    attachmentId,
    label,
    description,
    x,
    y,
    shape,
    author: {
      id: actorId,
      name: 'Current User',
      email: 'user@example.com',
    },
    createdAt: new Date().toISOString(),
    comments: description ? [
      {
        id: `cmt_${Date.now()}`,
        annotationId,
        author: {
          id: actorId,
          name: 'Current User',
          email: 'user@example.com',
        },
        message: description,
        createdAt: new Date().toISOString(),
      }
    ] : undefined,
  };

  return {
    annotation: newAnnotation,
    timestamp: new Date().toISOString(),
  };
}
