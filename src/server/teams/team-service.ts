import { db } from "@/lib/db";
import { teams } from "@/server/db/schema/teams";
import { teamMembers } from "@/server/db/schema/team-members";
import { users } from "@/server/db/schema/users";
import { eq, and, isNull, inArray, sql, desc } from "drizzle-orm";
import { generateUniqueSlug } from "./slug";
import { logger } from "@/lib/logger";
import { randomUUID } from "crypto";
import { validateTeamName } from "./validation";
import { enqueueEmail } from "@/server/email";
import type { CreateTeamInput, UpdateTeamInput, Team, TeamWithMemberInfo } from "./types";

/**
 * Creates a new team with the creator as TEAM_OWNER + TEAM_EDITOR
 * Implements Requirements 1.1, 1.2, 1.4, 13.1, 14.1
 */
export async function createTeam(input: CreateTeamInput): Promise<Team> {
  const { name, description, image, creatorId } = input;

  try {
    // Defensive check: Verify creator exists in users table
    // This catches session/user mismatches that can occur with OAuth flows
    const creatorUser = await db.query.users.findFirst({
      where: eq(users.id, creatorId),
    });

    if (!creatorUser) {
      logTeamEvent("team.create.failure", {
        outcome: "failure",
        userId: creatorId,
        errorCode: "USER_NOT_FOUND",
        errorMessage: `Creator user not found: ${creatorId}`,
        metadata: { name },
      });
      throw new Error(`Creator user not found: ${creatorId}`);
    }

    // Validate team name
    const validation = validateTeamName(name);
    if (!validation.valid) {
      logTeamEvent("team.create.failure", {
        outcome: "failure",
        userId: creatorId,
        errorCode: "INVALID_TEAM_NAME",
        errorMessage: validation.error || "Invalid team name",
        metadata: { name },
      });
      throw new Error(validation.error || "Invalid team name");
    }

    // Generate unique slug
    const slug = await generateUniqueSlug(name);

    // Create team with transaction
    // All 3 writes must succeed or fail together (Requirement 1.1, 14.1)
    const team = await db.transaction(async (tx) => {
      // 1. Create team
      const [createdTeam] = await tx
        .insert(teams)
        .values({
          name,
          slug,
          description: description ?? null,
          image: image ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // 2. Assign creator as TEAM_OWNER + TEAM_EDITOR
      await tx.insert(teamMembers).values({
        teamId: createdTeam.id,
        userId: creatorId,
        managementRole: "WORKSPACE_OWNER",
        operationalRole: "WORKSPACE_EDITOR",
        joinedAt: new Date(),
        invitedBy: null, // Creator is not invited
      });

      // 3. Update user's lastActiveTeamId
      await tx
        .update(users)
        .set({ lastActiveTeamId: createdTeam.id })
        .where(eq(users.id, creatorId));
      
      return createdTeam;
    });

    // Log team creation (Requirement 1.5, 14.1)
    logTeamEvent("team.create.success", {
      outcome: "success",
      userId: creatorId,
      teamId: team.id,
      teamName: team.name,
      metadata: {
        slug: team.slug,
      },
    });

    return team;
  } catch (error) {
    // Log failure if not already logged
    if (error instanceof Error && !error.message.includes("Invalid team name") && !error.message.includes("Creator user not found")) {
      logTeamEvent("team.create.failure", {
        outcome: "error",
        userId: creatorId,
        errorCode: "TEAM_CREATE_ERROR",
        errorMessage: error.message,
        metadata: { name },
      });
    }
    throw error;
  }
}

/**
 * Gets a team by ID with member information
 * Implements Requirements 1.1, 8.1
 */
export async function getTeam(
  teamId: string,
  userId: string
): Promise<TeamWithMemberInfo | null> {
  // Get team (exclude soft-deleted)
  const team = await db.query.teams.findFirst({
    where: and(eq(teams.id, teamId), isNull(teams.deletedAt)),
  });

  if (!team) {
    return null;
  }

  // Get member count
  const memberCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));

  const memberCount = parseInt(String(memberCountResult[0]?.count ?? '0'), 10);

  // Get user's roles
  const member = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId)
    ),
  });

  if (!member) {
    // User is not a member
    return null;
  }

  return {
    ...team,
    memberCount,
    myManagementRole: member.managementRole,
    myOperationalRole: member.operationalRole,
  };
}

