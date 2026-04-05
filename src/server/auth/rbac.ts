// src/server/auth/rbac.ts

/**
 * Role-Based Access Control (RBAC) Utilities
 *
 * This module provides server-side utilities for managing roles and permissions.
 * All role assignments and permission checks go through team_members and
 * project_members as the single source of truth.
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { teamMembers } from "@/server/db/schema/team-members";
import { projectMembers } from "@/server/db/schema/project-members";
import {
  ALL_ROLES,
  isManagementRole,
  isOperationalRole,
  type Permission,
  PROJECT_ROLES,
  type ProjectRole,
  type Role,
  ROLE_PERMISSIONS,
  TEAM_MANAGEMENT_ROLES,
  type TeamManagementRole,
  TEAM_OPERATIONAL_ROLE_HIERARCHY,
  TEAM_OPERATIONAL_ROLES,
  type TeamOperationalRole,
  TEAM_ROLES,
  type TeamRole,
} from "@/config/roles";
import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface UserRole {
  id: string;
  userId: string;
  role: Role;
  resourceType: "team" | "project";
  resourceId: string;
  createdAt: Date;
}

export interface RoleAssignment {
  userId: string;
  role: Role;
  resourceType: "team" | "project";
  resourceId: string;
}

export interface PermissionCheck {
  userId: string;
  permission: Permission;
  resourceId: string;
  resourceType?: "team" | "project";
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Convert a team_members row + specific role to a UserRole shape.
 */
function teamMemberToUserRole(
  member: { id: string; teamId: string; joinedAt: Date },
  userId: string,
  role: Role
): UserRole {
  return {
    id: member.id,
    userId,
    role,
    resourceType: "team",
    resourceId: member.teamId,
    createdAt: member.joinedAt,
  };
}

/**
 * Convert a project_members row to a UserRole shape.
 */
function projectMemberToUserRole(
  member: { id: string; projectId: string; role: string; joinedAt: Date },
  userId: string
): UserRole {
  return {
    id: member.id,
    userId,
    role: member.role as Role,
    resourceType: "project",
    resourceId: member.projectId,
    createdAt: member.joinedAt,
  };
}

// ============================================================================
// ROLE ASSIGNMENT
// ============================================================================

/**
 * Assign a role to a user for a specific resource.
 *
 * Writes to team_members (for team roles) or project_members (for project roles).
 * For team management roles, updates the managementRole column; for operational
 * roles, updates the operationalRole column. Creates a membership record if one
 * does not yet exist.
 *
 * @param assignment - Role assignment details
 * @returns A UserRole representing the assigned role
 */
export async function assignRole(
  assignment: RoleAssignment
): Promise<UserRole> {
  const { userId, role, resourceType, resourceId } = assignment;

  // Validate role exists
  if (!Object.values(ALL_ROLES).includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }

  // Validate resource type matches role type
  if (resourceType === "team" && !Object.values(TEAM_ROLES).includes(role as TeamRole)) {
    throw new Error(`Role ${role} is not a team role`);
  }
  if (
    resourceType === "project" &&
    !Object.values(PROJECT_ROLES).includes(role as ProjectRole)
  ) {
    throw new Error(`Role ${role} is not a project role`);
  }

  if (resourceType === "team") {
    const mgmt = isManagementRole(role);

    const existing = await db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, resourceId), eq(teamMembers.userId, userId))
      )
      .limit(1);

    if (existing.length > 0) {
      const member = existing[0];
      const currentValue = mgmt ? member.managementRole : member.operationalRole;

      if (currentValue === role) {
        logger.info("rbac.assign_role.already_exists", {
          userId,
          role,
          resourceType,
          resourceId,
        });
        return teamMemberToUserRole(member, userId, role);
      }

      const [updated] = await db
        .update(teamMembers)
        .set(mgmt ? { managementRole: role } : { operationalRole: role })
        .where(
          and(
            eq(teamMembers.teamId, resourceId),
            eq(teamMembers.userId, userId)
          )
        )
        .returning();

      logger.info("rbac.assign_role.success", {
        userId,
        role,
        resourceType,
        resourceId,
      });
      return teamMemberToUserRole(updated, userId, role);
    }

    // No membership yet — create one.
    // Management roles require an operational role (NOT NULL); default to TEAM_VIEWER.
    const [inserted] = await db
      .insert(teamMembers)
      .values({
        teamId: resourceId,
        userId,
        managementRole: mgmt ? role : null,
        operationalRole: mgmt ? TEAM_ROLES.TEAM_VIEWER : role,
      })
      .returning();

    logger.info("rbac.assign_role.success", {
      userId,
      role,
      resourceType,
      resourceId,
      roleId: inserted.id,
    });
    return teamMemberToUserRole(inserted, userId, role);
  }

  // project resource
  const existing = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, resourceId),
        eq(projectMembers.userId, userId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    if (existing[0].role === role) {
      logger.info("rbac.assign_role.already_exists", {
        userId,
        role,
        resourceType,
        resourceId,
      });
      return projectMemberToUserRole(existing[0], userId);
    }

    const [updated] = await db
      .update(projectMembers)
      .set({ role })
      .where(
        and(
          eq(projectMembers.projectId, resourceId),
          eq(projectMembers.userId, userId)
        )
      )
      .returning();

    logger.info("rbac.assign_role.success", {
      userId,
      role,
      resourceType,
      resourceId,
    });
    return projectMemberToUserRole(updated, userId);
  }

  const [inserted] = await db
    .insert(projectMembers)
    .values({ projectId: resourceId, userId, role })
    .returning();

  logger.info("rbac.assign_role.success", {
    userId,
    role,
    resourceType,
    resourceId,
    roleId: inserted.id,
  });
  return projectMemberToUserRole(inserted, userId);
}

