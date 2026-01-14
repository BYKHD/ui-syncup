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
import type { ProjectRole } from "@/config/roles";
import { enqueueEmail } from "@/server/email";
import {
  logInvitationSent,
  logInvitationAccepted,
  logInvitationRevoked,
  logInvitationDeclined,
  logMemberAdded,
} from "./activity-service";
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
 * Check if a user with the given email is already a project member
 * @returns User ID if member exists, null otherwise
 */
async function checkExistingProjectMember(
  projectId: string,
  email: string
): Promise<string | null> {
  const normalizedEmail = email.toLowerCase().trim();
  
  const member = await db
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(users.email, normalizedEmail)
      )
    )
    .limit(1);

  return member.length > 0 ? member[0].userId : null;
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
      emailDeliveryFailed: projectInvitations.emailDeliveryFailed,
      emailFailureReason: projectInvitations.emailFailureReason,
      emailLastAttemptAt: projectInvitations.emailLastAttemptAt,
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
      emailDeliveryFailed: inv.emailDeliveryFailed,
      emailFailureReason: inv.emailFailureReason,
      emailLastAttemptAt: inv.emailLastAttemptAt,
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
  const existingMemberId = await checkExistingProjectMember(projectId, email);
  if (existingMemberId) {
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

  // Queue invitation email
  try {
    // Get project and inviter details for email
    const [projectData, inviterData] = await Promise.all([
      db.select().from(projects).where(eq(projects.id, projectId)).limit(1),
      db.select().from(users).where(eq(users.id, invitedBy)).limit(1),
    ]);

    const project = projectData[0];
    const inviter = inviterData[0];

    if (project && inviter) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const invitationUrl = `${baseUrl}/invite/project/${token}`;
      
      // Format role for display (e.g., "PROJECT_DEVELOPER" -> "Developer")
      const roleDisplay = role.replace('PROJECT_', '').toLowerCase()
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      await enqueueEmail({
        userId: invitedBy,
        type: 'project_invitation',
        to: email,
        template: {
          type: 'project_invitation',
          data: {
            inviterName: inviter.name,
            projectName: project.name,
            role: roleDisplay,
            invitationUrl,
            expiresIn: '7 days',
          },
        },
      });

      logger.info("project.invitation.email_queued", {
        invitationId: invitation.id,
        email,
      });
    }
  } catch (emailError) {
    // Log error but don't fail invitation creation
    logger.error("project.invitation.email_failed", {
      invitationId: invitation.id,
      error: emailError instanceof Error ? emailError.message : 'Unknown error',
    });
  }

  // Log activity for invitation sent
  try {
    // Fetch project to get teamId for activity logging
    const projectResult = await db
      .select({ teamId: projects.teamId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (projectResult[0]) {
      await logInvitationSent(
        projectResult[0].teamId,
        projectId,
        invitedBy,
        {
          invitationId: invitation.id,
          email,
          role,
        }
      );
    }
  } catch (activityError) {
    // Log error but don't fail invitation creation
    logger.error("project.invitation.activity_log_failed", {
      invitationId: invitation.id,
      error: activityError instanceof Error ? activityError.message : 'Unknown error',
    });
  }

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
      emailDeliveryFailed: invitation.emailDeliveryFailed ?? false,
      emailFailureReason: invitation.emailFailureReason,
      emailLastAttemptAt: invitation.emailLastAttemptAt,
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

  // Log activity for invitation revoked
  try {
    // Fetch project to get teamId for activity logging
    const projectResult = await db
      .select({ teamId: projects.teamId })
      .from(projects)
      .where(eq(projects.id, invitation.projectId))
      .limit(1);

    if (projectResult[0]) {
      await logInvitationRevoked(
        projectResult[0].teamId,
        invitation.projectId,
        actorId,
        {
          invitationId,
          email: invitation.email,
        }
      );
    }
  } catch (activityError) {
    // Log error but don't fail revocation
    logger.error("project.invitation.activity_log_failed", {
      invitationId,
      error: activityError instanceof Error ? activityError.message : 'Unknown error',
    });
  }
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
      emailDeliveryFailed: false,
      emailFailureReason: null,
      emailLastAttemptAt: null,
    })
    .where(eq(projectInvitations.id, invitationId));

  logger.info("project.invitation.resent", {
    invitationId,
    projectId: invitation.projectId,
    actorId,
  });

  // Queue invitation email
  try {
    // Get project and inviter details for email
    const [projectData, inviterData] = await Promise.all([
      db.select().from(projects).where(eq(projects.id, invitation.projectId)).limit(1),
      db.select().from(users).where(eq(users.id, actorId)).limit(1),
    ]);

    const project = projectData[0];
    const inviter = inviterData[0];

    if (project && inviter) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const invitationUrl = `${baseUrl}/invite/project/${token}`;
      
      // Format role for display
      const roleDisplay = invitation.role.replace('PROJECT_', '').toLowerCase()
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      await enqueueEmail({
        userId: actorId,
        type: 'project_invitation',
        to: invitation.email,
        template: {
          type: 'project_invitation',
          data: {
            inviterName: inviter.name,
            projectName: project.name,
            role: roleDisplay,
            invitationUrl,
            expiresIn: '7 days',
          },
        },
      });

      logger.info("project.invitation.email_queued", {
        invitationId,
        email: invitation.email,
      });
    }
  } catch (emailError) {
    // Log error but don't fail resend
    logger.error("project.invitation.email_failed", {
      invitationId,
      error: emailError instanceof Error ? emailError.message : 'Unknown error',
    });
  }

  return { token };
}

