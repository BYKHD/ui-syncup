import { db } from "@/lib/db";
import { teamInvitations } from "@/server/db/schema/team-invitations";
import { teamMembers } from "@/server/db/schema/team-members";
import { teams } from "@/server/db/schema/teams";
import { users } from "@/server/db/schema/users";
import { eq, and, gt, sql } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";
import { logTeamEvent } from "./team-service";
import { addMember } from "./member-service";
import { enqueueEmail } from "@/server/email";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createNotification, buildTargetUrl } from "@/server/notifications";
import type { CreateInvitationInput, Invitation } from "./types";
import { logAdminAction } from "@/server/audit";

/**
 * Creates a new invitation
 * Implements Requirements 2.1, 2.2, 2A.5, 14.2
 */
export async function createInvitation(input: CreateInvitationInput): Promise<{ invitation: Invitation; token: string }> {
  const { teamId, email, managementRole, operationalRole, invitedBy } = input;

  try {
    // Requirement 2A.5: Rate limiting (10/hour per team)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentInvitations = await db
      .select({ count: sql<number>`count(*)` })
      .from(teamInvitations)
      .where(and(
        eq(teamInvitations.teamId, teamId),
        gt(teamInvitations.createdAt, oneHourAgo)
      ));

    const count = recentInvitations[0]?.count ?? 0;
    if (count >= 10) {
      logTeamEvent("team.invitation.create.failure", {
        outcome: "failure",
        userId: invitedBy,
        teamId,
        errorCode: "RATE_LIMIT_EXCEEDED",
        errorMessage: "Invitation rate limit exceeded (10 per hour)",
        metadata: { email, count },
      });
      throw new Error("Invitation rate limit exceeded (10 per hour)");
    }

    // Check if user is already a member
    const existingMember = await db
      .select()
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(users.email, email)
      ));

    if (existingMember.length > 0) {
      logTeamEvent("team.invitation.create.failure", {
        outcome: "failure",
        userId: invitedBy,
        teamId,
        errorCode: "ALREADY_MEMBER",
        errorMessage: "User is already a member of this team",
        metadata: { email },
      });
      throw new Error("User is already a member of this team");
    }

    // Generate secure token
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");

    // Requirement 2.1: 7-day expiration
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Create invitation
    const [invitation] = await db
      .insert(teamInvitations)
      .values({
        teamId,
        email,
        tokenHash,
        managementRole: managementRole ?? null,
        operationalRole,
        invitedBy,
        expiresAt,
      })
      .returning();

    // Get team and inviter info for email
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });
    
    const inviter = await db.query.users.findFirst({
      where: eq(users.id, invitedBy),
    });

    if (team && inviter) {
      // Send email
      // Requirement 2.2: Send email with unique link
      const invitationUrl = `${env.NEXT_PUBLIC_APP_URL}/join-team?token=${token}`;
      
      await enqueueEmail({
        userId: invitedBy,
        type: "team_invitation",
        to: email,
        template: {
          type: "team_invitation",
          data: {
            inviterName: inviter.name,
            teamName: team.name,
            invitationUrl,
            expiresIn: "7 days",
          },
        },
      });
    }

    // Log invitation creation (Requirement 14.2)
    logTeamEvent("team.invitation.create.success", {
      outcome: "success",
      userId: invitedBy,
      teamId,
      metadata: {
        invitationId: invitation.id,
        email,
        managementRole,
        operationalRole,
      },
    });

    // Fire-and-forget notification for invited user (if they exist in the system)
    try {
      // Check if invited user exists
      const invitedUserResult = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email.toLowerCase().trim()))
        .limit(1);

      if (invitedUserResult[0] && team) {
        await createNotification({
          recipientId: invitedUserResult[0].id,
          actorId: invitedBy,
          type: "team_invitation",
          entityType: "team",
          entityId: teamId,
          metadata: {
            target_url: buildTargetUrl("team_invitation", {
              team_slug: team.slug,
            }),
            team_name: team.name,
            team_slug: team.slug,
            invitation_id: invitation.id,
          },
        });
      }
    } catch (notificationError) {
      // Fire-and-forget: Log error but don't block
      logger.error("team.invitation.notification.failed", {
        userId: invitedBy,
        teamId,
        invitationId: invitation.id,
        error: notificationError instanceof Error ? notificationError.message : 'Unknown error',
      });
    }

    return { invitation: invitation as unknown as Invitation, token };
  } catch (error) {
    // Log failure if not already logged
    if (error instanceof Error && 
        !error.message.includes("rate limit") && 
        !error.message.includes("already a member")) {
      logTeamEvent("team.invitation.create.failure", {
        outcome: "error",
        userId: invitedBy,
        teamId,
        errorCode: "INVITATION_CREATE_ERROR",
        errorMessage: error.message,
        metadata: { email },
      });
    }
    throw error;
  }
}

