/**
 * Issue Detail API Routes
 *
 * GET /api/issues/[issueId] - Get issue details
 * PATCH /api/issues/[issueId] - Update issue
 * DELETE /api/issues/[issueId] - Delete issue
 *
 * @module api/issues/[issueId]
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/rbac";
import { PERMISSIONS } from "@/config/roles";
import {
  getIssueById,
  updateIssue,
  deleteIssue,
} from "@/server/issues/issue-service";
import { getAttachmentsByIssue } from "@/server/issues/attachment-service";
import { generateDownloadUrl } from "@/lib/storage";
import { logger } from "@/lib/logger";
import { z } from "zod";
import type {
  IssueStatus,
  IssueType,
  IssuePriority,
} from "@/server/issues/types";

/**
 * Zod schema for issue update
 */
const UpdateIssueSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(10000).optional().nullable(),
  type: z.enum(["bug", "visual", "accessibility", "content", "other"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  status: z.enum(["open", "in_progress", "in_review", "resolved", "archived"]).optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable(),
  page: z.string().max(255).optional().nullable(),
  figmaLink: z.string().url().optional().nullable(),
  jiraLink: z.string().url().optional().nullable(),
});

/**
 * GET /api/issues/[issueId]
 *
 * Get issue details with attachments.
 * Requires ISSUE_VIEW permission (PROJECT_VIEWER+).
 *
 * Success response (200):
 * {
 *   "issue": {
 *     "id": "uuid",
 *     "projectId": "uuid",
 *     "issueKey": "PRJ-1",
 *     "title": "Issue Title",
 *     "assignee": { ... },
 *     "reporter": { ... },
 *     "attachments": [ ... ]
 *   }
 * }
 *
 * Error responses:
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 404: Issue not found
 * - 500: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  const requestId = crypto.randomUUID();
  const { issueId } = await params;

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

    // Check ISSUE_VIEW permission on the project
    const canView = await hasPermission({
      userId: user.id,
      permission: PERMISSIONS.ISSUE_VIEW,
      resourceId: issue.projectId,
      resourceType: "project",
    });

    if (!canView) {
      logger.warn("api.issue.get.forbidden", {
        requestId,
        userId: user.id,
        issueId,
        projectId: issue.projectId,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to view this issue",
          },
        },
        { status: 403 }
      );
    }

    // Get attachments
    const attachments = await getAttachmentsByIssue(issueId);

    logger.info("api.issue.get.success", {
      requestId,
      userId: user.id,
      issueId,
      projectId: issue.projectId,
    });

    // Generate presigned download URLs for each attachment
    const serializedAttachments = await Promise.all(
      attachments.map(async (att) => {
        let downloadUrl: string | null = null;
        try {
          downloadUrl = await generateDownloadUrl(att.url);
        } catch {
          // Non-fatal: client falls back to the stored key
        }
        return {
          ...att,
          createdAt: att.createdAt.toISOString(),
          downloadUrl,
        };
      })
    );

    // Serialize dates and include attachments
    const serializedIssue = {
      ...issue,
      createdAt: issue.createdAt.toISOString(),
      updatedAt: issue.updatedAt.toISOString(),
      attachments: serializedAttachments,
    };

    return NextResponse.json({ issue: serializedIssue }, { status: 200 });
  } catch (error) {
    console.error("GET issue error:", error);
    logger.error("api.issue.get.error", {
      requestId,
      issueId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

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

/**
 * PATCH /api/issues/[issueId]
 *
 * Update issue fields.
 * Requires ISSUE_UPDATE permission (PROJECT_DEVELOPER+).
 *
 * Request body (all optional):
 * {
 *   "title": "Updated Title",
 *   "description": "Updated description",
 *   "type": "bug",
 *   "priority": "high",
 *   "status": "in_progress",
 *   "assigneeId": "uuid"
 * }
 *
 * Success response (200):
 * {
 *   "issue": { ... }
 * }
 *
 * Error responses:
 * - 400: Invalid input
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 404: Issue not found
 * - 500: Internal server error
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  const requestId = crypto.randomUUID();
  const { issueId } = await params;

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

    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateIssueSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "Invalid issue data",
            details: validation.error.issues,
          },
        },
        { status: 400 }
      );
    }

    // Get issue first to get projectId for permission check
    const existingIssue = await getIssueById(issueId);

    if (!existingIssue) {
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

    // Check ISSUE_UPDATE permission on the project
    const canUpdate = await hasPermission({
      userId: user.id,
      permission: PERMISSIONS.ISSUE_UPDATE,
      resourceId: existingIssue.projectId,
      resourceType: "project",
    });

    if (!canUpdate) {
      logger.warn("api.issue.update.forbidden", {
        requestId,
        userId: user.id,
        issueId,
        projectId: existingIssue.projectId,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to update this issue",
          },
        },
        { status: 403 }
      );
    }

    const {
      title,
      description,
      type,
      priority,
      status,
      assigneeId,
      coverImageUrl,
      page,
      figmaLink,
      jiraLink,
    } = validation.data;

    // Update issue
    const updatedIssue = await updateIssue(
      issueId,
      {
        title,
        description,
        type: type as IssueType | undefined,
        priority: priority as IssuePriority | undefined,
        status: status as IssueStatus | undefined,
        assigneeId,
        coverImageUrl,
        page,
        figmaLink,
        jiraLink,
      },
      user.id
    );

    logger.info("api.issue.update.success", {
      requestId,
      userId: user.id,
      issueId,
      projectId: existingIssue.projectId,
      updates: Object.keys(validation.data),
    });

    // Serialize dates
    const serializedIssue = {
      ...updatedIssue,
      createdAt: updatedIssue.createdAt.toISOString(),
      updatedAt: updatedIssue.updatedAt.toISOString(),
    };

    return NextResponse.json({ issue: serializedIssue }, { status: 200 });
  } catch (error) {
    console.error("PATCH issue error:", error);
    logger.error("api.issue.update.error", {
      requestId,
      issueId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes("Issue title is required")) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_TITLE",
              message: error.message,
            },
          },
          { status: 400 }
        );
      }

      if (error.message === "Issue not found") {
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

/**
 * DELETE /api/issues/[issueId]
 *
 * Delete an issue (hard delete with cascade).
 * Requires ISSUE_DELETE permission (PROJECT_EDITOR+).
 *
 * Success response (204):
 * No content
 *
 * Error responses:
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 404: Issue not found
 * - 500: Internal server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  const requestId = crypto.randomUUID();
  const { issueId } = await params;

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
    const existingIssue = await getIssueById(issueId);

    if (!existingIssue) {
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

    // Check ISSUE_DELETE permission on the project
    const canDelete = await hasPermission({
      userId: user.id,
      permission: PERMISSIONS.ISSUE_DELETE,
      resourceId: existingIssue.projectId,
      resourceType: "project",
    });

    if (!canDelete) {
      logger.warn("api.issue.delete.forbidden", {
        requestId,
        userId: user.id,
        issueId,
        projectId: existingIssue.projectId,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to delete this issue",
          },
        },
        { status: 403 }
      );
    }

    // Delete issue (cascade deletes attachments and activities)
    await deleteIssue(issueId, user.id);

    const projectKey = existingIssue.issueKey.substring(0, existingIssue.issueKey.lastIndexOf("-"));

    logger.info("api.issue.delete.success", {
      requestId,
      userId: user.id,
      issueId,
      projectId: existingIssue.projectId,
      issueKey: existingIssue.issueKey,
    });

    return NextResponse.json(
      {
        success: true,
        projectKey,
        message: "Issue deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE issue error:", error);
    logger.error("api.issue.delete.error", {
      requestId,
      issueId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Handle specific errors
    if (error instanceof Error && error.message === "Issue not found") {
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
