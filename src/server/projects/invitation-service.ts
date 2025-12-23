/**
 * Project Invitation Service
 * 
 * Business logic for project invitation operations including creating,
 * listing, revoking, and resending project invitations.
 */

import { db } from "@/lib/db";
import { projectInvitations } from "@/server/db/schema/project-invitations";
import { projectMembers } from "@/server/db/schema/project-members";
import { projects } from "@/server/db/schema/projects";
import { users } from "@/server/db/schema/users";
import { eq, and, gt, isNull, sql, desc } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";
import { logger } from "@/lib/logger";
import { addMember } from "./member-service";
import { PROJECT_ROLES } from "@/config/roles";
import type { ProjectRole } from "@/config/roles";
import type { 
  ProjectInvitation,
  ProjectInvitationWithUsers,
  CreateProjectInvitationData,
  InvitationStatus 
} from "./types";

/**
 * Get invitation status based on timestamps
 */
function getInvitationStatus(invitation: {
  usedAt: Date | null;
  cancelledAt: Date | null;
  expiresAt: Date;
}): InvitationStatus {
  if (invitation.usedAt) return "accepted";
  if (invitation.cancelledAt) return "declined";
  if (new Date() > invitation.expiresAt) return "expired";
  return "pending";
}

/**
 * List all invitations for a project
 */
export async function listProjectInvitations(
  projectId: string
): Promise<ProjectInvitationWithUsers[]> {
  const invitations = await db
    .select({
      id: projectInvitations.id,
      projectId: projectInvitations.projectId,
      email: projectInvitations.email,
      role: projectInvitations.role,
      invitedBy: projectInvitations.invitedBy,
      expiresAt: projectInvitations.expiresAt,
      createdAt: projectInvitations.createdAt,
      usedAt: projectInvitations.usedAt,
      cancelledAt: projectInvitations.cancelledAt,
      invitedByUserId: users.id,
      invitedByUserName: users.name,
      invitedByUserEmail: users.email,
      invitedByUserImage: users.image,
    })
    .from(projectInvitations)
    .innerJoin(users, eq(projectInvitations.invitedBy, users.id))
    .where(eq(projectInvitations.projectId, projectId))
    .orderBy(desc(projectInvitations.createdAt));

  // Fetch invited users by email (if they exist in system)
  const invitedUserEmails = invitations.map(i => i.email);
  const invitedUsers = invitedUserEmails.length > 0 
    ? await db
        .select()
        .from(users)
        .where(sql`${users.email} IN (${sql.join(invitedUserEmails.map(e => sql`${e}`), sql`, `)})`)
    : [];

  const usersByEmail = new Map(invitedUsers.map(u => [u.email, u]));

  return invitations.map((inv) => {
    const invitedUser = usersByEmail.get(inv.email);
    return {
      id: inv.id,
      projectId: inv.projectId,
      email: inv.email,
      role: inv.role as Exclude<ProjectRole, "PROJECT_OWNER">,
      status: getInvitationStatus({
        usedAt: inv.usedAt,
        cancelledAt: inv.cancelledAt,
        expiresAt: inv.expiresAt,
      }),
      invitedBy: inv.invitedBy,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      usedAt: inv.usedAt,
      cancelledAt: inv.cancelledAt,
      invitedUser: invitedUser ? {
        id: invitedUser.id,
        name: invitedUser.name,
        email: invitedUser.email,
        image: invitedUser.image,
      } : null,
      invitedByUser: {
        id: inv.invitedByUserId,
        name: inv.invitedByUserName,
        email: inv.invitedByUserEmail,
        image: inv.invitedByUserImage,
      },
    };
  });
}

/**
 * Create a new project invitation
 */
