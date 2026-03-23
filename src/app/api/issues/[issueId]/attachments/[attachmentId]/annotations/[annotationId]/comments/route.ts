/**
 * Annotation Comments API Route
 *
 * POST /api/issues/[issueId]/attachments/[attachmentId]/annotations/[annotationId]/comments - Add comment
 *
 * Requirements: 3.2, 10.3, 11.1, 11.5, 12.4
 *
 * @module api/issues/[issueId]/attachments/[attachmentId]/annotations/[annotationId]/comments
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { getIssueById } from "@/server/issues/issue-service";
import { getAttachment } from "@/server/issues/attachment-service";
import {
  getAnnotationById,
  addComment,
  getAnnotationPermissions,
  canPerformAction,
  AnnotationNotFoundError,
  AttachmentNotFoundError,
} from "@/server/annotations";
import { logAnnotationCommented } from "@/server/issues/activity-service";
import { logger } from "@/lib/logger";
import { CreateCommentSchema } from "@/features/annotations/api/schemas";
import { users } from "@/server/db/schema/users";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";

// ============================================================================
// POST - Add comment
// ============================================================================

/**
 * POST /api/issues/[issueId]/attachments/[attachmentId]/annotations/[annotationId]/comments
 *
 * Add a comment to an annotation.
 * Requires COMMENT permission (TEAM_MEMBER+).
 * Comments are sanitized for XSS prevention.
 *
 * Request body:
 * {
 *   "message": "Comment text"
 * }
 *
 * Success response (201):
 * {
 *   "comment": {
 *     "id": "uuid",
 *     "authorId": "uuid",
 *     "author": { ... },
 *     "message": "Comment text",
 *     "createdAt": "2024-01-01T00:00:00.000Z",
 *     "updatedAt": "2024-01-01T00:00:00.000Z"
 *   }
 * }
 *
 * Error responses:
 * - 400: Invalid input
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 404: Issue, attachment, or annotation not found
 * - 500: Internal server error
 */
export async function POST(
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

    // Check comment permissions
    const permissions = await getAnnotationPermissions(
      user.id,
      issue.teamId,
      issue.projectId
    );

    if (!canPerformAction(permissions, "comment")) {
      logger.warn("api.comments.create.forbidden", {
        requestId,
        userId: user.id,
        attachmentId,
        annotationId,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to add comments",
          },
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = CreateCommentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "Invalid comment data",
            details: validation.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { message } = validation.data;

    // Add comment (message is sanitized in service layer)
    const result = await addComment({
      attachmentId,
      annotationId,
      authorId: user.id,
      message,
    });

    // Log activity
    await logAnnotationCommented(
      issue.teamId,
      issue.projectId,
      issueId,
      user.id,
      {
        annotationId,
        attachmentId,
        commentId: result.comment.id,
        commentPreview: result.comment.message,
      }
    );

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

    logger.info("api.comments.create.success", {
      requestId,
      userId: user.id,
      attachmentId,
      annotationId,
      commentId: result.comment.id,
    });

    return NextResponse.json({ comment: enrichedComment }, { status: 201 });
  } catch (error) {
    console.error("POST comment error:", error);
    logger.error("api.comments.create.error", {
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
