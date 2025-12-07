/**
 * Project Members API Routes
 * 
 * GET /api/projects/[id]/members - List project members
 * 
 * @module api/projects/[id]/members
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/rbac";
import { PERMISSIONS } from "@/config/roles";
import { listMembers } from "@/server/projects/member-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/projects/[id]/members
 * 
 * List all members of a project with their user details.
 * Requires PROJECT_VIEW permission.
 * 
 * Success response (200):
 * {
 *   "members": [
 *     {
 *       "userId": "uuid",
 *       "userName": "John Doe",
 *       "userEmail": "john@example.com",
 *       "userAvatar": "avatar-url",
 *       "role": "owner",
 *       "joinedAt": "2024-01-01T00:00:00.000Z"
 *     }
 *   ]
 * }
 * 
 * Error responses:
 * - 401: Not authenticated
 * - 403: Insufficient permissions (no PROJECT_VIEW permission)
 * - 500: Internal server error
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
    const canView = await hasPermission({
      userId: user.id,
      permission: PERMISSIONS.PROJECT_VIEW,
      resourceId: projectId,
      resourceType: "project",
    });

    if (!canView) {
      logger.warn("api.projects.members.list.forbidden", {
        requestId,
        userId: user.id,
        projectId,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to view this project's members",
          },
        },
        { status: 403 }
      );
    }

    // List members
    const members = await listMembers(projectId);

    logger.info("api.projects.members.list.success", {
      requestId,
      userId: user.id,
      projectId,
      memberCount: members.length,
    });

    // Serialize dates to strings for API response
    const serializedMembers = members.map((member) => ({
      ...member,
      joinedAt: member.joinedAt.toISOString(),
    }));

    return NextResponse.json(
      { members: serializedMembers },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET project members error:", error);
    logger.error("api.projects.members.list.error", {
      requestId,
      projectId,
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
