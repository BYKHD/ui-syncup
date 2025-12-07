/**
 * Join Project API Route
 * 
 * POST /api/projects/[id]/join - Join a public project
 * 
 * @module api/projects/[id]/join
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { joinProject } from "@/server/projects/member-service";
import { getProject } from "@/server/projects/project-service";
import { logger } from "@/lib/logger";

/**
 * POST /api/projects/[id]/join
 * 
 * Join a public project as a viewer.
 * User must be authenticated and the project must be public.
 * 
 * Success response (201):
 * {
 *   "member": {
 *     "userId": "uuid",
 *     "userName": "John Doe",
 *     "userEmail": "john@example.com",
 *     "userAvatar": "avatar-url",
 *     "role": "viewer",
 *     "joinedAt": "2024-01-01T00:00:00.000Z"
 *   }
 * }
 * 
 * Error responses:
 * - 401: Not authenticated
 * - 403: Project is private (cannot join without invitation)
 * - 404: Project not found
 * - 409: User is already a member
 * - 500: Internal server error
 */
export async function POST(
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

    // Get project to determine teamId
    let project;
    try {
      project = await getProject(projectId, user.id);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Project not found") {
          return NextResponse.json(
            {
              error: {
                code: "NOT_FOUND",
                message: "Project not found",
              },
            },
            { status: 404 }
          );
        }
        // If access denied, it might be a private project - let joinProject handle it
        if (error.message === "Access denied") {
          // Try to join anyway - joinProject will check if it's public
          project = null;
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    // Determine teamId - if we couldn't get the project, we need to fetch it directly
    let teamId: string;
    if (project) {
      teamId = project.teamId;
    } else {
      // Fetch project without access control to get teamId
      const { db } = await import("@/lib/db");
      const { projects } = await import("@/server/db/schema/projects");
      const { eq, and, isNull } = await import("drizzle-orm");
      
      const projectData = await db.query.projects.findFirst({
        where: and(eq(projects.id, projectId), isNull(projects.deletedAt)),
      });

      if (!projectData) {
        return NextResponse.json(
          {
            error: {
              code: "NOT_FOUND",
              message: "Project not found",
            },
          },
          { status: 404 }
        );
      }

      teamId = projectData.teamId;
    }

    // Join project
    try {
      const member = await joinProject(projectId, user.id, teamId);

      logger.info("api.projects.join.success", {
        requestId,
        userId: user.id,
        projectId,
      });

      // Serialize dates to strings for API response
      const serializedMember = {
        ...member,
        joinedAt: member.joinedAt.toISOString(),
      };

      return NextResponse.json(
        { member: serializedMember },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Project not found") {
          return NextResponse.json(
            {
              error: {
                code: "NOT_FOUND",
                message: "Project not found",
              },
            },
            { status: 404 }
          );
        }

        if (error.message === "Cannot join a private project without invitation") {
          logger.warn("api.projects.join.private", {
            requestId,
            userId: user.id,
            projectId,
          });

          return NextResponse.json(
            {
              error: {
                code: "PRIVATE_PROJECT",
                message: "Cannot join a private project without invitation",
              },
            },
            { status: 403 }
          );
        }

        if (error.message === "User is already a member of this project") {
          return NextResponse.json(
            {
              error: {
                code: "ALREADY_MEMBER",
                message: "You are already a member of this project",
              },
            },
            { status: 409 }
          );
        }
      }

      throw error;
    }
  } catch (error) {
    console.error("POST join project error:", error);
    logger.error("api.projects.join.error", {
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
