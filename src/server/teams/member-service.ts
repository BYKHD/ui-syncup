import { db } from "@/lib/db";
import { teamMembers } from "@/server/db/schema/team-members";
import { projectMembers } from "@/server/db/schema/project-members";
import { users } from "@/server/db/schema/users";
import { projects } from "@/server/db/schema/projects";
import { eq, and, sql, desc } from "drizzle-orm";
import { logTeamEvent } from "./team-service";
import type { AddMemberInput, UpdateMemberRolesInput, TeamMember } from "./types";

/**
 * Adds a member to a team
 * Implements Requirements 3.1, 3.2, 14.2
 */
export async function addMember(input: AddMemberInput): Promise<TeamMember> {
  const { teamId, userId, managementRole, operationalRole, invitedBy } = input;

  try {
    // Requirement 3.1: Management roles require operational roles
    if (managementRole && !operationalRole) {
      logTeamEvent("team.member.add.failure", {
        outcome: "failure",
        userId: invitedBy,
        teamId,
        errorCode: "INVALID_ROLE_COMBINATION",
        errorMessage: "Management roles require an operational role",
        metadata: { managementRole, operationalRole },
      });
      throw new Error("Management roles require an operational role");
    }

    // Check if user is already a member
    const existingMember = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ),
    });

    if (existingMember) {
      logTeamEvent("team.member.add.failure", {
        outcome: "failure",
        userId: invitedBy,
        teamId,
        errorCode: "ALREADY_MEMBER",
        errorMessage: "User is already a member of this team",
        metadata: { targetUserId: userId },
      });
      throw new Error("User is already a member of this team");
    }

    // Add member
    const [member] = await db
      .insert(teamMembers)
      .values({
        teamId,
        userId,
        managementRole: managementRole ?? null,
        operationalRole,
        invitedBy: invitedBy ?? null,
        joinedAt: new Date(),
      })
      .returning();

    // Log member addition (Requirement 14.2)
    logTeamEvent("team.member.add.success", {
      outcome: "success",
      userId: invitedBy, // The actor is the one who invited/added
      teamId,
      metadata: {
        addedUserId: userId,
        managementRole,
        operationalRole,
      },
    });

    // Cast to TeamMember type (drizzle returns inferred type which matches but explicit is good)
    return member as unknown as TeamMember;
  } catch (error) {
    // Log failure if not already logged
    if (error instanceof Error && !error.message.includes("Management roles") && !error.message.includes("already a member")) {
      logTeamEvent("team.member.add.failure", {
        outcome: "error",
        userId: invitedBy,
        teamId,
        errorCode: "MEMBER_ADD_ERROR",
        errorMessage: error.message,
        metadata: { targetUserId: userId },
      });
    }
    throw error;
  }
}

/**
 * Updates a member's roles
 * Implements Requirements 3.1, 3.3, 3.5, 14.2
 */
