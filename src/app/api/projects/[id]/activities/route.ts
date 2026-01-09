/**
 * Project Activities API Route
 *
 * GET /api/projects/[id]/activities - Get project activity log
 *
 * @module api/projects/[id]/activities
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/rbac";
import { PERMISSIONS } from "@/config/roles";
import { getProjectActivities } from "@/server/projects/activity-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/projects/[id]/activities
 *
 * Get project activities.
 * Requires PROJECT_VIEW permission.
 *
 * Success response (200):
 * {
 *   "activities": [
 *     {
 *       "id": "uuid",
 *       "teamId": "uuid",
 *       "projectId": "uuid",
 *       "actorId": "uuid" | null,
 *       "type": "invitation_sent",
 *       "metadata": {},
 *       "createdAt": "2024-01-01T00:00:00.000Z",
 *       "actor": { ... } | null
 *     }
 *   ]
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const { id: projectId } = await params;

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

    // Check PROJECT_VIEW permission
    // We check permission explicitly here since we're calling a service that might not check it
    // (Note: getProject in route.ts includes access control, but getProjectActivities might not)
    const canView = await hasPermission({
      userId: user.id,
      permission: PERMISSIONS.PROJECT_VIEW,
      resourceId: projectId,
      resourceType: "project",
    });

    if (!canView) {
      logger.warn("api.projects.activities.forbidden", {
        requestId,
        userId: user.id,
        projectId,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to view activities for this project",
          },
        },
        { status: 403 }
      );
    }

    // Get activities
    const result = await getProjectActivities({ projectId });
    const activities = result.items;

    logger.info("api.projects.activities.success", {
      requestId,
      userId: user.id,
      projectId,
      count: activities.length,
    });

    // Serialize dates to strings for API response
    const serializedActivities = activities.map((activity) => ({
      ...activity,
      createdAt: activity.createdAt.toISOString(),
    }));

    return NextResponse.json(
      { activities: serializedActivities },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET project activities error:", error);
    logger.error("api.projects.activities.error", {
      requestId,
      projectId,
      error: error instanceof Error ? error.message : "Unknown error",
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