/**
 * Gets all teams for a user with member information
 * Implements Requirements 9.1, 12.1
 */
export async function getTeams(userId: string): Promise<TeamWithMemberInfo[]> {
  // Get all team memberships for user
  const memberships = await db
    .select({
      team: teams,
      managementRole: teamMembers.managementRole,
      operationalRole: teamMembers.operationalRole,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(
      and(
        eq(teamMembers.userId, userId),
        isNull(teams.deletedAt) // Exclude soft-deleted teams
      )
    )
    .orderBy(desc(teamMembers.joinedAt));

  // Get member counts for all teams
  const teamIds = memberships.map((m) => m.team.id);
  
  if (teamIds.length === 0) {
    return [];
  }

  const memberCounts = await db
    .select({
      teamId: teamMembers.teamId,
      count: sql<number>`count(*)`,
    })
    .from(teamMembers)
    .where(inArray(teamMembers.teamId, teamIds))
    .groupBy(teamMembers.teamId);

  const memberCountMap = new Map<string, number>(
    memberCounts.map((mc: { teamId: string; count: number }) => [mc.teamId, parseInt(String(mc.count), 10)])
  );

  return memberships.map((m: { team: Team; managementRole: string | null; operationalRole: string }) => ({
    ...m.team,
    memberCount: memberCountMap.get(m.team.id) ?? 0,
    myManagementRole: m.managementRole,
    myOperationalRole: m.operationalRole,
  }));
}

/**
 * Updates team settings
 * Implements Requirements 4.1, 4.2, 4.3, 14.3
 */
export async function updateTeam(
  teamId: string,
  input: UpdateTeamInput,
  userId: string
): Promise<Team> {
  const { name, description, image } = input;

  try {
    // Get current team for logging
    const currentTeam = await db.query.teams.findFirst({
      where: and(eq(teams.id, teamId), isNull(teams.deletedAt)),
    });

    if (!currentTeam) {
      logTeamEvent("team.update.failure", {
        outcome: "failure",
        userId,
        teamId,
        errorCode: "TEAM_NOT_FOUND",
        errorMessage: "Team not found",
      });
      throw new Error("Team not found");
    }

    const updates: Partial<Team> = {
      updatedAt: new Date(),
    };

    // If name changed, validate and regenerate slug
    if (name && name !== currentTeam.name) {
      const validation = validateTeamName(name);
      if (!validation.valid) {
        logTeamEvent("team.update.failure", {
          outcome: "failure",
          userId,
          teamId,
          teamName: currentTeam.name,
          errorCode: "INVALID_TEAM_NAME",
          errorMessage: validation.error || "Invalid team name",
          metadata: { name },
        });
        throw new Error(validation.error || "Invalid team name");
      }
      updates.name = name;
      updates.slug = await generateUniqueSlug(name);
    }

    if (description !== undefined) {
      updates.description = description;
    }

    if (image !== undefined) {
      updates.image = image;
    }

    const [updatedTeam] = await db
      .update(teams)
      .set(updates)
      .where(eq(teams.id, teamId))
      .returning();

    // Log team update (Requirement 4.5, 14.3)
    logTeamEvent("team.update.success", {
      outcome: "success",
      userId,
      teamId,
      teamName: updatedTeam.name,
      metadata: {
        changes: Object.keys(updates),
        oldValues: {
          name: currentTeam.name,
          description: currentTeam.description,
          image: currentTeam.image,
        },
        newValues: {
          name: updatedTeam.name,
          description: updatedTeam.description,
          image: updatedTeam.image,
        },
      },
    });

    return updatedTeam;
  } catch (error) {
    // Log failure if not already logged
    if (error instanceof Error && !error.message.includes("not found") && !error.message.includes("Invalid")) {
      logTeamEvent("team.update.failure", {
        outcome: "error",
        userId,
        teamId,
        errorCode: "TEAM_UPDATE_ERROR",
        errorMessage: error.message,
      });
    }
    throw error;
  }
}

/**
 * Soft deletes a team with 30-day retention
 * Implements Requirements 5.2, 5.3, 14.1
 */
export async function softDeleteTeam(
  teamId: string,
  userId: string
): Promise<void> {
  try {
    const team = await db.query.teams.findFirst({
      where: and(eq(teams.id, teamId), isNull(teams.deletedAt)),
    });

    if (!team) {
      logTeamEvent("team.delete.failure", {
        outcome: "failure",
        userId,
        teamId,
        errorCode: "TEAM_NOT_FOUND",
        errorMessage: "Team not found",
      });
      throw new Error("Team not found");
    }

    // Soft delete team
    await db
      .update(teams)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(teams.id, teamId));

    // Log team deletion (Requirement 14.1)
    logTeamEvent("team.delete.success", {
      outcome: "success",
      userId,
      teamId,
      teamName: team.name,
      metadata: {
        retentionDays: 30,
      },
    });
  } catch (error) {
    // Log failure if not already logged
    if (error instanceof Error && !error.message.includes("not found")) {
      logTeamEvent("team.delete.failure", {
        outcome: "error",
        userId,
        teamId,
        errorCode: "TEAM_DELETE_ERROR",
        errorMessage: error.message,
      });
    }
    throw error;
  }
}

/**
 * Hard deletes a team (permanent removal)
 * Implements Requirements 5.2, 5.3, 14.1
 */
export async function hardDeleteTeam(
  teamId: string,
  userId: string
): Promise<void> {
  try {
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      logTeamEvent("team.delete.failure", {
        outcome: "failure",
        userId,
        teamId,
        errorCode: "TEAM_NOT_FOUND",
        errorMessage: "Team not found",
      });
      throw new Error("Team not found");
    }

    // Hard delete team
    await db.delete(teams).where(eq(teams.id, teamId));

    // Log team deletion (Requirement 14.1)
    logTeamEvent("team.delete.success", {
      outcome: "success",
      userId,
      teamId,
      teamName: team.name,
      metadata: {
        type: "hard_delete",
      },
    });
  } catch (error) {
    // Log failure if not already logged
    if (error instanceof Error && !error.message.includes("not found")) {
      logTeamEvent("team.delete.failure", {
        outcome: "error",
        userId,
        teamId,
        errorCode: "TEAM_DELETE_ERROR",
        errorMessage: error.message,
      });
    }
    throw error;
  }
}