export async function updateMemberRoles(
  teamId: string,
  userId: string,
  input: UpdateMemberRolesInput,
  actorId: string
): Promise<TeamMember> {
  const { managementRole, operationalRole } = input;

  try {
    // Get current member
    const currentMember = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ),
    });

    if (!currentMember) {
      logTeamEvent("team.member.role_change.failure", {
        outcome: "failure",
        userId: actorId,
        teamId,
        errorCode: "MEMBER_NOT_FOUND",
        errorMessage: "Member not found",
        metadata: { targetUserId: userId },
      });
      throw new Error("Member not found");
    }

    // Requirement 3.1: Management roles require operational roles
    const newManagementRole = managementRole !== undefined ? managementRole : currentMember.managementRole;
    const newOperationalRole = operationalRole !== undefined ? operationalRole : currentMember.operationalRole;

    if (newManagementRole && !newOperationalRole) {
      logTeamEvent("team.member.role_change.failure", {
        outcome: "failure",
        userId: actorId,
        teamId,
        errorCode: "INVALID_ROLE_COMBINATION",
        errorMessage: "Management roles require an operational role",
        metadata: {
          targetUserId: userId,
          newManagementRole,
          newOperationalRole,
        },
      });
      throw new Error("Management roles require an operational role");
    }

    // Requirement 3.3: Demotion blocked when projects owned
    if (
      currentMember.operationalRole === "TEAM_EDITOR" &&
      newOperationalRole !== "TEAM_EDITOR"
    ) {
      const ownedProjects = await db
        .select()
        .from(projectMembers)
        .where(and(
          eq(projectMembers.userId, userId),
          eq(projectMembers.role, "owner")
        ));
        
      if (ownedProjects.length > 0) {
        logTeamEvent("team.member.role_change.failure", {
          outcome: "failure",
          userId: actorId,
          teamId,
          errorCode: "MEMBER_OWNS_PROJECTS",
          errorMessage: "Cannot demote member who owns projects",
          metadata: {
            targetUserId: userId,
            projectCount: ownedProjects.length,
          },
        });
        throw new Error("Cannot demote member who owns projects. Please transfer ownership first.");
      }
    }

    // Update member
    await db
      .update(teamMembers)
      .set({
        managementRole: newManagementRole,
        operationalRole: newOperationalRole,
      })
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ));

    // Re-fetch with user join so the response includes member.user
    const [updatedMember] = await db
      .select({
        id: teamMembers.id,
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        managementRole: teamMembers.managementRole,
        operationalRole: teamMembers.operationalRole,
        joinedAt: teamMembers.joinedAt,
        invitedBy: teamMembers.invitedBy,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
        },
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ));

    // Log role change (Requirement 3.4, 14.2)
    logTeamEvent("team.member.role_change.success", {
      outcome: "success",
      userId: actorId,
      teamId,
      metadata: {
        targetUserId: userId,
        oldManagementRole: currentMember.managementRole,
        oldOperationalRole: currentMember.operationalRole,
        newManagementRole,
        newOperationalRole,
      },
    });

    return updatedMember as unknown as TeamMember;
  } catch (error) {
    // Log failure if not already logged
    if (error instanceof Error && 
        !error.message.includes("not found") && 
        !error.message.includes("Management roles") &&
        !error.message.includes("owns projects")) {
      logTeamEvent("team.member.role_change.failure", {
        outcome: "error",
        userId: actorId,
        teamId,
        errorCode: "ROLE_CHANGE_ERROR",
        errorMessage: error.message,
        metadata: { targetUserId: userId },
      });
    }
    throw error;
  }
}

/**
 * Removes a member from a team
 * Implements Requirements 3.4, 14.2
 */
export async function removeMember(
  teamId: string,
  userId: string,
  actorId: string
): Promise<void> {
  try {
    // Check if user owns projects (Requirement 3.4)
    const ownedProjects = await db
      .select()
      .from(projectMembers)
      .where(and(
        eq(projectMembers.userId, userId),
        eq(projectMembers.role, "owner")
      ));

    if (ownedProjects.length > 0) {
      logTeamEvent("team.member.remove.failure", {
        outcome: "failure",
        userId: actorId,
        teamId,
        errorCode: "MEMBER_OWNS_PROJECTS",
        errorMessage: "Cannot remove member who owns projects",
        metadata: {
          removedUserId: userId,
          projectCount: ownedProjects.length,
        },
      });
      throw new Error("Cannot remove member who owns projects. Please transfer ownership first.");
    }

    // Remove member
    await db
      .delete(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ));

    // Log removal (Requirement 3.4, 14.2)
    logTeamEvent("team.member.remove.success", {
      outcome: "success",
      userId: actorId,
      teamId,
      metadata: {
        removedUserId: userId,
      },
    });
  } catch (error) {
    // Log failure if not already logged
    if (error instanceof Error && !error.message.includes("owns projects")) {
      logTeamEvent("team.member.remove.failure", {
        outcome: "error",
        userId: actorId,
        teamId,
        errorCode: "MEMBER_REMOVE_ERROR",
        errorMessage: error.message,
        metadata: { removedUserId: userId },
      });
    }
    throw error;
  }
}