/**
 * Accepts an invitation
 * Implements Requirements 2.3, 2.4, 2.5, 14.2
 */
export async function acceptInvitation(token: string, userId: string): Promise<void> {
  try {
    // Hash token to lookup
    const tokenHash = createHash("sha256").update(token).digest("hex");

    // Find invitation
    const invitation = await db.query.teamInvitations.findFirst({
      where: eq(teamInvitations.tokenHash, tokenHash),
    });

    // Requirement 2.5: Reject invalid/expired/used invitations
    if (!invitation) {
      logTeamEvent("team.invitation.accept.failure", {
        outcome: "failure",
        userId,
        errorCode: "INVALID_TOKEN",
        errorMessage: "Invalid invitation token",
      });
      throw new Error("Invalid invitation token");
    }

    if (invitation.usedAt) {
      logTeamEvent("team.invitation.accept.failure", {
        outcome: "failure",
        userId,
        teamId: invitation.teamId,
        errorCode: "INVITATION_USED",
        errorMessage: "Invitation already used",
        metadata: { invitationId: invitation.id },
      });
      throw new Error("Invitation already used");
    }

    if (invitation.cancelledAt) {
      logTeamEvent("team.invitation.accept.failure", {
        outcome: "failure",
        userId,
        teamId: invitation.teamId,
        errorCode: "INVITATION_CANCELLED",
        errorMessage: "Invitation cancelled",
        metadata: { invitationId: invitation.id },
      });
      throw new Error("Invitation cancelled");
    }

    if (new Date() > invitation.expiresAt) {
      logTeamEvent("team.invitation.accept.failure", {
        outcome: "failure",
        userId,
        teamId: invitation.teamId,
        errorCode: "INVITATION_EXPIRED",
        errorMessage: "Invitation expired",
        metadata: { invitationId: invitation.id, expiresAt: invitation.expiresAt },
      });
      throw new Error("Invitation expired");
    }

    // Requirement 2.3: Add user to team
    await addMember({
      teamId: invitation.teamId,
      userId,
      managementRole: invitation.managementRole,
      operationalRole: invitation.operationalRole,
      invitedBy: invitation.invitedBy,
    });

    // Requirement 2.4: Mark as used
    await db
      .update(teamInvitations)
      .set({ usedAt: new Date() })
      .where(eq(teamInvitations.id, invitation.id));

    // Log acceptance (Requirement 2.4, 14.2)
    logTeamEvent("team.invitation.accept.success", {
      outcome: "success",
      userId,
      teamId: invitation.teamId,
      metadata: {
        invitationId: invitation.id,
      },
    });

    // Audit log invitation acceptance
    logAdminAction('member.invitation.accepted', {
      userId: userId,
      resourceType: 'team',
      resourceId: invitation.teamId,
      metadata: {
        invitationId: invitation.id,
        managementRole: invitation.managementRole,
        operationalRole: invitation.operationalRole,
      },
    });
  } catch (error) {
    // Log failure if not already logged
    if (error instanceof Error && 
        !error.message.includes("Invalid") && 
        !error.message.includes("already used") &&
        !error.message.includes("cancelled") &&
        !error.message.includes("expired")) {
      logTeamEvent("team.invitation.accept.failure", {
        outcome: "error",
        userId,
        errorCode: "INVITATION_ACCEPT_ERROR",
        errorMessage: error.message,
      });
    }
    throw error;
  }
}

/**
 * Resends an invitation
 * Implements Requirements 2A.2, 14.2
 */