/**
 * Transfers team ownership to another admin
 * Implements Requirements 14.1, 14.2, 14.3, 14.4
 */
export async function transferOwnership(
  teamId: string,
  currentOwnerId: string,
  newOwnerId: string
): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      // 1. Validate current owner
      const currentOwnerMember = await tx.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, currentOwnerId),
          eq(teamMembers.managementRole, "WORKSPACE_OWNER")
        ),
        with: {
          user: true,
          team: true,
        },
      });

      if (!currentOwnerMember) {
        throw new Error("Current user is not the team owner");
      }

      // 2. Validate new owner
      const newOwnerMember = await tx.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, newOwnerId)
        ),
        with: {
          user: true,
        },
      });

      if (!newOwnerMember) {
        throw new Error("Target user is not a member of this team");
      }

      if (newOwnerMember.managementRole !== "WORKSPACE_ADMIN") {
        throw new Error("Target user must be a Team Admin to receive ownership");
      }

      // 3. Update roles
      // Downgrade current owner to TEAM_ADMIN
      await tx
        .update(teamMembers)
        .set({
          managementRole: "WORKSPACE_ADMIN",
        })
        .where(
          and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, currentOwnerId)
          )
        );

      // Upgrade new owner to TEAM_OWNER
      await tx
        .update(teamMembers)
        .set({
          managementRole: "WORKSPACE_OWNER",
        })
        .where(
          and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, newOwnerId)
          )
        );

      // 4. Send emails
      const owner = currentOwnerMember as any;
      const newOwner = newOwnerMember as any;
      const teamUrl = `${process.env.NEXT_PUBLIC_APP_URL}/team/${owner.team.slug}/settings`;

      // Email to previous owner
      await enqueueEmail({
        userId: owner.userId,
        type: "ownership_transfer",
        to: owner.user.email,
        template: {
          type: "ownership_transfer",
          data: {
            teamName: owner.team.name,
            previousOwnerName: owner.user.name ?? "Unknown",
            newOwnerName: newOwner.user.name ?? "Unknown",
            isNewOwner: false,
            teamUrl,
          },
        },
      });

      // Email to new owner
      await enqueueEmail({
        userId: newOwner.userId,
        type: "ownership_transfer",
        to: newOwner.user.email,
        template: {
          type: "ownership_transfer",
          data: {
            teamName: owner.team.name,
            previousOwnerName: owner.user.name ?? "Unknown",
            newOwnerName: newOwner.user.name ?? "Unknown",
            isNewOwner: true,
            teamUrl,
          },
        },
      });

      // 5. Log event
      logTeamEvent("team.ownership.transfer.success", {
        outcome: "success",
        userId: currentOwnerId,
        teamId,
        teamName: owner.team.name,
        metadata: {
          previousOwnerId: currentOwnerId,
          newOwnerId: newOwnerId,
        },
      });
    });
  } catch (error) {
    logTeamEvent("team.ownership.transfer.failure", {
      outcome: "error",
      userId: currentOwnerId,
      teamId,
      errorCode: "OWNERSHIP_TRANSFER_ERROR",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      metadata: {
        newOwnerId,
      },
    });
    throw error;
  }
}

