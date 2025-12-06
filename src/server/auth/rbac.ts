// src/server/auth/rbac.ts

/**
 * Role-Based Access Control (RBAC) Utilities
 * 
 * This module provides server-side utilities for managing roles and permissions.
 * All role assignments and permission checks should go through these functions.
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userRoles } from "@/server/db/schema/user-roles";
import {
  ALL_ROLES,
  BILLABLE_ROLES,
  type Permission,
  PROJECT_ROLES,
  type ProjectRole,
  type Role,
  ROLE_PERMISSIONS,
  TEAM_MANAGEMENT_ROLES,
  type TeamManagementRole,
  TEAM_OPERATIONAL_ROLES,
  TEAM_OPERATIONAL_ROLE_HIERARCHY,
  type TeamOperationalRole,
  TEAM_ROLES,
  type TeamRole,
} from "@/config/roles";
import { PLANS } from "@/config/tiers";
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
// ROLE ASSIGNMENT
// ============================================================================

/**
 * Assign a role to a user for a specific resource.
 * 
 * @param assignment - Role assignment details
 * @returns The created user role record
 * 
 * @example
 * ```ts
 * // Assign team owner role
 * await assignRole({
 *   userId: 'user_123',
 *   role: TEAM_ROLES.TEAM_OWNER,
 *   resourceType: 'team',
 *   resourceId: 'team_456',
 * });
 * 
 * // Assign project editor role
 * await assignRole({
 *   userId: 'user_123',
 *   role: PROJECT_ROLES.PROJECT_EDITOR,
 *   resourceType: 'project',
 *   resourceId: 'project_789',
 * });
 * ```
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
  if (resourceType === "project" && !Object.values(PROJECT_ROLES).includes(role as ProjectRole)) {
    throw new Error(`Role ${role} is not a project role`);
  }

  // Check if role already exists
  const existing = await db
    .select()
    .from(userRoles)
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.role, role),
        eq(userRoles.resourceType, resourceType),
        eq(userRoles.resourceId, resourceId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    logger.info("rbac.assign_role.already_exists", {
      userId,
      role,
      resourceType,
      resourceId,
    });
    return existing[0] as UserRole;
  }

  // Insert role
  const [userRole] = await db
    .insert(userRoles)
    .values({
      userId,
      role,
      resourceType,
      resourceId,
    })
    .returning();

  logger.info("rbac.assign_role.success", {
    userId,
    role,
    resourceType,
    resourceId,
    roleId: userRole.id,
  });

  // Update billable seats if this is a billable role
  if (BILLABLE_ROLES.includes(role) && resourceType === "team") {
    await updateBillableSeats(resourceId);
  }

  return userRole as UserRole;
}

/**
 * Assign multiple roles to a user at once (transactional).
 * 
 * @param assignments - Array of role assignments
 * @returns Array of created user role records
 */
export async function assignRoles(
  assignments: RoleAssignment[]
): Promise<UserRole[]> {
  if (assignments.length === 0) {
    return [];
  }

  // Validate all roles
  for (const assignment of assignments) {
    if (!Object.values(ALL_ROLES).includes(assignment.role)) {
      throw new Error(`Invalid role: ${assignment.role}`);
    }
  }

  // Insert all roles in a transaction
  const roles = await db.transaction(async (tx) => {
    const results: UserRole[] = [];

    for (const assignment of assignments) {
      const [userRole] = await tx
        .insert(userRoles)
        .values({
          userId: assignment.userId,
          role: assignment.role,
          resourceType: assignment.resourceType,
          resourceId: assignment.resourceId,
        })
        .returning();

      results.push(userRole as UserRole);
    }

    return results;
  });

  logger.info("rbac.assign_roles.success", {
    count: assignments.length,
    userId: assignments[0].userId,
  });

  // Update billable seats for all affected teams
  const teamIds = new Set(
    assignments
      .filter((a) => a.resourceType === "team" && BILLABLE_ROLES.includes(a.role))
      .map((a) => a.resourceId)
  );

  for (const teamId of teamIds) {
    await updateBillableSeats(teamId);
  }

  return roles;
}

/**
 * Remove a role from a user.
 * 
 * @param assignment - Role assignment to remove
 * @returns True if role was removed, false if it didn't exist
 */