export interface OwnedProjectDetails {
  id: string;
  name: string;
  key: string;
}

export interface EligibleOwner {
  userId: string;
  name: string;
  email: string;
  image: string | null;
}

export interface OwnedProjectsWithDetailsResult {
  ownedProjects: OwnedProjectDetails[];
  eligibleOwners: EligibleOwner[];
}

/**
 * Returns projects owned by a user within a team, plus eligible replacement owners.
 * Used to drive the ownership transfer dialog before removing a member.
 */
export async function getOwnedProjectsWithDetails(
  userId: string,
  teamId: string
): Promise<OwnedProjectsWithDetailsResult> {
  // Get projects in this team where user is PROJECT_OWNER
  const owned = await db
    .select({ id: projects.id, name: projects.name, key: projects.key })
    .from(projectMembers)
    .innerJoin(projects, eq(projectMembers.projectId, projects.id))
    .where(and(
      eq(projectMembers.userId, userId),
      eq(projectMembers.role, 'owner'),
      eq(projects.teamId, teamId)
    ));

  // Eligible owners: TEAM_EDITOR members of this team, excluding the user being removed
  const eligibleRows = await db
    .select({
      userId: teamMembers.userId,
      name: users.name,
      email: users.email,
      image: users.image,
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.operationalRole, 'TEAM_EDITOR'),
      sql`${teamMembers.userId} != ${userId}`
    ));

  return {
    ownedProjects: owned,
    eligibleOwners: eligibleRows,
  };
}

export interface OwnershipTransfer {
  projectId: string;
  newOwnerId: string;
}

type DbTransaction = Parameters<Parameters<(typeof db)['transaction']>[0]>[0];

/**
 * Upserts the new owner's project membership to 'owner' and demotes the previous
 * owner to 'editor'. Using an upsert (instead of a plain UPDATE) ensures the
 * transfer succeeds even when the new owner has no existing project_members row —
 * a plain UPDATE silently matches 0 rows in that case, leaving the project ownerless.
 *
 * After writing, asserts that the new owner row exists with role='owner' so any
 * future regression fails loudly inside the transaction (rolled back automatically).
 */
async function transferProjectOwnership(
  tx: DbTransaction,
  projectId: string,
  fromUserId: string,
  toUserId: string
): Promise<void> {
  await tx
    .insert(projectMembers)
    .values({ projectId, userId: toUserId, role: 'owner' })
    .onConflictDoUpdate({
      target: [projectMembers.projectId, projectMembers.userId],
      set: { role: 'owner' },
    });

  await tx
    .update(projectMembers)
    .set({ role: 'editor' })
    .where(and(
      eq(projectMembers.projectId, projectId),
      eq(projectMembers.userId, fromUserId)
    ));

  const [ownerRow] = await tx
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(and(
      eq(projectMembers.projectId, projectId),
      eq(projectMembers.userId, toUserId)
    ));

  if (ownerRow?.role !== 'owner') {
    throw new Error(`TRANSFER_FAILED: project ${projectId} has no owner after transfer`);
  }
}

/**
 * Atomically transfers project ownerships and demotes a team member's operational role.
 * Auto-promotes each new project owner to TEAM_EDITOR if not already at that level.
 * Throws if any owned project within the team has no transfer target.
 */
