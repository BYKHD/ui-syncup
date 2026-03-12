/**
 * Single Comment API Route
 *
 * PATCH /api/issues/.../comments/[commentId] - Update comment
 * DELETE /api/issues/.../comments/[commentId] - Delete comment
 *
 * Requirements: 11.2, 11.3, 11.4, 11.5
 *
 * @module api/issues/[issueId]/attachments/[attachmentId]/annotations/[annotationId]/comments/[commentId]
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { getIssueById } from "@/server/issues/issue-service";
import { getAttachment } from "@/server/issues/attachment-service";
import {
  getAnnotationById,
  updateComment,
  deleteComment,
  getAnnotationPermissions,
  AnnotationNotFoundError,
  AttachmentNotFoundError,
  CommentNotFoundError,
  CommentPermissionError,
} from "@/server/annotations";
import { logger } from "@/lib/logger";
import { UpdateCommentSchema } from "@/features/annotations/api/schemas";
import { users } from "@/server/db/schema/users";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";

// ============================================================================
// PATCH - Update comment
// ============================================================================

/**
 * PATCH /api/issues/.../annotations/[annotationId]/comments/[commentId]
 *
 * Update a comment's message.
 * Only the comment author can update their comment.
 *
 * Request body:
 * {
 *   "message": "Updated comment text"
 * }
 *
 * Success response (200):
 * {
 *   "comment": { ... }
 * }
 *
 * Error responses:
 * - 400: Invalid input
 * - 401: Not authenticated
 * - 403: Not comment author
 * - 404: Resource not found
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
      commentId: string;
    }>;
  }
) {
  const requestId = crypto.randomUUID();
  const { issueId, attachmentId, annotationId, commentId } = await params;

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

    // Validate annotation exists
    const annotation = await getAnnotationById(attachmentId, annotationId);

    if (!annotation) {
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

    // Validate user has base access to the project
    const permissions = await getAnnotationPermissions(
      user.id,
      issue.teamId,
      issue.projectId
    );

    if (!permissions.canView) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have access to this resource",
          },
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateCommentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "Invalid comment data",
            details: validation.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { message } = validation.data;

    // Update comment (service layer validates authorship)
    const result = await updateComment({
      attachmentId,
      annotationId,
      commentId,
      authorId: user.id,
      message,
    });

    // Fetch author info
    const [author] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.image,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    const enrichedComment = {
      ...result.comment,
      author: author || {
        id: user.id,
        name: "Unknown User",
        email: null,
        avatarUrl: null,
      },
    };

    logger.info("api.comments.update.success", {
      requestId,
      userId: user.id,
      attachmentId,
      annotationId,
      commentId,
    });

    return NextResponse.json({ comment: enrichedComment }, { status: 200 });
  } catch (error) {
    console.error("PATCH comment error:", error);
    logger.error("api.comments.update.error", {
      requestId,
      attachmentId,
      annotationId,
      commentId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof CommentPermissionError) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: error.message,
          },
        },
        { status: 403 }
      );
    }

    if (error instanceof CommentNotFoundError) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Comment not found",
          },
        },
        { status: 404 }
      );
    }

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
// DELETE - Delete comment
// ============================================================================

/**
 * DELETE /api/issues/.../annotations/[annotationId]/comments/[commentId]
 *
 * Delete a comment from an annotation.
 * Only the comment author can delete their comment.
 *
 * Success response (204):
 * No content
 *
 * Error responses:
 * - 401: Not authenticated
 * - 403: Not comment author
 * - 404: Resource not found
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
      commentId: string;
    }>;
  }
) {
  const requestId = crypto.randomUUID();
  const { issueId, attachmentId, annotationId, commentId } = await params;

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

    // Validate annotation exists
    const annotation = await getAnnotationById(attachmentId, annotationId);

    if (!annotation) {
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

    // Validate user has base access
    const permissions = await getAnnotationPermissions(
      user.id,
      issue.teamId,
      issue.projectId
    );

    if (!permissions.canView) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have access to this resource",
          },
        },
        { status: 403 }
      );
    }

    // Delete comment (service layer validates authorship)
    await deleteComment({
      attachmentId,
      annotationId,
      commentId,
      authorId: user.id,
    });

    logger.info("api.comments.delete.success", {
      requestId,
      userId: user.id,
      attachmentId,
      annotationId,
      commentId,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE comment error:", error);
    logger.error("api.comments.delete.error", {
      requestId,
      attachmentId,
      annotationId,
      commentId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof CommentPermissionError) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: error.message,
          },
        },
        { status: 403 }
      );
    }

    if (error instanceof CommentNotFoundError) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Comment not found",
          },
        },
        { status: 404 }
      );
    }

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
