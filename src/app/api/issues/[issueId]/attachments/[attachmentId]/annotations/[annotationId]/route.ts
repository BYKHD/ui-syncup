/**
 * Single Annotation API Route
 *
 * PATCH /api/issues/[issueId]/attachments/[attachmentId]/annotations/[annotationId] - Update annotation
 * DELETE /api/issues/[issueId]/attachments/[attachmentId]/annotations/[annotationId] - Delete annotation
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.3, 12.2, 12.3
 *
 * @module api/issues/[issueId]/attachments/[attachmentId]/annotations/[annotationId]
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { getIssueById } from "@/server/issues/issue-service";
import { getAttachment } from "@/server/issues/attachment-service";
import {
  getAnnotationById,
  updateAnnotation,
  deleteAnnotation,
  getAnnotationPermissions,
  canPerformAction,
  AnnotationNotFoundError,
  AttachmentNotFoundError,
} from "@/server/annotations";
import {
  logAnnotationUpdated,
  logAnnotationDeleted,
} from "@/server/issues/activity-service";
import { logger } from "@/lib/logger";
import { UpdateAnnotationSchema } from "@/features/annotations/api/schemas";
import { users } from "@/server/db/schema/users";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";

// ============================================================================
// PATCH - Update annotation
// ============================================================================

/**
 * PATCH /api/issues/[issueId]/attachments/[attachmentId]/annotations/[annotationId]
 *
 * Update an annotation's shape or description.
 * Requires EDIT permission (own annotations) or EDIT_ALL permission (any annotation).
 *
 * Request body:
 * {
 *   "shape": { "type": "pin", "position": { "x": 0.5, "y": 0.3 } },
 *   "description": "Updated description"
 * }
 *
 * Success response (200):
 * {
 *   "annotation": { ... }
 * }
 *
 * Error responses:
 * - 400: Invalid input
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 404: Issue, attachment, or annotation not found
 * - 500: Internal server error
 */
export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      issueId: string;
      attachmentId: string;
      annotationId: string;
    }>;
  }
) {
  const requestId = crypto.randomUUID();
  const { issueId, attachmentId, annotationId } = await params;

  try {
    // Authenticate user
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Not authenticated",
          },
        },
        { status: 401 }
      );
    }

    // Validate issue exists
    const issue = await getIssueById(issueId);

    if (!issue) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Issue not found",
          },
        },
        { status: 404 }
      );
    }

    // Validate attachment exists and belongs to issue
    const attachment = await getAttachment(attachmentId);

    if (!attachment || attachment.issueId !== issueId) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Attachment not found",
          },
        },
        { status: 404 }
      );
    }

    // Get annotation to check ownership
    const existingAnnotation = await getAnnotationById(
      attachmentId,
      annotationId
    );

    if (!existingAnnotation) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Annotation not found",
          },
        },
        { status: 404 }
      );
    }

    // Check edit permissions
    const isOwner = existingAnnotation.authorId === user.id;
    const permissions = await getAnnotationPermissions(
      user.id,
      issue.teamId,
      issue.projectId
    );

    if (!canPerformAction(permissions, "edit", isOwner)) {
      logger.warn("api.annotations.update.forbidden", {
        requestId,
        userId: user.id,
        attachmentId,
        annotationId,
        isOwner,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: isOwner
              ? "You do not have permission to edit annotations"
              : "You can only edit your own annotations",
          },
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateAnnotationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "Invalid annotation data",
            details: validation.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { shape, description } = validation.data;

    // Track what changed for activity logging
    const changes = {
      position: false,
      dimensions: false,
      description: false,
    };

    if (shape !== undefined) {
      if (shape.type === "pin" && existingAnnotation.shape.type === "pin") {
        // Check if position changed
        if (
          shape.position.x !== existingAnnotation.shape.position.x ||
          shape.position.y !== existingAnnotation.shape.position.y
        ) {
          changes.position = true;
        }
      } else if (
        shape.type === "box" &&
        existingAnnotation.shape.type === "box"
      ) {
        // Check if dimensions changed
        if (
          shape.start.x !== existingAnnotation.shape.start.x ||
          shape.start.y !== existingAnnotation.shape.start.y ||
          shape.end.x !== existingAnnotation.shape.end.x ||
          shape.end.y !== existingAnnotation.shape.end.y
        ) {
          changes.position = true;
          changes.dimensions = true;
        }
      } else {
        // Shape type changed entirely
        changes.position = true;
        changes.dimensions = true;
      }
    }

    if (description !== undefined) {
      if (description !== existingAnnotation.description) {
        changes.description = true;
      }
    }

    // Update annotation
    const result = await updateAnnotation(attachmentId, annotationId, {
      shape,
      description,
    });

    // Log activity if any changes were made
    if (changes.position || changes.dimensions || changes.description) {
      await logAnnotationUpdated(
        issue.teamId,
        issue.projectId,
        issueId,
        user.id,
        {
          annotationId,
          attachmentId,
          changes,
        }
      );
    }

    // Fetch author info
    const [author] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.image,
      })
      .from(users)
      .where(eq(users.id, result.annotation.authorId))
      .limit(1);

    const enrichedAnnotation = {
      ...result.annotation,
      author: author || {
        id: result.annotation.authorId,
        name: "Unknown User",
        email: null,
        avatarUrl: null,
      },
    };

    logger.info("api.annotations.update.success", {
      requestId,
      userId: user.id,
      attachmentId,
      annotationId,
      changes,
    });

    return NextResponse.json(
      { annotation: enrichedAnnotation },
      { status: 200 }
    );
  } catch (error) {
    console.error("PATCH annotation error:", error);
    logger.error("api.annotations.update.error", {
      requestId,
      attachmentId,
      annotationId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof AnnotationNotFoundError) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Annotation not found",
          },
        },
        { status: 404 }
      );
    }

    if (error instanceof AttachmentNotFoundError) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Attachment not found",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred. Please try again later.",
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Delete annotation
// ============================================================================