export async function removeRole(assignment: RoleAssignment): Promise<boolean> {
  const { userId, role, resourceType, resourceId } = assignment;

  const result = await db
    .delete(userRoles)
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.role, role),
        eq(userRoles.resourceType, resourceType),
        eq(userRoles.resourceId, resourceId)
      )
    )
    .returning();

  const removed = result.length > 0;

  if (removed) {
    logger.info("rbac.remove_role.success", {
      userId,
      role,
      resourceType,
      resourceId,
    });

    // Update billable seats if this was a billable role
    if (BILLABLE_ROLES.includes(role) && resourceType === "team") {
      await updateBillableSeats(resourceId);
    }
  }

  return removed;
}

/**
 * Update a user's role for a resource (remove old role, assign new role).
 * 
 * IMPORTANT: When demoting a TEAM_EDITOR to TEAM_VIEWER/TEAM_MEMBER,
 * this function checks if the user is a PROJECT_OWNER on any projects.
 * If they are, the demotion is blocked to prevent orphaned projects.
 * 
 * @param userId - User ID
 * @param oldRole - Current role to remove
 * @param newRole - New role to assign
 * @param resourceType - Resource type
 * @param resourceId - Resource ID
 * @throws Error if user is PROJECT_OWNER and being demoted from TEAM_EDITOR
 */
export async function updateRole(
  userId: string,
  oldRole: Role,
  newRole: Role,
  resourceType: "team" | "project",
  resourceId: string
): Promise<void> {
  // Check for PROJECT_OWNER demotion edge case
  if (
    resourceType === "team" &&
    oldRole === "TEAM_EDITOR" &&
    (newRole === "TEAM_VIEWER" || newRole === "TEAM_MEMBER")
  ) {
    await validateProjectOwnershipBeforeDemotion(userId, resourceId);
  }

  await db.transaction(async (tx) => {
    // Remove old role
    await tx
      .delete(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.role, oldRole),
          eq(userRoles.resourceType, resourceType),
          eq(userRoles.resourceId, resourceId)
        )
      );

    // Assign new role
    await tx.insert(userRoles).values({
      userId,
      role: newRole,
      resourceType,
      resourceId,
    });
  });

  logger.info("rbac.update_role.success", {
    userId,
    oldRole,
    newRole,
    resourceType,
    resourceId,
  });

  // Update billable seats if either role is billable
  if (
    resourceType === "team" &&
    (BILLABLE_ROLES.includes(oldRole) || BILLABLE_ROLES.includes(newRole))
  ) {
    await updateBillableSeats(resourceId);
  }
}

// ============================================================================
// ROLE QUERIES
// ============================================================================

/**
 * Get all roles for a user.
 * 
 * @param userId - User ID
 * @returns Array of user roles
 */
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const roles = await db
    .select()
    .from(userRoles)
    .where(eq(userRoles.userId, userId));

  return roles as UserRole[];
}

/**
 * Get all roles for a user in a specific team.
 * 
 * @param userId - User ID
 * @param teamId - Team ID
 * @returns Array of team roles
 */
export async function getUserTeamRoles(
  userId: string,
  teamId: string
): Promise<UserRole[]> {
  const roles = await db
    .select()
    .from(userRoles)
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.resourceType, "team"),
        eq(userRoles.resourceId, teamId)
      )
    );

  return roles as UserRole[];
}

/**
 * Get all roles for a user in a specific project.
 * 
 * @param userId - User ID
 * @param projectId - Project ID
 * @returns Array of project roles
 */
export async function getUserProjectRoles(
  userId: string,
  projectId: string
): Promise<UserRole[]> {
  const roles = await db
    .select()
    .from(userRoles)
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.resourceType, "project"),
        eq(userRoles.resourceId, projectId)
      )
    );

  return roles as UserRole[];
}

/**
 * Get the highest team role for a user in a team.
 * 
 * @param userId - User ID
 * @param teamId - Team ID
 * @returns Highest team role or null if user has no team roles
 */
export async function getHighestTeamRole(
  userId: string,
  teamId: string
): Promise<TeamRole | null> {
  const roles = await getUserTeamRoles(userId, teamId);

  if (roles.length === 0) {
    return null;
  }

  // Find highest role by hierarchy
  const teamRoleHierarchy = {
    [TEAM_ROLES.TEAM_VIEWER]: 1,
    [TEAM_ROLES.TEAM_MEMBER]: 2,
    [TEAM_ROLES.TEAM_EDITOR]: 3,
    [TEAM_ROLES.TEAM_ADMIN]: 4,
    [TEAM_ROLES.TEAM_OWNER]: 5,
  };

  let highestRole = roles[0].role as TeamRole;
  let highestLevel = teamRoleHierarchy[highestRole];

  for (const role of roles) {
    const level = teamRoleHierarchy[role.role as TeamRole];
    if (level > highestLevel) {
      highestRole = role.role as TeamRole;
      highestLevel = level;
    }
  }

  return highestRole;
}

