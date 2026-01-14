/**
 * Decline Project Invitation API Route
 * 
 * POST /api/invite/project/[token]/decline - Decline a project invitation
 * 
 * @module api/invite/project/[token]/decline
 */

import { NextRequest, NextResponse } from "next/server";
import { declineProjectInvitation } from "@/server/projects/invitation-service";
import { logger } from "@/lib/logger";
import { checkLimit, RATE_LIMITS, createRateLimitKey } from "@/server/auth/rate-limiter";

/**
 * POST /api/invite/project/[token]/decline
 * 
 * Decline a project invitation using a token.
 * Does not require authentication (user can decline from email link).
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
    logger.warn("api.invite.decline.rate_limit_exceeded", {
      requestId,
      tokenPrefix: token.substring(0, 8),
    });
    return NextResponse.json(
      { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please try again later." } },
      { status: 429 }
    );
  }

  try {
    await declineProjectInvitation(token);

    logger.info("api.invite.decline.success", {
      requestId,
      tokenPrefix: token.substring(0, 8),
    });

    return NextResponse.json(
      { 
        success: true,
        message: "Invitation declined" 
      },
      { status: 200 }
    );

  } catch (error) {
    logger.error("api.invite.decline.error", {
      requestId,
      tokenPrefix: token.substring(0, 8),
      error: error instanceof Error ? error.message : "Unknown error",
    });

    if (error instanceof Error) {
      if (error.message.includes("Invalid invitation token")) {
        return NextResponse.json(
          { error: { code: "INVALID_INVITATION", message: "This invitation link is invalid" } },
          { status: 400 }
        );
      }

      if (error.message.includes("Invitation is no longer active")) {
        return NextResponse.json(
          { error: { code: "INVITATION_INACTIVE", message: "This invitation is no longer active" } },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