/**
 * DELETE /api/issues/[issueId]/attachments/[attachmentId]/annotations/[annotationId]
 *
 * Delete an annotation and cascade delete its comments.
 * Requires DELETE permission (own annotations) or DELETE_ALL permission (any annotation).
 *
 * Success response (204):
 * No content
 *
 * Error responses:
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 404: Issue, attachment, or annotation not found
 * - 500: Internal server error
 */
export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      issueId: string;
      attachmentId: string;
      annotationId: string;
    }>;
  }
) {
  const requestId = crypto.randomUUID();
  const { issueId, attachmentId, annotationId } = await params;

  try {
    // Authenticate user
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Not authenticated",
          },
        },
        { status: 401 }
      );
    }

    // Validate issue exists
    const issue = await getIssueById(issueId);

    if (!issue) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Issue not found",
          },
        },
        { status: 404 }
      );
    }

    // Validate attachment exists and belongs to issue
    const attachment = await getAttachment(attachmentId);

    if (!attachment || attachment.issueId !== issueId) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Attachment not found",
          },
        },
        { status: 404 }
      );
    }

    // Get annotation to check ownership
    const existingAnnotation = await getAnnotationById(
      attachmentId,
      annotationId
    );

    if (!existingAnnotation) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Annotation not found",
          },
        },
        { status: 404 }
      );
    }

    // Check delete permissions
    const isOwner = existingAnnotation.authorId === user.id;
    const permissions = await getAnnotationPermissions(
      user.id,
      issue.teamId,
      issue.projectId
    );

    if (!canPerformAction(permissions, "delete", isOwner)) {
      logger.warn("api.annotations.delete.forbidden", {
        requestId,
        userId: user.id,
        attachmentId,
        annotationId,
        isOwner,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: isOwner
              ? "You do not have permission to delete annotations"
              : "You can only delete your own annotations",
          },
        },
        { status: 403 }
      );
    }

    // Store label before deletion for activity log
    const annotationLabel = existingAnnotation.label;

    // Delete annotation (cascade deletes comments)
    await deleteAnnotation(attachmentId, annotationId);

    // Log activity
    await logAnnotationDeleted(
      issue.teamId,
      issue.projectId,
      issueId,
      user.id,
      {
        annotationId,
        attachmentId,
        label: annotationLabel,
      }
    );

    logger.info("api.annotations.delete.success", {
      requestId,
      userId: user.id,
      attachmentId,
      annotationId,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE annotation error:", error);
    logger.error("api.annotations.delete.error", {
      requestId,
      attachmentId,
      annotationId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof AnnotationNotFoundError) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Annotation not found",
          },
        },
        { status: 404 }
      );
    }

    if (error instanceof AttachmentNotFoundError) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Attachment not found",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred. Please try again later.",
        },
      },
      { status: 500 }
    );
  }
}