/**
 * Get the highest project role for a user in a project.
 * 
 * @param userId - User ID
 * @param projectId - Project ID
 * @returns Highest project role or null if user has no project roles
 */
export async function getHighestProjectRole(
  userId: string,
  projectId: string
): Promise<ProjectRole | null> {
  const roles = await getUserProjectRoles(userId, projectId);

  if (roles.length === 0) {
    return null;
  }

  // Find highest role by hierarchy
  const projectRoleHierarchy = {
    [PROJECT_ROLES.PROJECT_VIEWER]: 1,
    [PROJECT_ROLES.PROJECT_DEVELOPER]: 2,
    [PROJECT_ROLES.PROJECT_EDITOR]: 3,
    [PROJECT_ROLES.PROJECT_OWNER]: 4,
  };

  let highestRole = roles[0].role as ProjectRole;
  let highestLevel = projectRoleHierarchy[highestRole];

  for (const role of roles) {
    const level = projectRoleHierarchy[role.role as ProjectRole];
    if (level > highestLevel) {
      highestRole = role.role as ProjectRole;
      highestLevel = level;
    }
  }

  return highestRole;
}

/**
 * Check if a user has a specific role.
 * 
 * @param userId - User ID
 * @param role - Role to check
 * @param resourceType - Resource type
 * @param resourceId - Resource ID
 * @returns True if user has the role
 */
export async function hasRole(
  userId: string,
  role: Role,
  resourceType: "team" | "project",
  resourceId: string
): Promise<boolean> {
  const result = await db
    .select()
    .from(userRoles)
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.role, role),
        eq(userRoles.resourceType, resourceType),
        eq(userRoles.resourceId, resourceId)
      )
    )
    .limit(1);

  return result.length > 0;
}

// ============================================================================
// PERMISSION CHECKS
// ============================================================================

/**
 * Check if a user has a specific permission for a resource.
 * 
 * @param check - Permission check details
 * @returns True if user has the permission
 * 
 * @example
 * ```ts
 * // Check if user can create issues in a project
 * const canCreate = await hasPermission({
 *   userId: 'user_123',
 *   permission: PERMISSIONS.ISSUE_CREATE,
 *   resourceId: 'project_456',
 *   resourceType: 'project',
 * });
 * ```
 */
export async function hasPermission(check: PermissionCheck): Promise<boolean> {
  const { userId, permission, resourceId, resourceType } = check;

  // Get all user roles for the resource from user_roles table
  const roles = resourceType
    ? await db
        .select()
        .from(userRoles)
        .where(
          and(
            eq(userRoles.userId, userId),
            eq(userRoles.resourceType, resourceType),
            eq(userRoles.resourceId, resourceId)
          )
        )
    : await db
        .select()
        .from(userRoles)
        .where(
          and(
            eq(userRoles.userId, userId),
            eq(userRoles.resourceId, resourceId)
          )
        );

  // Check if any role has the permission
  for (const userRole of roles) {
    const rolePermissions = ROLE_PERMISSIONS[userRole.role as Role];
    if (rolePermissions?.includes(permission)) {
      return true;
    }
  }

  // For team resources, also check team_members table
  // This handles the case where roles are stored in team_members but not user_roles
  if (resourceType === "team" || !resourceType) {
    const { teamMembers } = await import("@/server/db/schema/team-members");
    
    const teamMemberRecord = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, userId),
          eq(teamMembers.teamId, resourceId)
        )
      )
      .limit(1);

    if (teamMemberRecord.length > 0) {
      const member = teamMemberRecord[0];
      
      // Check management role permissions
      if (member.managementRole) {
        const managementPermissions = ROLE_PERMISSIONS[member.managementRole as Role];
        if (managementPermissions?.includes(permission)) {
          return true;
        }
      }
      
      // Check operational role permissions
      if (member.operationalRole) {
        const operationalPermissions = ROLE_PERMISSIONS[member.operationalRole as Role];
        if (operationalPermissions?.includes(permission)) {
          return true;
        }
      }
    }
  }

  return false;
}


/**
 * Check if a user has any of the specified permissions for a resource.
 * 
 * @param userId - User ID
 * @param permissions - Array of permissions to check
 * @param resourceId - Resource ID
 * @param resourceType - Resource type (optional)
 * @returns True if user has at least one of the permissions
 */