/**
 * Assign multiple roles to a user at once.
 *
 * @param assignments - Array of role assignments
 * @returns Array of UserRole records
 */
export async function assignRoles(
  assignments: RoleAssignment[]
): Promise<UserRole[]> {
  if (assignments.length === 0) {
    return [];
  }

  const results: UserRole[] = [];
  for (const assignment of assignments) {
    results.push(await assignRole(assignment));
  }

  logger.info("rbac.assign_roles.success", {
    count: assignments.length,
    userId: assignments[0].userId,
  });

  return results;
}

/**
 * Remove a role from a user.
 *
 * For team management roles: clears the managementRole column.
 * For team operational roles: removes the team membership entirely.
 * For project roles: removes the project membership.
 *
 * @returns True if the role was removed, false if it didn't exist.
 */
export async function removeRole(assignment: RoleAssignment): Promise<boolean> {
  const { userId, role, resourceType, resourceId } = assignment;

  if (resourceType === "team") {
    const mgmt = isManagementRole(role);

    const existing = await db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, resourceId), eq(teamMembers.userId, userId))
      )
      .limit(1);

    if (existing.length === 0) return false;

    if (mgmt) {
      if (existing[0].managementRole !== role) return false;
      await db
        .update(teamMembers)
        .set({ managementRole: null })
        .where(
          and(
            eq(teamMembers.teamId, resourceId),
            eq(teamMembers.userId, userId)
          )
        );
    } else {
      if (existing[0].operationalRole !== role) return false;
      await db
        .delete(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, resourceId),
            eq(teamMembers.userId, userId)
          )
        );
    }

    logger.info("rbac.remove_role.success", { userId, role, resourceType, resourceId });
    return true;
  }

  // project
  const result = await db
    .delete(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, resourceId),
        eq(projectMembers.userId, userId),
        eq(projectMembers.role, role)
      )
    )
    .returning();

  const removed = result.length > 0;
  if (removed) {
    logger.info("rbac.remove_role.success", { userId, role, resourceType, resourceId });
  }
  return removed;
}

/**
 * Update a user's role for a resource (replace old role with new role).
 *
 * IMPORTANT: When demoting a TEAM_EDITOR to TEAM_VIEWER/TEAM_MEMBER,
 * validates that no projects would be left ownerless.
 */
export async function updateRole(
  userId: string,
  oldRole: Role,
  newRole: Role,
  resourceType: "team" | "project",
  resourceId: string
): Promise<void> {
  if (
    resourceType === "team" &&
    oldRole === "TEAM_EDITOR" &&
    (newRole === "TEAM_VIEWER" || newRole === "TEAM_MEMBER")
  ) {
    await validateProjectOwnershipBeforeDemotion(userId, resourceId);
  }

  await db.transaction(async (tx) => {
    if (resourceType === "team") {
      const oldIsMgmt = isManagementRole(oldRole);
      const newIsMgmt = isManagementRole(newRole);

      const updates: Record<string, unknown> = {};
      if (newIsMgmt) {
        updates.managementRole = newRole;
        if (!oldIsMgmt) {
          // Operational → management: also reset operational to TEAM_VIEWER
          updates.operationalRole = TEAM_ROLES.TEAM_VIEWER;
        }
      } else {
        updates.operationalRole = newRole;
        if (oldIsMgmt) {
          // Management → operational: clear management column
          updates.managementRole = null;
        }
      }

      await tx
        .update(teamMembers)
        .set(updates)
        .where(
          and(eq(teamMembers.teamId, resourceId), eq(teamMembers.userId, userId))
        );
    } else {
      await tx
        .update(projectMembers)
        .set({ role: newRole })
        .where(
          and(
            eq(projectMembers.projectId, resourceId),
            eq(projectMembers.userId, userId)
          )
        );
    }
  });

  logger.info("rbac.update_role.success", {
    userId,
    oldRole,
    newRole,
    resourceType,
    resourceId,
  });
}

