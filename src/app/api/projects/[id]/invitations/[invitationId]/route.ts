/**
 * Project Invitation Management API Routes
 * 
 * DELETE /api/projects/[id]/invitations/[invitationId] - Revoke invitation
 * 
 * @module api/projects/[id]/invitations/[invitationId]
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/rbac";
import { PERMISSIONS } from "@/config/roles";
import { revokeProjectInvitation } from "@/server/projects/invitation-service";
import { logger } from "@/lib/logger";

/**
 * DELETE /api/projects/[id]/invitations/[invitationId]
 * 
 * Revoke (cancel) a project invitation.
 * Requires PROJECT_MANAGE_MEMBERS permission.
 */
export async function DELETE(
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
        { error: { code: "FORBIDDEN", message: "You do not have permission to revoke invitations" } },
        { status: 403 }
      );
    }

    await revokeProjectInvitation(invitationId, user.id);

    logger.info("api.projects.invitations.revoke.success", {
      requestId,
      userId: user.id,
      projectId,
      invitationId,
    });

    return NextResponse.json(
      { success: true, message: "Invitation revoked successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE project invitation error:", error);

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

    logger.error("api.projects.invitations.revoke.error", {
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