export async function hasAnyPermission(
  userId: string,
  permissions: Permission[],
  resourceId: string,
  resourceType?: "team" | "project"
): Promise<boolean> {
  for (const permission of permissions) {
    const has = await hasPermission({
      userId,
      permission,
      resourceId,
      resourceType,
    });
    if (has) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a user has all of the specified permissions for a resource.
 * 
 * @param userId - User ID
 * @param permissions - Array of permissions to check
 * @param resourceId - Resource ID
 * @param resourceType - Resource type (optional)
 * @returns True if user has all of the permissions
 */
export async function hasAllPermissions(
  userId: string,
  permissions: Permission[],
  resourceId: string,
  resourceType?: "team" | "project"
): Promise<boolean> {
  for (const permission of permissions) {
    const has = await hasPermission({
      userId,
      permission,
      resourceId,
      resourceType,
    });
    if (!has) {
      return false;
    }
  }
  return true;
}

/**
 * Get all permissions for a user in a resource.
 * 
 * @param userId - User ID
 * @param resourceId - Resource ID
 * @param resourceType - Resource type (optional)
 * @returns Array of permissions
 */
export async function getUserPermissions(
  userId: string,
  resourceId: string,
  resourceType?: "team" | "project"
): Promise<Permission[]> {
  // Get all user roles for the resource
  const roles = resourceType
    ? await db
        .select()
        .from(userRoles)
        .where(
          and(
            eq(userRoles.userId, userId),
            eq(userRoles.resourceType, resourceType),
            eq(userRoles.resourceId, resourceId)
          )
        )
    : await db
        .select()
        .from(userRoles)
        .where(
          and(
            eq(userRoles.userId, userId),
            eq(userRoles.resourceId, resourceId)
          )
        );

  // Collect all permissions from all roles (deduplicated)
  const permissionsSet = new Set<Permission>();

  for (const userRole of roles) {
    const rolePermissions = ROLE_PERMISSIONS[userRole.role as Role];
    for (const permission of rolePermissions) {
      permissionsSet.add(permission);
    }
  }

  return Array.from(permissionsSet);
}

// ============================================================================
// BILLABLE SEATS
// ============================================================================

/**
 * Calculate billable seats for a team.
 * Only counts users with TEAM_EDITOR operational role.
 * Management roles (TEAM_OWNER, TEAM_ADMIN) are not billable by themselves.
 * 
 * @param teamId - Team ID
 * @returns Number of billable seats
 */
export async function calculateBillableSeats(teamId: string): Promise<number> {
  // Get all users with TEAM_EDITOR operational role
  const roles = await db
    .select()
    .from(userRoles)
    .where(
      and(
        eq(userRoles.resourceType, "team"),
        eq(userRoles.resourceId, teamId),
        eq(userRoles.role, "TEAM_EDITOR")
      )
    );

  // Count unique users (should be one role per user, but use Set for safety)
  const billableUsers = new Set<string>();

  for (const role of roles) {
    billableUsers.add(role.userId);
  }

  return billableUsers.size;
}

/**
 * Update billable seats count for a team.
 * This should be called whenever roles change.
 * 
 * @param teamId - Team ID
 * @returns Updated billable seats count
 */
export async function updateBillableSeats(teamId: string): Promise<number> {
  const count = await calculateBillableSeats(teamId);

  logger.info("rbac.update_billable_seats", {
    teamId,
    billableSeats: count,
  });

  // TODO: Update team record with billable seats count
  // This will be implemented when the teams table is created

  return count;
}

/**
 * Check if a team can add more billable seats based on their plan.
 * 
 * @param teamId - Team ID
 * @param planId - Plan ID
 * @returns True if team can add more billable seats
 */
export async function canAddBillableSeat(
  teamId: string,
  planId: "free" | "pro"
): Promise<boolean> {
  const plan = PLANS[planId];
  const currentSeats = await calculateBillableSeats(teamId);

  // Pro plan has unlimited seats
  if (plan.limits.members === "unlimited") {
    return true;
  }

  // Free plan has a limit
  return currentSeats < plan.limits.members;
}

// ============================================================================
// TWO-TIER ROLE HELPERS
// ============================================================================

/**
 * Get a user's management role for a team.
 * 
 * @param userId - User ID
 * @param teamId - Team ID
 * @returns Management role or null if user has no management role
 */
export async function getManagementRole(
  userId: string,
  teamId: string
): Promise<TeamManagementRole | null> {
  const roles = await db
    .select()
    .from(userRoles)
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.resourceType, "team"),
        eq(userRoles.resourceId, teamId)
      )
    );

  for (const role of roles) {
    if (role.role === "TEAM_OWNER" || role.role === "TEAM_ADMIN") {
      return role.role as TeamManagementRole;
    }
  }

  return null;
}