// ============================================================================
// ROLE QUERIES
// ============================================================================

/**
 * Get all roles for a user across all teams and projects.
 *
 * Each team membership may yield up to two entries (managementRole +
 * operationalRole). Each project membership yields one entry.
 */
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const result: UserRole[] = [];

  const teamMemberships = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId));

  for (const m of teamMemberships) {
    // Always include operational role
    result.push(teamMemberToUserRole(m, userId, m.operationalRole as Role));
    // Include management role if set
    if (m.managementRole) {
      result.push(teamMemberToUserRole(m, userId, m.managementRole as Role));
    }
  }

  const projectMemberships = await db
    .select()
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId));

  for (const m of projectMemberships) {
    result.push(projectMemberToUserRole(m, userId));
  }

  return result;
}

/**
 * Get all team roles for a user in a specific team.
 */
export async function getUserTeamRoles(
  userId: string,
  teamId: string
): Promise<UserRole[]> {
  const result: UserRole[] = [];

  const rows = await db
    .select()
    .from(teamMembers)
    .where(
      and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))
    );

  for (const m of rows) {
    result.push(teamMemberToUserRole(m, userId, m.operationalRole as Role));
    if (m.managementRole) {
      result.push(teamMemberToUserRole(m, userId, m.managementRole as Role));
    }
  }

  return result;
}

/**
 * Get all project roles for a user in a specific project.
 */
export async function getUserProjectRoles(
  userId: string,
  projectId: string
): Promise<UserRole[]> {
  const rows = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      )
    );

  return rows.map((m) => projectMemberToUserRole(m, userId));
}

/**
 * Get the highest team role for a user in a team.
 */
export async function getHighestTeamRole(
  userId: string,
  teamId: string
): Promise<TeamRole | null> {
  const rows = await db
    .select()
    .from(teamMembers)
    .where(
      and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))
    )
    .limit(1);

  if (rows.length === 0) return null;

  const member = rows[0];

  const hierarchy: Record<string, number> = {
    [TEAM_ROLES.TEAM_VIEWER]: 1,
    [TEAM_ROLES.TEAM_MEMBER]: 2,
    [TEAM_ROLES.TEAM_EDITOR]: 3,
    [TEAM_ROLES.TEAM_ADMIN]: 4,
    [TEAM_ROLES.TEAM_OWNER]: 5,
  };

  let highest = member.operationalRole as TeamRole;

  if (
    member.managementRole &&
    (hierarchy[member.managementRole] ?? 0) > (hierarchy[highest] ?? 0)
  ) {
    highest = member.managementRole as TeamRole;
  }

  return highest;
}

/**
 * Get the highest project role for a user in a project.
 */
export async function getHighestProjectRole(
  userId: string,
  projectId: string
): Promise<ProjectRole | null> {
  const rows = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      )
    )
    .limit(1);

  return rows.length > 0 ? (rows[0].role as ProjectRole) : null;
}

/**
 * Check if a user has a specific role.
 */
export async function hasRole(
  userId: string,
  role: Role,
  resourceType: "team" | "project",
  resourceId: string
): Promise<boolean> {
  if (resourceType === "team") {
    const rows = await db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, resourceId), eq(teamMembers.userId, userId))
      )
      .limit(1);

    if (rows.length === 0) return false;
    return rows[0].managementRole === role || rows[0].operationalRole === role;
  }

  const rows = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, resourceId),
        eq(projectMembers.userId, userId)
      )
    )
    .limit(1);

  return rows.length > 0 && rows[0].role === role;
}

// ============================================================================
// PERMISSION CHECKS
// ============================================================================

/**
 * Check if a user has a specific permission for a resource.
 */
export async function hasPermission(check: PermissionCheck): Promise<boolean> {
  const { userId, permission, resourceId, resourceType } = check;

  if (resourceType === "project") {
    const rows = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, resourceId),
          eq(projectMembers.userId, userId)
        )
      )
      .limit(1);

    if (rows.length === 0) return false;
    return ROLE_PERMISSIONS[rows[0].role as Role]?.includes(permission) ?? false;
  }

  if (resourceType === "team") {
    const rows = await db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, resourceId), eq(teamMembers.userId, userId))
      )
      .limit(1);

    if (rows.length === 0) return false;
    const member = rows[0];

    if (
      member.managementRole &&
      ROLE_PERMISSIONS[member.managementRole as Role]?.includes(permission)
    ) {
      return true;
    }
    return (
      ROLE_PERMISSIONS[member.operationalRole as Role]?.includes(permission) ??
      false
    );
  }

  return false;
}