/**
 * Accept a project invitation
 */
export async function acceptProjectInvitation(
  token: string,
  userId: string
): Promise<{ projectId: string; projectSlug: string }> {
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

  // Log activity for invitation accepted and member added
  try {
    // Get user details for activity metadata
    const userResult = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const userName = userResult[0]?.name ?? 'Unknown User';

    await logInvitationAccepted(
      project.teamId,
      invitation.projectId,
      userId,
      {
        invitationId: invitation.id,
        userId,
        userName,
        role: invitation.role,
      }
    );

    await logMemberAdded(
      project.teamId,
      invitation.projectId,
      userId,
      {
        userId,
        userName,
        role: invitation.role,
        addedVia: "invitation",
      }
    );
  } catch (activityError) {
    // Log error but don't fail acceptance
    logger.error("project.invitation.activity_log_failed", {
      invitationId: invitation.id,
      error: activityError instanceof Error ? activityError.message : 'Unknown error',
    });
  }

  return {
    projectId: project.id,
    projectSlug: project.slug,
  };
}

/**
 * Get invitation details by token
 * Used for the invitation acceptance page
 */
export async function getInvitationByToken(token: string): Promise<{
  invitation: ProjectInvitation;
  projectName: string;
  inviterName: string;
} | null> {
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const invitationResult = await db
    .select({
      invitation: projectInvitations,
      projectName: projects.name,
      inviterName: users.name,
    })
    .from(projectInvitations)
    .innerJoin(projects, eq(projectInvitations.projectId, projects.id))
    .leftJoin(users, eq(projectInvitations.invitedBy, users.id))
    .where(eq(projectInvitations.tokenHash, tokenHash))
    .limit(1);

  if (invitationResult.length === 0) {
    return null;
  }

  const { invitation, projectName, inviterName } = invitationResult[0];

  return {
    invitation: {
      id: invitation.id,
      projectId: invitation.projectId,
      email: invitation.email,
      role: invitation.role as Exclude<ProjectRole, "PROJECT_OWNER">,
      status: getInvitationStatus({
        usedAt: invitation.usedAt,
        cancelledAt: invitation.cancelledAt,
        expiresAt: invitation.expiresAt,
      }),
      invitedBy: invitation.invitedBy ?? '',
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      usedAt: invitation.usedAt,
      cancelledAt: invitation.cancelledAt,
      emailDeliveryFailed: invitation.emailDeliveryFailed ?? false,
      emailFailureReason: invitation.emailFailureReason,
      emailLastAttemptAt: invitation.emailLastAttemptAt,
    },
    projectName,
    inviterName: inviterName ?? 'Deleted User',
  };
}

/**
 * Decline a project invitation
 */
export async function declineProjectInvitation(token: string): Promise<void> {
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

  if (invitation.usedAt || invitation.cancelledAt) {
    throw new Error("Invitation is no longer active");
  }

  // Check if invitation has expired
  if (new Date() > invitation.expiresAt) {
    throw new Error("Invitation has expired");
  }

  await db
    .update(projectInvitations)
    .set({ cancelledAt: new Date() }) // We use cancelledAt for declined status as well
    .where(eq(projectInvitations.id, invitation.id));

  logger.info("project.invitation.declined", {
    invitationId: invitation.id,
    projectId: invitation.projectId,
  });

  // Log activity for invitation declined
  try {
    // Fetch project to get teamId for activity logging
    const projectResult = await db
      .select({ teamId: projects.teamId })
      .from(projects)
      .where(eq(projects.id, invitation.projectId))
      .limit(1);

    if (projectResult[0]) {
      await logInvitationDeclined(
        projectResult[0].teamId,
        invitation.projectId,
        {
          invitationId: invitation.id,
          email: invitation.email,
        }
      );
    }
  } catch (activityError) {
    // Log error but don't fail decline
    logger.error("project.invitation.activity_log_failed", {
      invitationId: invitation.id,
      error: activityError instanceof Error ? activityError.message : 'Unknown error',
    });
  }
}
