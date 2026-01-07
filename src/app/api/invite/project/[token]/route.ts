/**
 * Accept Project Invitation API Route
 * 
 * POST /api/invite/project/[token] - Accept a project invitation
 * 
 * @module api/invite/project/[token]
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { acceptProjectInvitation } from "@/server/projects/invitation-service";
import { getProject } from "@/server/projects/project-service";
import { logger } from "@/lib/logger";

/**
 * POST /api/invite/project/[token]
 * 
 * Accept a project invitation using a token.
 * Requires user to be authenticated.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const requestId = crypto.randomUUID();
  const { token } = await params;

  try {
    // 1. Verify user is authenticated
    const user = await getSession();

    if (!user) {
      logger.warn("api.invite.accept.unauthorized", {
        requestId,
        token: "***", // Don't log full token
      });

      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "You must be logged in to accept an invitation" } },
        { status: 401 }
      );
    }

    // 2. Accept the invitation (validates token, checks expiration, adds member)
    await acceptProjectInvitation(token, user.id);

    // 3. Get project details for redirect (we need to fetch the project after acceptance)
    // Note: acceptProjectInvitation doesn't return projectId, so we need to look it up
    // For now, we'll return success without specific project details
    // The frontend can redirect based on the response or handle navigation

    logger.info("api.invite.accept.success", {
      requestId,
      userId: user.id,
    });

    return NextResponse.json(
      { 
        success: true,
        message: "Invitation accepted successfully" 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("POST accept invitation error:", error);

    // Handle specific errors from acceptProjectInvitation
    if (error instanceof Error) {
      // Invalid token - use generic error message for security
      if (error.message.includes("Invalid invitation token")) {
        logger.warn("api.invite.accept.invalid_token", {
          requestId,
        });

        return NextResponse.json(
          { error: { code: "INVALID_INVITATION", message: "This invitation link is invalid or has expired" } },
          { status: 400 }
        );
      }

      // Invitation already used
      if (error.message.includes("already used")) {
        logger.warn("api.invite.accept.already_used", {
          requestId,
        });

        return NextResponse.json(
          { error: { code: "INVITATION_USED", message: "This invitation has already been used" } },
          { status: 400 }
        );
      }

      // Invitation cancelled
      if (error.message.includes("cancelled")) {
        logger.warn("api.invite.accept.cancelled", {
          requestId,
        });

        return NextResponse.json(
          { error: { code: "INVITATION_CANCELLED", message: "This invitation has been cancelled" } },
          { status: 400 }
        );
      }

      // Invitation expired
      if (error.message.includes("expired")) {
        logger.warn("api.invite.accept.expired", {
          requestId,
        });

        return NextResponse.json(
          { error: { code: "INVITATION_EXPIRED", message: "This invitation has expired. Please request a new one" } },
          { status: 400 }
        );
      }

      // Project not found
      if (error.message.includes("Project not found")) {
        logger.error("api.invite.accept.project_not_found", {
          requestId,
        });

        return NextResponse.json(
          { error: { code: "PROJECT_NOT_FOUND", message: "The project for this invitation no longer exists" } },
          { status: 404 }
        );
      }
    }

    // Generic error
    logger.error("api.invite.accept.error", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
