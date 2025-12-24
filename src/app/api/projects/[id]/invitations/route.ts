/**
 * Project Invitations API Routes
 * 
 * GET /api/projects/[id]/invitations - List project invitations
 * POST /api/projects/[id]/invitations - Create new invitation
 * 
 * @module api/projects/[id]/invitations
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/rbac";
import { PERMISSIONS, PROJECT_ROLES } from "@/config/roles";
import { 
  listProjectInvitations, 
  createProjectInvitation 
} from "@/server/projects/invitation-service";
import { logger } from "@/lib/logger";
import { z } from "zod";

/**
 * Zod schema for creating an invitation
 */
const CreateInvitationSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum([
    PROJECT_ROLES.PROJECT_EDITOR,
    PROJECT_ROLES.PROJECT_DEVELOPER,
    PROJECT_ROLES.PROJECT_VIEWER,
  ]),
});

/**
 * GET /api/projects/[id]/invitations
 * 
 * List all invitations for a project.
 * Requires PROJECT_VIEW permission.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const { id: projectId } = await params;

  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const canView = await hasPermission({
      userId: user.id,
      permission: PERMISSIONS.PROJECT_VIEW,
      resourceId: projectId,
      resourceType: "project",
    });

    if (!canView) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You do not have permission to view this project's invitations" } },
        { status: 403 }
      );
    }

    const invitations = await listProjectInvitations(projectId);

    // Map to frontend-friendly format
    const serializedInvitations = invitations.map((inv) => ({
      id: inv.id,
      invitedUserId: inv.invitedUser?.id || null,
      role: inv.role.replace("PROJECT_", "").toLowerCase(), // e.g., "editor"
      status: inv.status,
      createdAt: inv.createdAt.toISOString(),
      expiresAt: inv.expiresAt.toISOString(),
      invitedUser: inv.invitedUser ? {
        id: inv.invitedUser.id,
        name: inv.invitedUser.name,
        email: inv.invitedUser.email,
        image: inv.invitedUser.image,
      } : {
        id: "",
        name: inv.email.split("@")[0], // Use email prefix as fallback name
        email: inv.email,
        image: null,
      },
      invitedByUser: {
        id: inv.invitedByUser.id,
        name: inv.invitedByUser.name,
        email: inv.invitedByUser.email,
        image: inv.invitedByUser.image,
      },
    }));

    logger.info("api.projects.invitations.list.success", {
      requestId,
      userId: user.id,
      projectId,
      count: invitations.length,
    });

    return NextResponse.json(
      { invitations: serializedInvitations },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET project invitations error:", error);
    logger.error("api.projects.invitations.list.error", {
      requestId,
      projectId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/invitations
 * 
 * Create a new project invitation.
 * Requires PROJECT_MANAGE_MEMBERS permission.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const { id: projectId } = await params;

  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = CreateInvitationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: { 
            code: "INVALID_INPUT", 
            message: validation.error.errors[0]?.message || "Invalid input",
            details: validation.error.errors,
          } 
        },
        { status: 400 }
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
        { error: { code: "FORBIDDEN", message: "You do not have permission to invite members" } },
        { status: 403 }
      );
    }

    const { invitation, token } = await createProjectInvitation({
      projectId,
      email: validation.data.email,
      role: validation.data.role,
      invitedBy: user.id,
    });

    logger.info("api.projects.invitations.create.success", {
      requestId,
      userId: user.id,
      projectId,
      invitationId: invitation.id,
      email: validation.data.email,
    });

    // TODO: Send invitation email with token
    // await enqueueEmail({ ... })

    return NextResponse.json(
      { 
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role.replace("PROJECT_", "").toLowerCase(),
          status: invitation.status,
          expiresAt: invitation.expiresAt.toISOString(),
        },
        message: "Invitation sent successfully" 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST project invitation error:", error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes("rate limit")) {
        return NextResponse.json(
          { error: { code: "RATE_LIMIT", message: error.message } },
          { status: 429 }
        );
      }
      if (error.message.includes("already a member")) {
        return NextResponse.json(
          { error: { code: "ALREADY_MEMBER", message: error.message } },
          { status: 400 }
        );
      }
      if (error.message.includes("active invitation")) {
        return NextResponse.json(
          { error: { code: "INVITATION_EXISTS", message: error.message } },
          { status: 400 }
        );
      }
    }

    logger.error("api.projects.invitations.create.error", {
      requestId,
      projectId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
