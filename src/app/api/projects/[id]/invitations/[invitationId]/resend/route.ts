/**
 * Project Invitation Resend API Route
 * 
 * POST /api/projects/[id]/invitations/[invitationId]/resend - Resend invitation
 * 
 * @module api/projects/[id]/invitations/[invitationId]/resend
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/rbac";
import { PERMISSIONS } from "@/config/roles";
import { resendProjectInvitation } from "@/server/projects/invitation-service";
import { logger } from "@/lib/logger";

/**
 * POST /api/projects/[id]/invitations/[invitationId]/resend
 * 
 * Resend a project invitation (generates new token and resets expiration).
 * Requires PROJECT_MANAGE_MEMBERS permission.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; invitationId: string }> }
) {
  const requestId = crypto.randomUUID();
  const { id: projectId, invitationId } = await params;

  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const canManage = await hasPermission({
      userId: user.id,
      permission: PERMISSIONS.PROJECT_MANAGE_MEMBERS,
      resourceId: projectId,
      resourceType: "project",
    });

    if (!canManage) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You do not have permission to resend invitations" } },
        { status: 403 }
      );
    }

    const { token } = await resendProjectInvitation(invitationId, user.id);

    logger.info("api.projects.invitations.resend.success", {
      requestId,
      userId: user.id,
      projectId,
      invitationId,
    });

    // TODO: Send invitation email with new token
    // await enqueueEmail({ ... })

    return NextResponse.json(
      { success: true, message: "Invitation resent successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST resend invitation error:", error);

    if (error instanceof Error) {
      if (error.message === "Invitation not found") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: error.message } },
          { status: 404 }
        );
      }
      if (error.message === "Invitation is no longer active") {
        return NextResponse.json(
          { error: { code: "INACTIVE", message: error.message } },
          { status: 400 }
        );
      }
    }

    logger.error("api.projects.invitations.resend.error", {
      requestId,
      projectId,
      invitationId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
