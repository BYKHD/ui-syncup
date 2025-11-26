import { db } from "@/lib/db";
import { teamInvitations } from "@/server/db/schema/team-invitations";
import { teamMembers } from "@/server/db/schema/team-members";
import { teams } from "@/server/db/schema/teams";
import { users } from "@/server/db/schema/users";
import { eq, and, gt, isNull, sql } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";
import { logTeamEvent } from "./team-service";
import { addMember } from "./member-service";
import { enqueueEmail } from "@/server/email";
import { env } from "@/lib/env";
import type { CreateInvitationInput, Invitation } from "./types";

/**
 * Creates a new invitation
 * Implements Requirements 2.1, 2.2, 2A.5
 */
export async function createInvitation(input: CreateInvitationInput): Promise<{ invitation: Invitation; token: string }> {
  const { teamId, email, managementRole, operationalRole, invitedBy } = input;

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

  // Log invitation creation
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

  return { invitation: invitation as unknown as Invitation, token };
}

/**
 * Accepts an invitation
 * Implements Requirements 2.3, 2.4, 2.5
 */
export async function acceptInvitation(token: string, userId: string): Promise<void> {
  // Hash token to lookup
  const tokenHash = createHash("sha256").update(token).digest("hex");

  // Find invitation
  const invitation = await db.query.teamInvitations.findFirst({
    where: eq(teamInvitations.tokenHash, tokenHash),
  });

  // Requirement 2.5: Reject invalid/expired/used invitations
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

  // Log acceptance
  logTeamEvent("team.invitation.accept.success", {
    outcome: "success",
    userId,
    teamId: invitation.teamId,
    metadata: {
      invitationId: invitation.id,
    },
  });
}

/**
 * Resends an invitation
 * Implements Requirements 2A.2
 */
export async function resendInvitation(invitationId: string, actorId: string): Promise<void> {
  // Get existing invitation
  const invitation = await db.query.teamInvitations.findFirst({
    where: eq(teamInvitations.id, invitationId),
  });

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (invitation.usedAt || invitation.cancelledAt) {
    throw new Error("Invitation is no longer active");
  }

  // Invalidate old token (by cancelling it, or we could just create a new one and leave old one?
  // Requirement 2A.2 says "invalidate the old token".
  // The cleanest way is to mark old as cancelled and create a new one.
  // Or update the existing record with new token and expiry?
  // Updating existing record is better to keep history clean if we don't care about history of tokens.
  // But for security, maybe new record?
  // Requirement 2A.2: "System SHALL invalidate the old token, create a new token with extended expiration"
  // Let's update the existing record to keep the ID stable, but change token hash and expiry.
  
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db
    .update(teamInvitations)
    .set({
      tokenHash,
      expiresAt,
      createdAt: new Date(), // Reset created at? Maybe not.
    })
    .where(eq(teamInvitations.id, invitationId));

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
  }
  
  // Log resend
  logTeamEvent("team.invitation.resend.success", {
    outcome: "success",
    userId: actorId,
    teamId: invitation.teamId,
    metadata: {
      invitationId: invitation.id,
    },
  });
}

/**
 * Cancels an invitation
 * Implements Requirements 2A.3
 */
export async function cancelInvitation(invitationId: string, actorId: string): Promise<void> {
  const invitation = await db.query.teamInvitations.findFirst({
    where: eq(teamInvitations.id, invitationId),
  });

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  await db
    .update(teamInvitations)
    .set({ cancelledAt: new Date() })
    .where(eq(teamInvitations.id, invitationId));

  // Log cancellation
  logTeamEvent("team.invitation.cancel.success", {
    outcome: "success",
    userId: actorId,
    teamId: invitation.teamId,
    metadata: {
      invitationId: invitation.id,
    },
  });
}