export async function createProjectInvitation(
  data: CreateProjectInvitationData
): Promise<{ invitation: ProjectInvitation; token: string }> {
  const { projectId, email, role, invitedBy } = data;

  // Rate limiting (10/hour per project)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentInvitations = await db
    .select({ count: sql<number>`count(*)` })
    .from(projectInvitations)
    .where(and(
      eq(projectInvitations.projectId, projectId),
      gt(projectInvitations.createdAt, oneHourAgo)
    ));

  const count = recentInvitations[0]?.count ?? 0;
  if (count >= 10) {
    logger.warn("project.invitation.create.rate_limit", {
      projectId,
      invitedBy,
      count,
    });
    throw new Error("Invitation rate limit exceeded (10 per hour)");
  }

  // Check if user is already a member
  const existingMember = await db
    .select()
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(and(
      eq(projectMembers.projectId, projectId),
      eq(users.email, email)
    ));

  if (existingMember.length > 0) {
    throw new Error("User is already a member of this project");
  }

  // Check for existing pending invitation
  const existingInvitationResult = await db
    .select()
    .from(projectInvitations)
    .where(and(
      eq(projectInvitations.projectId, projectId),
      eq(projectInvitations.email, email),
      isNull(projectInvitations.usedAt),
      isNull(projectInvitations.cancelledAt),
      gt(projectInvitations.expiresAt, new Date())
    ))
    .limit(1);

  if (existingInvitationResult.length > 0) {
    throw new Error("An active invitation already exists for this email");
  }

  // Generate secure token
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  // 7-day expiration
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Create invitation
  const [invitation] = await db
    .insert(projectInvitations)
    .values({
      projectId,
      email,
      tokenHash,
      role,
      invitedBy,
      expiresAt,
    })
    .returning();

  logger.info("project.invitation.created", {
    projectId,
    invitationId: invitation.id,
    email,
    role,
    invitedBy,
  });

  return {
    invitation: {
      id: invitation.id,
      projectId: invitation.projectId,
      email: invitation.email,
      role: invitation.role as Exclude<ProjectRole, "PROJECT_OWNER">,
      status: "pending",
      invitedBy: invitation.invitedBy,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      usedAt: invitation.usedAt,
      cancelledAt: invitation.cancelledAt,
    },
    token,
  };
}

/**
 * Revoke (cancel) a project invitation
 */
export async function revokeProjectInvitation(
  invitationId: string,
  actorId: string
): Promise<void> {
  const invitationResult = await db
    .select()
    .from(projectInvitations)
    .where(eq(projectInvitations.id, invitationId))
    .limit(1);
  
  const invitation = invitationResult[0];

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (invitation.usedAt || invitation.cancelledAt) {
    throw new Error("Invitation is no longer active");
  }

  await db
    .update(projectInvitations)
    .set({ cancelledAt: new Date() })
    .where(eq(projectInvitations.id, invitationId));

  logger.info("project.invitation.revoked", {
    invitationId,
    projectId: invitation.projectId,
    actorId,
  });
}

/**
 * Resend a project invitation (generates new token)
 */
export async function resendProjectInvitation(
  invitationId: string,
  actorId: string
): Promise<{ token: string }> {
  const invitationResult = await db
    .select()
    .from(projectInvitations)
    .where(eq(projectInvitations.id, invitationId))
    .limit(1);
  
  const invitation = invitationResult[0];

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (invitation.usedAt || invitation.cancelledAt) {
    throw new Error("Invitation is no longer active");
  }

  // Generate new token
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db
    .update(projectInvitations)
    .set({
      tokenHash,
      expiresAt,
      createdAt: new Date(),
    })
    .where(eq(projectInvitations.id, invitationId));

  logger.info("project.invitation.resent", {
    invitationId,
    projectId: invitation.projectId,
    actorId,
  });

  return { token };
}

/**
 * Accept a project invitation
 */
export async function acceptProjectInvitation(
  token: string,
  userId: string
): Promise<void> {
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const invitationResult = await db
    .select()
    .from(projectInvitations)
    .where(eq(projectInvitations.tokenHash, tokenHash))
    .limit(1);
  
  const invitation = invitationResult[0];

  if (!invitation) {
    throw new Error("Invalid invitation token");
  }

  if (invitation.usedAt) {
    throw new Error("Invitation already used");
  }

  if (invitation.cancelledAt) {
    throw new Error("Invitation cancelled");
  }

  if (new Date() > invitation.expiresAt) {
    throw new Error("Invitation expired");
  }

  // Get project to find teamId
  const projectResult = await db
    .select()
    .from(projects)
    .where(eq(projects.id, invitation.projectId))
    .limit(1);
  
  const project = projectResult[0];

  if (!project) {
    throw new Error("Project not found");
  }

  // Add user to project
  await addMember(
    invitation.projectId,
    userId,
    invitation.role as ProjectRole,
    project.teamId
  );

  // Mark invitation as used
  await db
    .update(projectInvitations)
    .set({ usedAt: new Date() })
    .where(eq(projectInvitations.id, invitation.id));

  logger.info("project.invitation.accepted", {
    invitationId: invitation.id,
    projectId: invitation.projectId,
    userId,
  });
}