export async function resendInvitation(invitationId: string, actorId: string): Promise<{ invitation: Invitation; token: string }> {
  try {
    // Get existing invitation
    const invitation = await db.query.teamInvitations.findFirst({
      where: eq(teamInvitations.id, invitationId),
    });

    if (!invitation) {
      logTeamEvent("team.invitation.resend.failure", {
        outcome: "failure",
        userId: actorId,
        errorCode: "INVITATION_NOT_FOUND",
        errorMessage: "Invitation not found",
        metadata: { invitationId },
      });
      throw new Error("Invitation not found");
    }

    if (invitation.usedAt || invitation.cancelledAt) {
      logTeamEvent("team.invitation.resend.failure", {
        outcome: "failure",
        userId: actorId,
        teamId: invitation.teamId,
        errorCode: "INVITATION_INACTIVE",
        errorMessage: "Invitation is no longer active",
        metadata: { invitationId, usedAt: invitation.usedAt, cancelledAt: invitation.cancelledAt },
      });
      throw new Error("Invitation is no longer active");
    }

    // Requirement 2A.2: Invalidate old token and create new one
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [updatedInvitation] = await db
      .update(teamInvitations)
      .set({
        tokenHash,
        expiresAt,
        createdAt: new Date(),
      })
      .where(eq(teamInvitations.id, invitationId))
      .returning();

    // Send email again
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, invitation.teamId),
    });
    
    const inviter = await db.query.users.findFirst({
      where: eq(users.id, actorId),
    });

    if (team && inviter) {
      const invitationUrl = `${env.NEXT_PUBLIC_APP_URL}/join-team?token=${token}`;
      
      await enqueueEmail({
        userId: actorId,
        type: "team_invitation",
        to: invitation.email,
        template: {
          type: "team_invitation",
          data: {
            inviterName: inviter.name,
            teamName: team.name,
            invitationUrl,
            expiresIn: "7 days",
          },
        },
      });

      // Fire-and-forget notification for invited user (if they exist in the system)
      try {
        // Check if invited user exists
        const invitedUserResult = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, invitation.email.toLowerCase().trim()))
          .limit(1);

        if (invitedUserResult[0]) {
          await createNotification({
            recipientId: invitedUserResult[0].id,
            actorId: actorId,
            type: "team_invitation",
            entityType: "team",
            entityId: invitation.teamId,
            metadata: {
              target_url: buildTargetUrl("team_invitation", {
                team_slug: team.slug,
              }),
              team_name: team.name,
              team_slug: team.slug,
              invitation_id: invitation.id,
            },
          });
        }
      } catch (notificationError) {
        // Fire-and-forget: Log error but don't block
        logger.error("team.invitation.resend.notification.failed", {
          userId: actorId,
          teamId: invitation.teamId,
          invitationId: invitation.id,
          error: notificationError instanceof Error ? notificationError.message : 'Unknown error',
        });
      }
    }
    
    // Log resend (Requirement 2A.2, 14.2)
    logTeamEvent("team.invitation.resend.success", {
      outcome: "success",
      userId: actorId,
      teamId: invitation.teamId,
      metadata: {
        invitationId: invitation.id,
      },
    });

    return { invitation: updatedInvitation as unknown as Invitation, token };
  } catch (error) {
    // Log failure if not already logged
    if (error instanceof Error && 
        !error.message.includes("not found") && 
        !error.message.includes("no longer active")) {
      logTeamEvent("team.invitation.resend.failure", {
        outcome: "error",
        userId: actorId,
        errorCode: "INVITATION_RESEND_ERROR",
        errorMessage: error.message,
        metadata: { invitationId },
      });
    }
    throw error;
  }
}

/**
 * Cancels an invitation
 * Implements Requirements 2A.3, 14.2
 */
export async function cancelInvitation(invitationId: string, actorId: string): Promise<void> {
  try {
    const invitation = await db.query.teamInvitations.findFirst({
      where: eq(teamInvitations.id, invitationId),
    });

    if (!invitation) {
      logTeamEvent("team.invitation.cancel.failure", {
        outcome: "failure",
        userId: actorId,
        errorCode: "INVITATION_NOT_FOUND",
        errorMessage: "Invitation not found",
        metadata: { invitationId },
      });
      throw new Error("Invitation not found");
    }

    await db
      .update(teamInvitations)
      .set({ cancelledAt: new Date() })
      .where(eq(teamInvitations.id, invitationId));

    // Log cancellation (Requirement 2A.3, 14.2)
    logTeamEvent("team.invitation.cancel.success", {
      outcome: "success",
      userId: actorId,
      teamId: invitation.teamId,
      metadata: {
        invitationId: invitation.id,
      },
    });
  } catch (error) {
    // Log failure if not already logged
    if (error instanceof Error && !error.message.includes("not found")) {
      logTeamEvent("team.invitation.cancel.failure", {
        outcome: "error",
        userId: actorId,
        errorCode: "INVITATION_CANCEL_ERROR",
        errorMessage: error.message,
        metadata: { invitationId },
      });
    }
    throw error;
  }
}

/**
 * Accepts an invitation by ID (for authenticated users from notifications)
 * Verifies the user's email matches the invitation email
 */