export async function demoteWithOwnershipTransfer(
  teamId: string,
  userId: string,
  newOperationalRole: 'TEAM_MEMBER' | 'TEAM_VIEWER',
  transfers: OwnershipTransfer[],
  actorId: string
): Promise<TeamMember> {
  const owned = await db
    .select({ id: projects.id })
    .from(projectMembers)
    .innerJoin(projects, eq(projectMembers.projectId, projects.id))
    .where(and(
      eq(projectMembers.userId, userId),
      eq(projectMembers.role, 'owner'),
      eq(projects.teamId, teamId)
    ));

  const transferMap = new Map(transfers.map(t => [t.projectId, t.newOwnerId]));
  for (const { id } of owned) {
    if (!transferMap.has(id)) {
      throw new Error(`OWNERSHIP_TRANSFER_REQUIRED: project ${id} has no transfer target`);
    }
  }

  await db.transaction(async (tx) => {
    for (const { projectId, newOwnerId } of transfers) {
      await transferProjectOwnership(tx, projectId, userId, newOwnerId);
    }

    await tx
      .update(teamMembers)
      .set({ operationalRole: newOperationalRole })
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ));
  });

  // Auto-promote each new project owner to TEAM_EDITOR if they aren't already
  for (const { newOwnerId } of transfers) {
    const existing = await db.query.teamMembers.findFirst({
      where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, newOwnerId)),
    });
    if (existing && existing.operationalRole !== 'TEAM_EDITOR') {
      await db
        .update(teamMembers)
        .set({ operationalRole: 'TEAM_EDITOR' })
        .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, newOwnerId)));
    }
  }

  const [updatedMember] = await db
    .select({
      id: teamMembers.id,
      teamId: teamMembers.teamId,
      userId: teamMembers.userId,
      managementRole: teamMembers.managementRole,
      operationalRole: teamMembers.operationalRole,
      joinedAt: teamMembers.joinedAt,
      invitedBy: teamMembers.invitedBy,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
      },
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));

  logTeamEvent('team.member.role_change.success', {
    outcome: 'success',
    userId: actorId,
    teamId,
    metadata: {
      targetUserId: userId,
      newOperationalRole,
      ownershipTransfers: transfers.length,
    },
  });

  return updatedMember as unknown as TeamMember;
}

/**
 * Atomically transfers project ownerships and removes a team member.
 * Throws if any owned project within the team has no transfer target.
 */
export async function removeWithOwnershipTransfer(
  teamId: string,
  userId: string,
  transfers: OwnershipTransfer[],
  actorId: string
): Promise<void> {
  const owned = await db
    .select({ id: projects.id })
    .from(projectMembers)
    .innerJoin(projects, eq(projectMembers.projectId, projects.id))
    .where(and(
      eq(projectMembers.userId, userId),
      eq(projectMembers.role, 'owner'),
      eq(projects.teamId, teamId)
    ));

  const transferMap = new Map(transfers.map(t => [t.projectId, t.newOwnerId]));
  for (const { id } of owned) {
    if (!transferMap.has(id)) {
      throw new Error(`OWNERSHIP_TRANSFER_REQUIRED: project ${id} has no transfer target`);
    }
  }

  await db.transaction(async (tx) => {
    for (const { projectId, newOwnerId } of transfers) {
      await transferProjectOwnership(tx, projectId, userId, newOwnerId);
    }

    await tx
      .delete(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ));
  });

  logTeamEvent('team.member.remove.success', {
    outcome: 'success',
    userId: actorId,
    teamId,
    metadata: { removedUserId: userId, ownershipTransfers: transfers.length },
  });
}

/**
 * Gets members of a team with pagination
 * Implements Requirements 8.2, 12A.1
 */
export async function getMembersByTeam(
  teamId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ members: TeamMember[]; total: number }> {
  const offset = (page - 1) * pageSize;

  const members = await db
    .select({
      id: teamMembers.id,
      teamId: teamMembers.teamId,
      userId: teamMembers.userId,
      managementRole: teamMembers.managementRole,
      operationalRole: teamMembers.operationalRole,
      joinedAt: teamMembers.joinedAt,
      invitedBy: teamMembers.invitedBy,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
      }
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamId))
    .limit(pageSize)
    .offset(offset)
    .orderBy(desc(teamMembers.joinedAt));

  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));

  const total = totalResult[0]?.count ?? 0;

  return {
    members, // Now properly typed!
    total: typeof total === "string" ? parseInt(total, 10) : total,
  };
}
