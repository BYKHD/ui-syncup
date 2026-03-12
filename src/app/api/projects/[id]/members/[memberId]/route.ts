/**
 * Project Member Management API Routes
 * 
 * PATCH /api/projects/[id]/members/[memberId] - Update member role
 * DELETE /api/projects/[id]/members/[memberId] - Remove member
 * 
 * @module api/projects/[id]/members/[memberId]
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/rbac";
import { PERMISSIONS, PROJECT_ROLES } from "@/config/roles";
import {
  updateMemberRole,
  removeMember,
} from "@/server/projects/member-service";
import { getProject } from "@/server/projects/project-service";
import { logger } from "@/lib/logger";
import { z } from "zod";
import type { ProjectRole } from "@/config/roles";

/**
 * Zod schema for member role update
 */
const UpdateMemberRoleSchema = z.object({
  role: z.enum([
    PROJECT_ROLES.PROJECT_OWNER,
    PROJECT_ROLES.PROJECT_EDITOR,
    PROJECT_ROLES.PROJECT_DEVELOPER,
    PROJECT_ROLES.PROJECT_VIEWER,
  ]),
});

/**
 * PATCH /api/projects/[id]/members/[memberId]
 * 
 * Update a member's role in the project.
 * Requires PROJECT_MANAGE_MEMBERS permission.
 * Auto-promotes to TEAM_EDITOR if new role is PROJECT_OWNER or PROJECT_EDITOR.
 * 
 * Request body:
 * {
 *   "role": "editor"
 * }
 * 
 * Success response (200):
 * {
 *   "member": {
 *     "userId": "uuid",
 *     "userName": "John Doe",
 *     "userEmail": "john@example.com",
 *     "userAvatar": "avatar-url",
 *     "role": "editor",
 *     "joinedAt": "2024-01-01T00:00:00.000Z"
 *   }
 * }
 * 
 * Error responses:
 * - 400: Invalid input or trying to change sole owner's role
 * - 401: Not authenticated
 * - 403: Insufficient permissions (no PROJECT_MANAGE_MEMBERS permission)
 * - 404: Member not found
 * - 500: Internal server error
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const requestId = crypto.randomUUID();
  const { id: projectId, memberId } = await params;

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
    const validation = UpdateMemberRoleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "Invalid role",
            details: validation.error.errors,
          },
        },
        { status: 400 }
      );
    }

    // Check PROJECT_MANAGE_MEMBERS permission
    const canManage = await hasPermission({
      userId: user.id,
      permission: PERMISSIONS.PROJECT_MANAGE_MEMBERS,
      resourceId: projectId,
      resourceType: "project",
    });

    if (!canManage) {
      logger.warn("api.projects.members.update.forbidden", {
        requestId,
        userId: user.id,
        projectId,
        memberId,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to manage project members",
          },
        },
        { status: 403 }
      );
    }

    // Get project to determine teamId
    const project = await getProject(projectId, user.id);

    // Update member role
    try {
      const member = await updateMemberRole(
        projectId,
        memberId,
        validation.data.role as ProjectRole,
        project.teamId
      );

      logger.info("api.projects.members.update.success", {
        requestId,
        userId: user.id,
        projectId,
        memberId,
        newRole: validation.data.role,
      });

      // Serialize dates to strings for API response
      const serializedMember = {
        ...member,
        joinedAt: member.joinedAt.toISOString(),
      };

      return NextResponse.json(
        { member: serializedMember },
        { status: 200 }
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Member not found") {
          return NextResponse.json(
            {
              error: {
                code: "NOT_FOUND",
                message: "Member not found",
              },
            },
            { status: 404 }
          );
        }

        if (
          error.message ===
          "Cannot change the role of the sole project owner. Transfer ownership first."
        ) {
          logger.warn("api.projects.members.update.sole_owner", {
            requestId,
            userId: user.id,
            projectId,
            memberId,
          });

          return NextResponse.json(
            {
              error: {
                code: "SOLE_OWNER",
                message:
                  "Cannot change the role of the sole project owner. Transfer ownership first.",
              },
            },
            { status: 400 }
          );
        }
      }

      throw error;
    }
  } catch (error) {
    console.error("PATCH member role error:", error);
    logger.error("api.projects.members.update.error", {
      requestId,
      projectId,
      memberId,
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
 * DELETE /api/projects/[id]/members/[memberId]
 * 
 * Remove a member from the project.
 * Requires PROJECT_MANAGE_MEMBERS permission.
 * Prevents removing the sole owner.
 * 
 * Success response (204):
 * No content
 * 
 * Error responses:
 * - 400: Trying to remove sole owner
 * - 401: Not authenticated
 * - 403: Insufficient permissions (no PROJECT_MANAGE_MEMBERS permission)
 * - 404: Member not found
 * - 500: Internal server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const requestId = crypto.randomUUID();
  const { id: projectId, memberId } = await params;

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

    // Check PROJECT_MANAGE_MEMBERS permission
    const canManage = await hasPermission({
      userId: user.id,
      permission: PERMISSIONS.PROJECT_MANAGE_MEMBERS,
      resourceId: projectId,
      resourceType: "project",
    });

    if (!canManage) {
      logger.warn("api.projects.members.remove.forbidden", {
        requestId,
        userId: user.id,
        projectId,
        memberId,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to manage project members",
          },
        },
        { status: 403 }
      );
    }

    // Remove member
    try {
      await removeMember(projectId, memberId);

      logger.info("api.projects.members.remove.success", {
        requestId,
        userId: user.id,
        projectId,
        memberId,
      });

      return new NextResponse(null, { status: 204 });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Member not found") {
          return NextResponse.json(
            {
              error: {
                code: "NOT_FOUND",
                message: "Member not found",
              },
            },
            { status: 404 }
          );
        }

        if (
          error.message ===
          "Cannot remove the sole project owner. Transfer ownership first."
        ) {
          logger.warn("api.projects.members.remove.sole_owner", {
            requestId,
            userId: user.id,
            projectId,
            memberId,
          });

          return NextResponse.json(
            {
              error: {
                code: "SOLE_OWNER",
                message:
                  "Cannot remove the sole project owner. Transfer ownership first.",
              },
            },
            { status: 400 }
          );
        }
      }

      throw error;
    }
  } catch (error) {
    console.error("DELETE member error:", error);
    logger.error("api.projects.members.remove.error", {
      requestId,
      projectId,
      memberId,
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
