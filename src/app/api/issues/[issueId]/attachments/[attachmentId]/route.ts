/**
 * Single Attachment API Route
 *
 * DELETE /api/issues/[issueId]/attachments/[attachmentId] - Delete an attachment
 *
 * @module api/issues/[issueId]/attachments/[attachmentId]
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/rbac";
import { PERMISSIONS } from "@/config/roles";
import { getIssueById } from "@/server/issues/issue-service";
import {
  getAttachment,
  deleteAttachment,
} from "@/server/issues/attachment-service";
import { logger } from "@/lib/logger";

/**
 * DELETE /api/issues/[issueId]/attachments/[attachmentId]
 *
 * Delete an attachment from an issue.
 * Requires ISSUE_DELETE permission (PROJECT_EDITOR+).
 *
 * Success response (204):
 * No content
 *
 * Error responses:
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 404: Issue or attachment not found
 * - 500: Internal server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string; attachmentId: string }> }
) {
  const requestId = crypto.randomUUID();
  const { issueId, attachmentId } = await params;

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

    // Get issue first to get projectId for permission check
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

    // Verify attachment exists and belongs to this issue
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

    // Check ISSUE_DELETE permission on the project (PROJECT_EDITOR+ can delete attachments)
    const canDelete = await hasPermission({
      userId: user.id,
      permission: PERMISSIONS.ISSUE_DELETE,
      resourceId: issue.projectId,
      resourceType: "project",
    });

    if (!canDelete) {
      logger.warn("api.issue.attachment.delete.forbidden", {
        requestId,
        userId: user.id,
        issueId,
        attachmentId,
        projectId: issue.projectId,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to delete attachments from this issue",
          },
        },
        { status: 403 }
      );
    }

    // Delete attachment
    await deleteAttachment(attachmentId, user.id);

    logger.info("api.issue.attachment.delete.success", {
      requestId,
      userId: user.id,
      issueId,
      attachmentId,
      fileName: attachment.fileName,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE issue attachment error:", error);
    logger.error("api.issue.attachment.delete.error", {
      requestId,
      issueId,
      attachmentId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Handle specific errors
    if (error instanceof Error && error.message === "Attachment not found") {
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