/**
 * Team event types for structured logging
 * Implements Requirements 14.1, 14.2, 14.3, 14.4
 */
export type TeamEventType =
  // Team lifecycle events
  | "team.create.success"
  | "team.create.failure"
  | "team.update.success"
  | "team.update.failure"
  | "team.delete.success"
  | "team.delete.failure"
  // Member management events
  | "team.member.add.success"
  | "team.member.add.failure"
  | "team.member.remove.success"
  | "team.member.remove.failure"
  | "team.member.role_change.success"
  | "team.member.role_change.failure"
  | "team.member.leave.success"
  | "team.member.leave.failure"
  // Invitation events
  | "team.invitation.create.success"
  | "team.invitation.create.failure"
  | "team.invitation.accept.success"
  | "team.invitation.accept.failure"
  | "team.invitation.resend.success"
  | "team.invitation.resend.failure"
  | "team.invitation.cancel.success"
  | "team.invitation.cancel.failure"
  | "team.invitation.expire"
  // Ownership events
  | "team.ownership.transfer.success"
  | "team.ownership.transfer.failure"
  // Context management events
  | "team.switch.success"
  | "team.switch.failure"
  | "team.context.invalid"
  | "team.context.cleared"
  | "team.context.auto_switch"
  | "team.access.denied"
  // Data export events
  | "team.export.requested"
  | "team.export.completed"
  | "team.export.failure"
  // Limit events
  | "team.limit.reached"
  | "team.rate_limit.exceeded";

export type TeamEventOutcome = "success" | "failure" | "error";

export interface TeamLogEvent {
  eventId: string;
  eventType: TeamEventType;
  timestamp: string;
  userId?: string;
  actorRole?: string;
  teamId?: string;
  teamName?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  outcome: TeamEventOutcome;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log team event with structured format
 */
export function logTeamEvent(
  eventType: TeamEventType,
  context: Omit<TeamLogEvent, "eventId" | "eventType" | "timestamp">
): void {
  const event: TeamLogEvent = {
    eventId: randomUUID(),
    eventType,
    timestamp: new Date().toISOString(),
    ...context,
  };

  const level =
    event.outcome === "error"
      ? "error"
      : event.outcome === "failure"
      ? "warn"
      : "info";

  if (level === "error") {
    logger.error(JSON.stringify(event));
  } else if (level === "warn") {
    logger.warn(JSON.stringify(event));
  } else {
    logger.info(JSON.stringify(event));
  }
}
