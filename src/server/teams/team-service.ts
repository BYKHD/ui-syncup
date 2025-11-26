import { db } from "@/lib/db";
import { teams } from "@/server/db/schema/teams";
import { teamMembers } from "@/server/db/schema/team-members";
import { users } from "@/server/db/schema/users";
import { eq, and, isNull, inArray, sql, desc } from "drizzle-orm";
import { generateUniqueSlug } from "./slug";
import { calculateBillableSeats } from "./billable-seats";
import { logger } from "@/lib/logger";
import { randomUUID } from "crypto";
import { validateTeamName } from "./validation";
import type { CreateTeamInput, UpdateTeamInput, Team, TeamWithMemberInfo } from "./types";

/**
 * Creates a new team with the creator as TEAM_OWNER + TEAM_EDITOR
 * Implements Requirements 1.1, 1.2, 1.4, 13.1
 */
export async function createTeam(input: CreateTeamInput): Promise<Team> {
  const { name, description, image, creatorId } = input;

  // Validate team name
  const validation = validateTeamName(name);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid team name");
  }

  // Generate unique slug
  const slug = await generateUniqueSlug(name);

  // Create team
  const [team] = await db
    .insert(teams)
    .values({
      name,
      slug,
      description: description ?? null,
      image: image ?? null,
      planId: "free",
      billableSeats: 1, // Creator is TEAM_EDITOR (billable)
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  // Assign creator as TEAM_OWNER + TEAM_EDITOR
  await db.insert(teamMembers).values({
    teamId: team.id,
    userId: creatorId,
    managementRole: "TEAM_OWNER",
    operationalRole: "TEAM_EDITOR",
    joinedAt: new Date(),
    invitedBy: null, // Creator is not invited
  });

  // Update user's lastActiveTeamId
  await db
    .update(users)
    .set({ lastActiveTeamId: team.id })
    .where(eq(users.id, creatorId));

  // Log team creation
  logTeamEvent("team.create.success", {
    outcome: "success",
    userId: creatorId,
    teamId: team.id,
    teamName: team.name,
    metadata: {
      slug: team.slug,
      planId: team.planId,
    },
  });

  return team;
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
 * Implements Requirements 4.1, 4.2, 4.3
 */
export async function updateTeam(
  teamId: string,
  input: UpdateTeamInput,
  userId: string
): Promise<Team> {
  const { name, description, image } = input;

  // Get current team for logging
  const currentTeam = await db.query.teams.findFirst({
    where: and(eq(teams.id, teamId), isNull(teams.deletedAt)),
  });

  if (!currentTeam) {
    throw new Error("Team not found");
  }

  const updates: Partial<Team> = {
    updatedAt: new Date(),
  };

  // If name changed, validate and regenerate slug
  if (name && name !== currentTeam.name) {
    const validation = validateTeamName(name);
    if (!validation.valid) {
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

  // Log team update
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
}

/**
 * Soft deletes a team with 30-day retention
 * Implements Requirements 5.2, 5.3
 */
export async function softDeleteTeam(
  teamId: string,
  userId: string
): Promise<void> {
  const team = await db.query.teams.findFirst({
    where: and(eq(teams.id, teamId), isNull(teams.deletedAt)),
  });

  if (!team) {
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

  // Log team deletion
  logTeamEvent("team.delete.success", {
    outcome: "success",
    userId,
    teamId,
    teamName: team.name,
    metadata: {
      retentionDays: 30,
    },
  });
}

/**
 * Team event types for structured logging
 */
export type TeamEventType =
  | "team.create.success"
  | "team.create.failure"
  | "team.update.success"
  | "team.update.failure"
  | "team.delete.success"
  | "team.delete.failure"
  | "team.member.add.success"
  | "team.member.remove.success"
  | "team.member.role_change.success"
  | "team.switch.success"
  | "team.context.invalid"
  | "team.invitation.create.success"
  | "team.invitation.accept.success"
  | "team.invitation.resend.success"
  | "team.invitation.cancel.success";

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