export async function acceptInvitationById(
  invitationId: string,
  userId: string,
  userEmail: string
): Promise<{ teamId: string; teamSlug?: string }> {
  try {
    // Find invitation by ID
    const invitation = await db.query.teamInvitations.findFirst({
      where: eq(teamInvitations.id, invitationId),
    });

    if (!invitation) {
      logTeamEvent("team.invitation.accept.failure", {
        outcome: "failure",
        userId,
        errorCode: "INVITATION_NOT_FOUND",
        errorMessage: "Invitation not found",
        metadata: { invitationId },
      });
      throw new Error("Invitation not found");
    }

    // Verify user's email matches invitation email
    if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      logTeamEvent("team.invitation.accept.failure", {
        outcome: "failure",
        userId,
        teamId: invitation.teamId,
        errorCode: "EMAIL_MISMATCH",
        errorMessage: "This invitation was sent to a different email address",
        metadata: { invitationId },
      });
      throw new Error("This invitation was sent to a different email address");
    }

    if (invitation.usedAt) {
      logTeamEvent("team.invitation.accept.failure", {
        outcome: "failure",
        userId,
        teamId: invitation.teamId,
        errorCode: "INVITATION_USED",
        errorMessage: "Invitation already used",
        metadata: { invitationId },
      });
      throw new Error("Invitation already used");
    }

    if (invitation.cancelledAt) {
      logTeamEvent("team.invitation.accept.failure", {
        outcome: "failure",
        userId,
        teamId: invitation.teamId,
        errorCode: "INVITATION_CANCELLED",
        errorMessage: "Invitation cancelled",
        metadata: { invitationId },
      });
      throw new Error("Invitation cancelled");
    }

    if (new Date() > invitation.expiresAt) {
      logTeamEvent("team.invitation.accept.failure", {
        outcome: "failure",
        userId,
        teamId: invitation.teamId,
        errorCode: "INVITATION_EXPIRED",
        errorMessage: "Invitation expired",
        metadata: { invitationId, expiresAt: invitation.expiresAt },
      });
      throw new Error("Invitation expired");
    }

    // Add user to team
    await addMember({
      teamId: invitation.teamId,
      userId,
      managementRole: invitation.managementRole,
      operationalRole: invitation.operationalRole,
      invitedBy: invitation.invitedBy,
    });

    // Mark as used
    await db
      .update(teamInvitations)
      .set({ usedAt: new Date() })
      .where(eq(teamInvitations.id, invitation.id));

    logTeamEvent("team.invitation.accept.success", {
      outcome: "success",
      userId,
      teamId: invitation.teamId,
      metadata: {
        invitationId: invitation.id,
      },
    });

    // Audit log invitation acceptance
    logAdminAction('member.invitation.accepted', {
      userId: userId,
      userEmail: userEmail,
      resourceType: 'team',
      resourceId: invitation.teamId,
      metadata: {
        invitationId: invitation.id,
        managementRole: invitation.managementRole,
        operationalRole: invitation.operationalRole,
      },
    });

    // Get team slug for redirect
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, invitation.teamId),
    });

    return { teamId: invitation.teamId, teamSlug: team?.slug };
  } catch (error) {
    if (
      error instanceof Error &&
      !error.message.includes("not found") &&
      !error.message.includes("already used") &&
      !error.message.includes("cancelled") &&
      !error.message.includes("expired") &&
      !error.message.includes("different email")
    ) {
      logTeamEvent("team.invitation.accept.failure", {
        outcome: "error",
        userId,
        errorCode: "INVITATION_ACCEPT_ERROR",
        errorMessage: error.message,
        metadata: { invitationId },
      });
    }
    throw error;
  }
}

/**
 * Declines an invitation by ID (for authenticated users from notifications)
 * Verifies the user's email matches the invitation email
 */
export async function declineInvitationById(
  invitationId: string,
  userId: string,
  userEmail: string
): Promise<void> {
  try {
    // Find invitation by ID
    const invitation = await db.query.teamInvitations.findFirst({
      where: eq(teamInvitations.id, invitationId),
    });

    if (!invitation) {
      logger.warn("team.invitation.decline.failure", {
        userId,
        errorCode: "INVITATION_NOT_FOUND",
        invitationId,
      });
      throw new Error("Invitation not found");
    }

    if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      logger.warn("team.invitation.decline.failure", {
        userId,
        teamId: invitation.teamId,
        errorCode: "EMAIL_MISMATCH",
        invitationId,
      });
      throw new Error("This invitation was sent to a different email address");
    }

    if (invitation.usedAt || invitation.cancelledAt) {
      logger.warn("team.invitation.decline.failure", {
        userId,
        teamId: invitation.teamId,
        errorCode: "INVITATION_INACTIVE",
        invitationId,
      });
      throw new Error("Invitation is no longer active");
    }

    // Mark as cancelled (declined by invitee)
    await db
      .update(teamInvitations)
      .set({ cancelledAt: new Date() })
      .where(eq(teamInvitations.id, invitation.id));

    logTeamEvent("team.invitation.cancel.success", {
      outcome: "success",
      userId,
      teamId: invitation.teamId,
      metadata: {
        invitationId: invitation.id,
        declinedByInvitee: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      !error.message.includes("not found") &&
      !error.message.includes("no longer active") &&
      !error.message.includes("different email")
    ) {
      logger.error("team.invitation.decline.failure", {
        userId,
        invitationId,
        error: error.message,
      });
    }
    throw error;
  }
}