/**
 * Check if a user has any of the specified permissions for a resource.
 */
export async function hasAnyPermission(
  userId: string,
  permissions: Permission[],
  resourceId: string,
  resourceType?: "team" | "project"
): Promise<boolean> {
  for (const permission of permissions) {
    if (await hasPermission({ userId, permission, resourceId, resourceType })) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a user has all of the specified permissions for a resource.
 */
export async function hasAllPermissions(
  userId: string,
  permissions: Permission[],
  resourceId: string,
  resourceType?: "team" | "project"
): Promise<boolean> {
  for (const permission of permissions) {
    if (!(await hasPermission({ userId, permission, resourceId, resourceType }))) {
      return false;
    }
  }
  return true;
}

/**
 * Get all permissions for a user in a resource.
 */
export async function getUserPermissions(
  userId: string,
  resourceId: string,
  resourceType?: "team" | "project"
): Promise<Permission[]> {
  const permissionsSet = new Set<Permission>();

  if (resourceType === "project") {
    const rows = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, resourceId),
          eq(projectMembers.userId, userId)
        )
      )
      .limit(1);

    if (rows.length > 0) {
      for (const p of ROLE_PERMISSIONS[rows[0].role as Role] ?? []) {
        permissionsSet.add(p);
      }
    }
    return Array.from(permissionsSet);
  }

  if (resourceType === "team") {
    const rows = await db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, resourceId), eq(teamMembers.userId, userId))
      )
      .limit(1);

    if (rows.length > 0) {
      const member = rows[0];
      if (member.managementRole) {
        for (const p of ROLE_PERMISSIONS[member.managementRole as Role] ?? []) {
          permissionsSet.add(p);
        }
      }
      for (const p of ROLE_PERMISSIONS[member.operationalRole as Role] ?? []) {
        permissionsSet.add(p);
      }
    }
    return Array.from(permissionsSet);
  }

  return [];
}

// ============================================================================
// TWO-TIER ROLE HELPERS
// ============================================================================

/**
 * Get a user's management role for a team.
 */
export async function getManagementRole(
  userId: string,
  teamId: string
): Promise<TeamManagementRole | null> {
  const rows = await db
    .select({ managementRole: teamMembers.managementRole })
    .from(teamMembers)
    .where(
      and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))
    )
    .limit(1);

  if (rows.length === 0 || !rows[0].managementRole) return null;

  const role = rows[0].managementRole;
  if (role === "TEAM_OWNER" || role === "TEAM_ADMIN") {
    return role as TeamManagementRole;
  }
  return null;
}

/**
 * Get a user's operational role for a team.
 */
export async function getOperationalRole(
  userId: string,
  teamId: string
): Promise<TeamOperationalRole | null> {
  const rows = await db
    .select({ operationalRole: teamMembers.operationalRole })
    .from(teamMembers)
    .where(
      and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))
    )
    .limit(1);

  if (rows.length === 0) return null;

  const role = rows[0].operationalRole;
  if (
    role === "TEAM_EDITOR" ||
    role === "TEAM_MEMBER" ||
    role === "TEAM_VIEWER"
  ) {
    return role as TeamOperationalRole;
  }
  return null;
}

/**
 * Ensure a user has at least the specified operational role.
 * Only upgrades; never downgrades. Creates a team membership if needed.
 */
export async function ensureOperationalRole(
  userId: string,
  teamId: string,
  role: TeamOperationalRole
): Promise<void> {
  const rows = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);

  if (rows.length === 0) {
    // User is not a team member yet — create a membership with this role.
    await db
      .insert(teamMembers)
      .values({ teamId, userId, operationalRole: role })
      .onConflictDoNothing();
    return;
  }

  const currentRole = rows[0].operationalRole as TeamOperationalRole;
  const currentLevel = TEAM_OPERATIONAL_ROLE_HIERARCHY[currentRole] ?? 0;
  const desiredLevel = TEAM_OPERATIONAL_ROLE_HIERARCHY[role];

  if (desiredLevel > currentLevel) {
    await db
      .update(teamMembers)
      .set({ operationalRole: role })
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))
      );
  }
}

/**
 * Auto-promote user to TEAM_EDITOR when they become a PROJECT_OWNER or PROJECT_EDITOR.
 */
