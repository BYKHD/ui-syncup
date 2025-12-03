/**
 * Leave Project API Route
 * 
 * DELETE /api/projects/[id]/members/me - Leave a project
 * 
 * @module api/projects/[id]/members/me
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { leaveProject } from "@/server/projects/member-service";
import { logger } from "@/lib/logger";

/**
 * DELETE /api/projects/[id]/members/me
 * 
 * Leave a project (remove yourself as a member).
 * Prevents the sole owner from leaving.
 * 
 * Success response (204):
 * No content
 * 
 * Error responses:
 * - 400: Sole owner cannot leave (must transfer ownership first)
 * - 401: Not authenticated
 * - 404: User is not a member of this project
 * - 500: Internal server error
 */
export async function DELETE(
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

    // Leave project
    try {
      await leaveProject(projectId, user.id);

      logger.info("api.projects.leave.success", {
        requestId,
        userId: user.id,
        projectId,
      });

      return new NextResponse(null, { status: 204 });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "User is not a member of this project") {
          return NextResponse.json(
            {
              error: {
                code: "NOT_FOUND",
                message: "You are not a member of this project",
              },
            },
            { status: 404 }
          );
        }

        if (
          error.message ===
          "Cannot leave project as the sole owner. Transfer ownership first."
        ) {
          logger.warn("api.projects.leave.sole_owner", {
            requestId,
            userId: user.id,
            projectId,
          });

          return NextResponse.json(
            {
              error: {
                code: "SOLE_OWNER",
                message:
                  "Cannot leave project as the sole owner. Transfer ownership first.",
              },
            },
            { status: 400 }
          );
        }
      }

      throw error;
    }
  } catch (error) {
    console.error("DELETE leave project error:", error);
    logger.error("api.projects.leave.error", {
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
