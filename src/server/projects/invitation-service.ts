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
import { teams } from "@/server/db/schema/teams";
import { eq, and, gt, lte, isNull, sql, desc } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { validateEmailUrl } from "@/lib/url-validator";
import { autoPromoteToEditor, ensureOperationalRole } from "@/server/auth/rbac";
import { checkLimit, RATE_LIMITS, createRateLimitKey } from "@/server/auth/rate-limiter";
import { PROJECT_ROLES, TEAM_OPERATIONAL_ROLES } from "@/config/roles";
import type { ProjectRole } from "@/config/roles";
import { enqueueEmail } from "@/server/email";
import { createNotification, buildTargetUrl } from "@/server/notifications";
import {
  logInvitationSent,
  logInvitationAccepted,
  logInvitationRevoked,
  logInvitationDeclined,
  logMemberAdded,
} from "./activity-service";

const ACTIVE_INVITATION_UNIQUE_INDEX = "project_invitations_active_unique_idx";

// Postgres unique-violation SQLSTATE. Drizzle can wrap the driver error in
// DrizzleQueryError; inspect the cause chain so unrelated unique constraints
// (for example token_hash) are not mislabeled as duplicate active invitations.
function isUniqueViolationOnConstraint(err: unknown, constraintName: string): boolean {
  if (typeof err !== "object" || err === null) return false;

  const error = err as {
    code?: unknown;
    constraint?: unknown;
    constraint_name?: unknown;
    message?: unknown;
    cause?: unknown;
  };

  const hasUniqueViolationCode = error.code === "23505";
  const hasTargetConstraint =
    error.constraint === constraintName ||
    error.constraint_name === constraintName ||
    (typeof error.message === "string" && error.message.includes(`"${constraintName}"`));

  if (hasUniqueViolationCode && hasTargetConstraint) return true;
  return isUniqueViolationOnConstraint(error.cause, constraintName);
}
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
  const { projectId, role, invitedBy } = data;
  // Normalize once so duplicate-checks, storage, and accept-time comparisons agree.
  const email = data.email.trim().toLowerCase();

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

  // Generate secure token
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  // 7-day expiration
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Atomically: free the unique slot held by any expired pending invitation,
  // then insert. The partial unique index on (project_id, lower(email))
  // WHERE used_at IS NULL AND cancelled_at IS NULL is the source of truth —
  // a 23505 here means another concurrent caller won the race.
  let invitation: typeof projectInvitations.$inferSelect;
  try {
    invitation = await db.transaction(async (tx) => {
      await tx
        .update(projectInvitations)
        .set({ cancelledAt: new Date() })
        .where(and(
          eq(projectInvitations.projectId, projectId),
          eq(projectInvitations.email, email),
          isNull(projectInvitations.usedAt),
          isNull(projectInvitations.cancelledAt),
          lte(projectInvitations.expiresAt, new Date()),
        ));

      const [row] = await tx
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
      return row;
    });
  } catch (err) {
    if (isUniqueViolationOnConstraint(err, ACTIVE_INVITATION_UNIQUE_INDEX)) {
      throw new Error("An active invitation already exists for this email");
    }
    throw err;
  }

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
      const invitationUrl = `${env.NEXT_PUBLIC_APP_URL}/invite/project/${token}`;
      validateEmailUrl(invitationUrl, 'project-invitation-email');

      // Format role for display (e.g., "PROJECT_MEMBER" -> "Member")
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
    // Don't fail the create — surface the failure on the invitation row instead,
    // so the UI's "Resend" affordance is the operator's recovery path.
    const reason = emailError instanceof Error ? emailError.message : 'Unknown error';
    logger.error("project.invitation.email_failed", {
      invitationId: invitation.id,
      error: reason,
    });
    try {
      await db
        .update(projectInvitations)
        .set({
          emailDeliveryFailed: true,
          emailFailureReason: reason.slice(0, 500),
          emailLastAttemptAt: new Date(),
        })
        .where(eq(projectInvitations.id, invitation.id));
    } catch (markError) {
      logger.error("project.invitation.email_failed_mark_failed", {
        invitationId: invitation.id,
        error: markError instanceof Error ? markError.message : 'Unknown error',
      });
    }
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

  // Fire-and-forget notification for invited user (if they exist in the system)
  try {
    // Check if invited user exists
    const invitedUserResult = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (invitedUserResult[0]) {
      // Get project and team details for notification
      const projectData = await db
        .select({
          projectName: projects.name,
          projectKey: projects.key,
          teamSlug: teams.slug,
        })
        .from(projects)
        .innerJoin(teams, eq(projects.teamId, teams.id))
        .where(eq(projects.id, projectId))
        .limit(1);

      const project = projectData[0];
      if (project) {
        await createNotification({
          recipientId: invitedUserResult[0].id,
          actorId: invitedBy,
          type: "project_invitation",
          entityType: "project",
          entityId: projectId,
          metadata: {
            target_url: buildTargetUrl("project_invitation", {
              team_slug: project.teamSlug,
              project_key: project.projectKey,
            }),
            project_name: project.projectName,
            project_key: project.projectKey,
            team_slug: project.teamSlug,
            invitation_id: invitation.id,
          },
        });
      }
    }
  } catch (notificationError) {
    // Fire-and-forget: Log error but don't block
    logger.error("project.invitation.notification_failed", {
      invitationId: invitation.id,
      error: notificationError instanceof Error ? notificationError.message : 'Unknown error',
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

  // Per-invitation cooldown: prevent email-bomb on a single invite.
  const cooldownAllowed = await checkLimit(
    createRateLimitKey.invitationResend(invitationId),
    RATE_LIMITS.INVITATION_RESEND.limit,
    RATE_LIMITS.INVITATION_RESEND.windowMs,
  );
  if (!cooldownAllowed) {
    throw new Error("Invitation resend cooldown active");
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
      const invitationUrl = `${env.NEXT_PUBLIC_APP_URL}/invite/project/${token}`;
      validateEmailUrl(invitationUrl, 'project-invitation-resend-email');

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
    // Don't fail the resend — re-mark the invitation as failed so the UI
    // can surface the failure (mirrors the create path).
    const reason = emailError instanceof Error ? emailError.message : 'Unknown error';
    logger.error("project.invitation.email_failed", {
      invitationId,
      error: reason,
    });
    try {
      await db
        .update(projectInvitations)
        .set({
          emailDeliveryFailed: true,
          emailFailureReason: reason.slice(0, 500),
          emailLastAttemptAt: new Date(),
        })
        .where(eq(projectInvitations.id, invitationId));
    } catch (markError) {
      logger.error("project.invitation.email_failed_mark_failed", {
        invitationId,
        error: markError instanceof Error ? markError.message : 'Unknown error',
      });
    }
  }

  return { token };
}

/**
 * Accept a project invitation
 */
export async function acceptProjectInvitation(
  token: string,
  userId: string,
  userEmail: string
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

  if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
    throw new Error("This invitation was sent to a different email address");
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

  const role = invitation.role as ProjectRole;

  if (role === PROJECT_ROLES.PROJECT_OWNER) {
    throw new Error("Invitations cannot grant PROJECT_OWNER");
  }

  // Atomically add the project member and mark the invitation used.
  // If either write fails, the invitation stays pending so retry is safe.
  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, invitation.projectId),
          eq(projectMembers.userId, userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new Error("User is already a member of this project");
    }

    await tx.insert(projectMembers).values({
      projectId: invitation.projectId,
      userId,
      role,
    });

    await tx
      .update(projectInvitations)
      .set({ usedAt: new Date() })
      .where(eq(projectInvitations.id, invitation.id));
  });

  // Team-role bump runs after commit; it's upgrade-only and idempotent on retry.
  if (role === PROJECT_ROLES.PROJECT_EDITOR) {
    await autoPromoteToEditor(userId, project.teamId);
  } else {
    await ensureOperationalRole(userId, project.teamId, TEAM_OPERATIONAL_ROLES.TEAM_VIEWER);
  }

  logger.info("project.invitation.accepted", {
    invitationId: invitation.id,
    projectId: invitation.projectId,
    userId,
  });
  logger.info("project.member.added", {
    projectId: invitation.projectId,
    userId,
    role,
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

/**
 * Accept a project invitation by its UUID (used from notification actions)
 */
export async function acceptProjectInvitationById(
  invitationId: string,
  userId: string,
  userEmail: string
): Promise<{ projectId: string; projectSlug: string }> {
  const invitationResult = await db
    .select()
    .from(projectInvitations)
    .where(eq(projectInvitations.id, invitationId))
    .limit(1);

  const invitation = invitationResult[0];

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
    throw new Error("This invitation was sent to a different email address");
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

  const projectResult = await db
    .select()
    .from(projects)
    .where(eq(projects.id, invitation.projectId))
    .limit(1);

  const project = projectResult[0];

  if (!project) {
    throw new Error("Project not found");
  }

  const role = invitation.role as ProjectRole;

  if (role === PROJECT_ROLES.PROJECT_OWNER) {
    throw new Error("Invitations cannot grant PROJECT_OWNER");
  }

  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, invitation.projectId),
          eq(projectMembers.userId, userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new Error("User is already a member of this project");
    }

    await tx.insert(projectMembers).values({
      projectId: invitation.projectId,
      userId,
      role,
    });

    await tx
      .update(projectInvitations)
      .set({ usedAt: new Date() })
      .where(eq(projectInvitations.id, invitation.id));
  });

  if (role === PROJECT_ROLES.PROJECT_EDITOR) {
    await autoPromoteToEditor(userId, project.teamId);
  } else {
    await ensureOperationalRole(userId, project.teamId, TEAM_OPERATIONAL_ROLES.TEAM_VIEWER);
  }

  logger.info("project.invitation.accepted_by_id", {
    invitationId: invitation.id,
    projectId: invitation.projectId,
    userId,
  });
  logger.info("project.member.added", {
    projectId: invitation.projectId,
    userId,
    role,
  });

  try {
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
 * Decline a project invitation by its UUID (used from notification actions)
 */
export async function declineProjectInvitationById(
  invitationId: string,
  userId: string,
  userEmail: string
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

  if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
    throw new Error("This invitation was sent to a different email address");
  }

  if (invitation.usedAt || invitation.cancelledAt) {
    throw new Error("Invitation is no longer active");
  }

  if (new Date() > invitation.expiresAt) {
    throw new Error("Invitation has expired");
  }

  await db
    .update(projectInvitations)
    .set({ cancelledAt: new Date() })
    .where(eq(projectInvitations.id, invitation.id));

  logger.info("project.invitation.declined_by_id", {
    invitationId: invitation.id,
    projectId: invitation.projectId,
    userId,
  });

  try {
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
    logger.error("project.invitation.activity_log_failed", {
      invitationId: invitation.id,
      error: activityError instanceof Error ? activityError.message : 'Unknown error',
    });
  }
}