export async function autoPromoteToEditor(
  userId: string,
  teamId: string
): Promise<void> {
  await ensureOperationalRole(userId, teamId, TEAM_OPERATIONAL_ROLES.TEAM_EDITOR);
}

/**
 * Safely demote a user from TEAM_EDITOR to TEAM_VIEWER/TEAM_MEMBER.
 * Transfers PROJECT_OWNER roles to new owners before demotion.
 */
export async function demoteWithOwnershipTransfer(
  userId: string,
  teamId: string,
  newOperationalRole: "TEAM_VIEWER" | "TEAM_MEMBER",
  projectOwnershipTransfers: Record<string, string>
): Promise<void> {
  const ownedProjectIds = await getOwnedProjects(userId);

  for (const projectId of ownedProjectIds) {
    if (!projectOwnershipTransfers[projectId]) {
      throw new Error(
        `Missing ownership transfer for project ${projectId}. ` +
          `All owned projects must have a new owner assigned.`
      );
    }
  }

  await db.transaction(async (tx) => {
    for (const [projectId, newOwnerId] of Object.entries(
      projectOwnershipTransfers
    )) {
      // Transfer ownership in project_members
      await tx
        .update(projectMembers)
        .set({ role: PROJECT_ROLES.PROJECT_OWNER })
        .where(
          and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, newOwnerId)
          )
        );

      // Demote old owner to editor within the project (or remove if not a member)
      await tx
        .update(projectMembers)
        .set({ role: PROJECT_ROLES.PROJECT_EDITOR })
        .where(
          and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, userId)
          )
        );

      logger.info("rbac.project_ownership_transferred", {
        projectId,
        fromUserId: userId,
        toUserId: newOwnerId,
      });
    }

    // Demote the user's operational role in team_members
    await tx
      .update(teamMembers)
      .set({ operationalRole: newOperationalRole })
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))
      );
  });

  // Auto-promote new owners to TEAM_EDITOR (outside transaction to avoid nested tx)
  for (const newOwnerId of Object.values(projectOwnershipTransfers)) {
    await autoPromoteToEditor(newOwnerId, teamId);
  }

  logger.info("rbac.demote_with_transfer.success", {
    userId,
    teamId,
    newRole: newOperationalRole,
    projectsTransferred: Object.keys(projectOwnershipTransfers).length,
  });
}

// ============================================================================
// OWNERSHIP HELPERS
// ============================================================================

/**
 * Get all projects where a user holds the PROJECT_OWNER role.
 */
export async function getOwnedProjects(userId: string): Promise<string[]> {
  const rows = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.userId, userId),
        eq(projectMembers.role, PROJECT_ROLES.PROJECT_OWNER)
      )
    );

  return rows.map((r) => r.projectId);
}

/**
 * Validate that a user can be demoted from TEAM_EDITOR.
 * Throws if user is PROJECT_OWNER on any projects in the team.
 */
async function validateProjectOwnershipBeforeDemotion(
  userId: string,
  teamId: string
): Promise<void> {
  const ownedProjectIds = await getOwnedProjects(userId);

  if (ownedProjectIds.length === 0) return;

  logger.warn("rbac.demotion_blocked.project_owner", {
    userId,
    teamId,
    projectCount: ownedProjectIds.length,
    projectIds: ownedProjectIds,
  });

  throw new Error(
    `DEMOTION_BLOCKED: User is PROJECT_OWNER on ${ownedProjectIds.length} project(s). ` +
      `Transfer ownership first. Project IDs: ${ownedProjectIds.join(", ")}`
  );
}

// ============================================================================
// AUTHORIZATION GUARDS
// ============================================================================

/**
 * Require a user to have a specific permission, or throw.
 */
export async function requirePermission(check: PermissionCheck): Promise<void> {
  const has = await hasPermission(check);

  if (!has) {
    logger.warn("rbac.permission_denied", {
      userId: check.userId,
      permission: check.permission,
      resourceId: check.resourceId,
      resourceType: check.resourceType,
    });

    throw new Error(
      `Permission denied: ${check.permission} on ${check.resourceType ?? "resource"} ${check.resourceId}`
    );
  }
}

/**
 * Require a user to have a specific role, or throw.
 */
export async function requireRole(
  userId: string,
  role: Role,
  resourceType: "team" | "project",
  resourceId: string
): Promise<void> {
  const has = await hasRole(userId, role, resourceType, resourceId);

  if (!has) {
    logger.warn("rbac.role_denied", { userId, role, resourceType, resourceId });

    throw new Error(
      `Role required: ${role} on ${resourceType} ${resourceId}`
    );
  }
}
