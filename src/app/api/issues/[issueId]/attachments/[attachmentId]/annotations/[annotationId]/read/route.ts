/**
 * Annotation Read Status API Route
 *
 * POST /api/issues/.../annotations/[annotationId]/read - Mark annotation as read
 *
 * Requirements: 3.5
 *
 * @module api/issues/[issueId]/attachments/[attachmentId]/annotations/[annotationId]/read
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { getIssueById } from "@/server/issues/issue-service";
import { getAttachment } from "@/server/issues/attachment-service";
import {
  getAnnotationById,
  getAnnotationPermissions,
  AttachmentNotFoundError,
  AnnotationNotFoundError,
} from "@/server/annotations";
import { annotationReadStatus } from "@/server/db/schema/annotation-read-status";
import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";

// ============================================================================
// POST - Mark annotation as read
// ============================================================================

/**
 * POST /api/issues/.../annotations/[annotationId]/read
 *
 * Update or insert read status for the current user on an annotation.
 * Sets last_read_at to current timestamp.
 *
 * Success response (200):
 * {
 *   "success": true,
 *   "lastReadAt": "2024-01-01T00:00:00.000Z"
 * }
 *
 * Error responses:
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 404: Resource not found
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

    // Check view permissions
    const permissions = await getAnnotationPermissions(
      user.id,
      issue.teamId,
      issue.projectId
    );

    if (!permissions.canView) {
      logger.warn("api.annotations.read.forbidden", {
        requestId,
        userId: user.id,
        attachmentId,
        annotationId,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to access this annotation",
          },
        },
        { status: 403 }
      );
    }

    const now = new Date();

    // Upsert read status (update if exists, insert if not)
    const existingStatus = await db.query.annotationReadStatus.findFirst({
      where: and(
        eq(annotationReadStatus.userId, user.id),
        eq(annotationReadStatus.attachmentId, attachmentId),
        eq(annotationReadStatus.annotationId, annotationId)
      ),
    });

    if (existingStatus) {
      // Update existing record
      await db
        .update(annotationReadStatus)
        .set({ lastReadAt: now })
        .where(
          and(
            eq(annotationReadStatus.userId, user.id),
            eq(annotationReadStatus.attachmentId, attachmentId),
            eq(annotationReadStatus.annotationId, annotationId)
          )
        );
    } else {
      // Insert new record
      await db.insert(annotationReadStatus).values({
        userId: user.id,
        attachmentId,
        annotationId,
        lastReadAt: now,
      });
    }

    logger.info("api.annotations.read.success", {
      requestId,
      userId: user.id,
      attachmentId,
      annotationId,
      action: existingStatus ? "updated" : "created",
    });

    return NextResponse.json(
      {
        success: true,
        lastReadAt: now.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST read status error:", error);
    logger.error("api.annotations.read.error", {
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
