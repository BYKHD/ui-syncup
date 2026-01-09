/**
 * Accept Project Invitation API Route
 * 
 * GET /api/invite/project/[token] - Get invitation details
 * POST /api/invite/project/[token] - Accept a project invitation
 * 
 * @module api/invite/project/[token]
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { acceptProjectInvitation, getInvitationByToken } from "@/server/projects/invitation-service";
import { logger } from "@/lib/logger";
import { checkLimit, RATE_LIMITS, createRateLimitKey } from "@/server/auth/rate-limiter";

/**
 * GET /api/invite/project/[token]
 * 
 * Get project invitation details (publicly accessible).
 * Used to display the acceptance confirmation page.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const requestId = crypto.randomUUID();

  // Validate token format (should be 64 hex characters from 32 bytes)
  if (!token || token.length < 8 || !/^[a-f0-9]+$/i.test(token)) {
    return NextResponse.json(
      { error: { code: "INVALID_TOKEN_FORMAT", message: "Invalid token format" } },
      { status: 400 }
    );
  }

  // Rate limiting
  const rateLimitKey = createRateLimitKey.invitationAction(token);
  const isAllowed = await checkLimit(
    rateLimitKey,
    RATE_LIMITS.INVITATION_ACTION.limit,
    RATE_LIMITS.INVITATION_ACTION.windowMs,
    { requestId }
  );

  if (!isAllowed) {
    logger.warn("api.invite.get.rate_limit_exceeded", {
      requestId,
      tokenPrefix: token.substring(0, 8),
    });
    return NextResponse.json(
      { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please try again later." } },
      { status: 429 }
    );
  }

  try {
    const invitationData = await getInvitationByToken(token);

    if (!invitationData) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Invitation not found" } },
        { status: 404 }
      );
    }

    // Check status
    if (invitationData.invitation.status === "expired") {
      return NextResponse.json(
        { error: { code: "INVITATION_EXPIRED", message: "Invitation has expired" } },
        { status: 410 }
      );
    }

    if (invitationData.invitation.status !== "pending") {
      return NextResponse.json(
        { error: { code: "INVITATION_INVALID", message: "Invitation is no longer valid" } },
        { status: 410 }
      );
    }

    return NextResponse.json({
      invitation: {
        id: invitationData.invitation.id,
        email: invitationData.invitation.email,
        role: invitationData.invitation.role,
        projectName: invitationData.projectName,
        inviterName: invitationData.inviterName,
        expiresAt: invitationData.invitation.expiresAt,
      }
    });
  } catch (error) {
    logger.error("api.invite.get.error", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch invitation" } },
      { status: 500 }
    );
  }
}

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

  // Validate token format
  if (!token || token.length < 8 || !/^[a-f0-9]+$/i.test(token)) {
    return NextResponse.json(
      { error: { code: "INVALID_TOKEN_FORMAT", message: "Invalid token format" } },
      { status: 400 }
    );
  }

  // Rate limiting
  const rateLimitKey = createRateLimitKey.invitationAction(token);
  const isAllowed = await checkLimit(
    rateLimitKey,
    RATE_LIMITS.INVITATION_ACTION.limit,
    RATE_LIMITS.INVITATION_ACTION.windowMs,
    { requestId }
  );

  if (!isAllowed) {
    logger.warn("api.invite.accept.rate_limit_exceeded", {
      requestId,
      tokenPrefix: token.substring(0, 8),
    });
    return NextResponse.json(
      { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please try again later." } },
      { status: 429 }
    );
  }

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

    // 2. Accept the invitation
    const { projectId, projectSlug } = await acceptProjectInvitation(token, user.id);

    logger.info("api.invite.accept.success", {
      requestId,
      userId: user.id,
      projectId,
    });

    return NextResponse.json(
      { 
        success: true,
        message: "Invitation accepted successfully",
        projectId,
        projectSlug,
        redirectUrl: `/projects/${projectSlug}`
      },
      { status: 200 }
    );

  } catch (error) {
    logger.error("api.invite.accept.error_initial", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

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
      
      // User already member
      if (error.message.includes("User is already a member")) {
         return NextResponse.json(
          { error: { code: "ALREADY_MEMBER", message: "You are already a member of this project" } },
          { status: 400 }
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
