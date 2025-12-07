/**
 * Issue Activities API Route
 *
 * GET /api/issues/[issueId]/activities - Get paginated activities for an issue
 *
 * @module api/issues/[issueId]/activities
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/rbac";
import { PERMISSIONS } from "@/config/roles";
import { getIssueById } from "@/server/issues/issue-service";
import { getActivitiesByIssue } from "@/server/issues/activity-service";
import { logger } from "@/lib/logger";
import { z } from "zod";
import type { ActivityType } from "@/server/issues/types";

/**
 * Zod schema for activity list query parameters
 */
const ListActivitiesQuerySchema = z.object({
  type: z.enum([
    "created",
    "status_changed",
    "priority_changed",
    "type_changed",
    "title_changed",
    "description_changed",
    "assignee_changed",
    "comment_added",
    "attachment_added",
    "attachment_removed",
  ]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * GET /api/issues/[issueId]/activities
 *
 * Get paginated activities for an issue.
 * Requires ISSUE_VIEW permission (PROJECT_VIEWER+).
 *
 * Query parameters:
 * - type: Activity type filter (optional)
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 *
 * Success response (200):
 * {
 *   "activities": [
 *     {
 *       "id": "uuid",
 *       "issueId": "uuid",
 *       "type": "status_changed",
 *       "actor": { "id": "uuid", "name": "User Name", ... },
 *       "changes": [{ "field": "status", "from": "open", "to": "in_progress" }],
 *       "createdAt": "2024-01-01T00:00:00.000Z"
 *     }
 *   ],
 *   "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
 * }
 *
 * Error responses:
 * - 400: Invalid query parameters
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
      logger.warn("api.issue.activities.get.forbidden", {
        requestId,
        userId: user.id,
        issueId,
        projectId: issue.projectId,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to view this issue's activities",
          },
        },
        { status: 403 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      type: searchParams.get("type") || undefined,
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    };

    const validation = ListActivitiesQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "Invalid query parameters",
            details: validation.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { type, page, limit } = validation.data;

    // Get activities
    const result = await getActivitiesByIssue({
      issueId,
      type: type as ActivityType | undefined,
      page,
      limit,
    });

    logger.info("api.issue.activities.get.success", {
      requestId,
      userId: user.id,
      issueId,
      activityCount: result.items.length,
      total: result.total,
      page: result.page,
    });

    // Serialize dates
    const serializedResult = {
      activities: result.items.map((activity) => ({
        ...activity,
        createdAt: activity.createdAt.toISOString(),
      })),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };

    return NextResponse.json(serializedResult, { status: 200 });
  } catch (error) {
    console.error("GET issue activities error:", error);
    logger.error("api.issue.activities.get.error", {
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