/**
 * Get a user's operational role for a team.
 * 
 * @param userId - User ID
 * @param teamId - Team ID
 * @returns Operational role or null if user has no operational role
 */
export async function getOperationalRole(
  userId: string,
  teamId: string
): Promise<TeamOperationalRole | null> {
  const roles = await db
    .select()
    .from(userRoles)
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.resourceType, "team"),
        eq(userRoles.resourceId, teamId)
      )
    );

  for (const role of roles) {
    if (
      role.role === "TEAM_EDITOR" ||
      role.role === "TEAM_MEMBER" ||
      role.role === "TEAM_VIEWER"
    ) {
      return role.role as TeamOperationalRole;
    }
  }

  return null;
}

/**
 * Ensure a user has a specific operational role.
 * If user doesn't have the role, assign it.
 * If user has a lower role, upgrade it.
 * 
 * IMPORTANT: This function only upgrades, never downgrades.
 * Use updateRole() directly for downgrades (which includes PROJECT_OWNER validation).
 * 
 * @param userId - User ID
 * @param teamId - Team ID
 * @param role - Desired operational role
 */
export async function ensureOperationalRole(
  userId: string,
  teamId: string,
  role: TeamOperationalRole
): Promise<void> {
  const currentRole = await getOperationalRole(userId, teamId);

  if (!currentRole) {
    // User has no operational role, assign it
    await assignRole({
      userId,
      role,
      resourceType: "team",
      resourceId: teamId,
    });
    return;
  }

  if (currentRole === role) {
    // User already has the desired role
    return;
  }

  // Check if we need to upgrade
  const currentLevel = TEAM_OPERATIONAL_ROLE_HIERARCHY[currentRole];
  const desiredLevel = TEAM_OPERATIONAL_ROLE_HIERARCHY[role];

  if (desiredLevel > currentLevel) {
    // Upgrade to higher role (safe, no PROJECT_OWNER check needed)
    await updateRole(userId, currentRole, role, "team", teamId);
  }

  // Don't downgrade automatically - must be done explicitly via updateRole()
}

/**
 * Validate that a user can be demoted from TEAM_EDITOR.
 * Checks if user is PROJECT_OWNER on any projects in the team.
 * 
 * @param userId - User ID
 * @param teamId - Team ID
 * @throws Error with project details if user is PROJECT_OWNER
 */
async function validateProjectOwnershipBeforeDemotion(
  userId: string,
  teamId: string
): Promise<void> {
  // Get all projects where user is PROJECT_OWNER
  const ownedProjects = await db
    .select()
    .from(userRoles)
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.role, "PROJECT_OWNER"),
        eq(userRoles.resourceType, "project")
      )
    );

  if (ownedProjects.length === 0) {
    // User is not a PROJECT_OWNER, demotion is safe
    return;
  }

  // TODO: Fetch project names from projects table when it's implemented
  // For now, just use project IDs
  const projectIds = ownedProjects.map((p) => p.resourceId);

  logger.warn("rbac.demotion_blocked.project_owner", {
    userId,
    teamId,
    projectCount: projectIds.length,
    projectIds,
  });

  throw new Error(
    `DEMOTION_BLOCKED: User is PROJECT_OWNER on ${projectIds.length} project(s). ` +
    `Transfer ownership first. Project IDs: ${projectIds.join(", ")}`
  );
}

/**
 * Get all projects where a user is PROJECT_OWNER.
 * Useful for UI to show which projects need ownership transfer.
 * 
 * @param userId - User ID
 * @returns Array of project IDs where user is owner
 */
export async function getOwnedProjects(userId: string): Promise<string[]> {
  const ownedProjects = await db
    .select()
    .from(userRoles)
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.role, "PROJECT_OWNER"),
        eq(userRoles.resourceType, "project")
      )
    );

  return ownedProjects.map((p) => p.resourceId);
}

/**
 * Auto-promote user to TEAM_EDITOR when they get PROJECT_OWNER or PROJECT_EDITOR role.
 * 
 * @param userId - User ID
 * @param teamId - Team ID
 */
export async function autoPromoteToEditor(
  userId: string,
  teamId: string
): Promise<void> {
  await ensureOperationalRole(userId, teamId, "TEAM_EDITOR");
}

/**
 * Safely demote a user from TEAM_EDITOR to TEAM_VIEWER/TEAM_MEMBER.
 * Transfers PROJECT_OWNER roles to a new owner before demotion.
 * 
 * @param userId - User ID to demote
 * @param teamId - Team ID
 * @param newOperationalRole - New operational role (TEAM_VIEWER or TEAM_MEMBER)
 * @param projectOwnershipTransfers - Map of projectId -> newOwnerId for ownership transfers
 * 
 * @example
 * ```ts
 * // Demote user and transfer their project ownerships
 * await demoteWithOwnershipTransfer(
 *   'user_123',
 *   'team_456',
 *   'TEAM_VIEWER',
 *   {
 *     'project_1': 'user_789', // Transfer project_1 to user_789
 *     'project_2': 'user_789', // Transfer project_2 to user_789
 *   }
 * );
 * ```
 */
export async function demoteWithOwnershipTransfer(
  userId: string,
  teamId: string,
  newOperationalRole: "TEAM_VIEWER" | "TEAM_MEMBER",
  projectOwnershipTransfers: Record<string, string>
): Promise<void> {
  // Get all projects where user is PROJECT_OWNER
  const ownedProjectIds = await getOwnedProjects(userId);

  // Validate that all owned projects have a transfer target
  for (const projectId of ownedProjectIds) {
    if (!projectOwnershipTransfers[projectId]) {
      throw new Error(
        `Missing ownership transfer for project ${projectId}. ` +
        `All owned projects must have a new owner assigned.`
      );
    }
  }

  // Perform transfers and demotion in a transaction
  await db.transaction(async (tx) => {
    // Transfer ownership for each project
    for (const [projectId, newOwnerId] of Object.entries(projectOwnershipTransfers)) {
      // Remove old owner's PROJECT_OWNER role
      await tx
        .delete(userRoles)
        .where(
          and(
            eq(userRoles.userId, userId),
            eq(userRoles.role, "PROJECT_OWNER"),
            eq(userRoles.resourceType, "project"),
            eq(userRoles.resourceId, projectId)
          )
        );

      // Assign PROJECT_OWNER to new owner
      await tx.insert(userRoles).values({
        userId: newOwnerId,
        role: "PROJECT_OWNER",
        resourceType: "project",
        resourceId: projectId,
      });

      // Auto-promote new owner to TEAM_EDITOR
      await autoPromoteToEditor(newOwnerId, teamId);

      logger.info("rbac.project_ownership_transferred", {
        projectId,
        fromUserId: userId,
        toUserId: newOwnerId,
      });
    }

    // Now safe to demote the user
    const currentRole = await getOperationalRole(userId, teamId);
    if (currentRole) {
      await tx
        .delete(userRoles)
        .where(
          and(
            eq(userRoles.userId, userId),
            eq(userRoles.role, currentRole),
            eq(userRoles.resourceType, "team"),
            eq(userRoles.resourceId, teamId)
          )
        );
    }

    // Assign new operational role
    await tx.insert(userRoles).values({
      userId,
      role: newOperationalRole,
      resourceType: "team",
      resourceId: teamId,
    });
  });

  logger.info("rbac.demote_with_transfer.success", {
    userId,
    teamId,
    newRole: newOperationalRole,
    projectsTransferred: Object.keys(projectOwnershipTransfers).length,
  });

  // Update billable seats
  await updateBillableSeats(teamId);
}

// ============================================================================
// AUTHORIZATION GUARDS
// ============================================================================

/**
 * Require a user to have a specific permission, or throw an error.
 * 
 * @param check - Permission check details
 * @throws Error if user doesn't have the permission
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
      `Permission denied: ${check.permission} on ${check.resourceType || "resource"} ${check.resourceId}`
    );
  }
}

/**
 * Require a user to have a specific role, or throw an error.
 * 
 * @param userId - User ID
 * @param role - Required role
 * @param resourceType - Resource type
 * @param resourceId - Resource ID
 * @throws Error if user doesn't have the role
 */
export async function requireRole(
  userId: string,
  role: Role,
  resourceType: "team" | "project",
  resourceId: string
): Promise<void> {
  const has = await hasRole(userId, role, resourceType, resourceId);

  if (!has) {
    logger.warn("rbac.role_denied", {
      userId,
      role,
      resourceType,
      resourceId,
    });

    throw new Error(
      `Role required: ${role} on ${resourceType} ${resourceId}`
    );
  }
}
