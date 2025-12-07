/**
 * Project Member Service
 * 
 * Business logic for project membership operations including adding/removing members,
 * role management, and access control.
 */

import { db } from "@/lib/db";
import { projectMembers } from "@/server/db/schema/project-members";
import { projects } from "@/server/db/schema/projects";
import { users } from "@/server/db/schema/users";
import { userRoles } from "@/server/db/schema/user-roles";
import { eq, and, isNull, count } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { autoPromoteToEditor } from "@/server/auth/rbac";
import { PROJECT_ROLES } from "@/config/roles";
import type { ProjectRole } from "@/config/roles";
import type { ProjectMember } from "./types";

/**
 * List all members of a project with their user details
 * 
 * @param projectId - Project ID
 * @returns Array of project members with user information
 */
export async function listMembers(projectId: string): Promise<ProjectMember[]> {
  const members = await db
    .select({
      userId: projectMembers.userId,
      userName: users.name,
      userEmail: users.email,
      userAvatar: users.image,
      role: projectMembers.role,
      joinedAt: projectMembers.joinedAt,
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, projectId));

  return members.map((m) => ({
    userId: m.userId,
    userName: m.userName,
    userEmail: m.userEmail,
    userAvatar: m.userAvatar,
    role: m.role as ProjectRole,
    joinedAt: m.joinedAt,
  }));
}

/**
 * Add a member to a project with a specific role
 * Auto-promotes to TEAM_EDITOR if role is PROJECT_OWNER or PROJECT_EDITOR
 * 
 * @param projectId - Project ID
 * @param userId - User ID to add
 * @param role - Project role to assign
 * @param teamId - Team ID (for auto-promotion)
 * @returns Created project member
 * @throws Error if user is already a member
 */
export async function addMember(
  projectId: string,
  userId: string,
  role: ProjectRole,
  teamId: string
): Promise<ProjectMember> {
  // Check if user is already a member
  const existing = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, projectId),
      eq(projectMembers.userId, userId)
    ),
  });

  if (existing) {
    throw new Error("User is already a member of this project");
  }

  // Add member in transaction
  const result = await db.transaction(async (tx) => {
    // Insert project member
    const [member] = await tx
      .insert(projectMembers)
      .values({
        projectId,
        userId,
        role,
      })
      .returning();

    // Also add to user_roles for RBAC
    await tx.insert(userRoles).values({
      userId,
      role,
      resourceType: "project",
      resourceId: projectId,
    });

    return member;
  });

  // Auto-promote to TEAM_EDITOR if role is PROJECT_OWNER or PROJECT_EDITOR
  if (role === PROJECT_ROLES.PROJECT_OWNER || role === PROJECT_ROLES.PROJECT_EDITOR) {
    await autoPromoteToEditor(userId, teamId);
  }

  // Fetch user details
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  logger.info("project.member.added", {
    projectId,
    userId,
    role,
  });

  return {
    userId: result.userId,
    userName: user.name,
    userEmail: user.email,
    userAvatar: user.image,
    role: result.role as ProjectRole,
    joinedAt: result.joinedAt,
  };
}

/**
 * Update a member's role in a project
 * Auto-promotes to TEAM_EDITOR if new role is PROJECT_OWNER or PROJECT_EDITOR
 * Prevents changing the sole owner's role
 * 
 * @param projectId - Project ID
 * @param userId - User ID to update
 * @param newRole - New project role
 * @param teamId - Team ID (for auto-promotion)
 * @returns Updated project member
 * @throws Error if trying to change sole owner's role
 */
export async function updateMemberRole(
  projectId: string,
  userId: string,
  newRole: ProjectRole,
  teamId: string
): Promise<ProjectMember> {
  // Get current member
  const currentMember = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, projectId),
      eq(projectMembers.userId, userId)
    ),
  });

  if (!currentMember) {
    throw new Error("Member not found");
  }

  // Check if this is the sole owner
  if (currentMember.role === PROJECT_ROLES.PROJECT_OWNER) {
    const ownerCount = await db
      .select({ count: count() })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.role, PROJECT_ROLES.PROJECT_OWNER)
        )
      );

    if (ownerCount[0]?.count === 1 && newRole !== PROJECT_ROLES.PROJECT_OWNER) {
      throw new Error(
        "Cannot change the role of the sole project owner. Transfer ownership first."
      );
    }
  }

  // Update role in transaction
  const result = await db.transaction(async (tx) => {
    // Update project member role
    const [updated] = await tx
      .update(projectMembers)
      .set({ role: newRole })
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId)
        )
      )
      .returning();

    // Update user_roles for RBAC
    await tx
      .update(userRoles)
      .set({ role: newRole })
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.resourceType, "project"),
          eq(userRoles.resourceId, projectId)
        )
      );

    return updated;
  });

  // Auto-promote to TEAM_EDITOR if new role is PROJECT_OWNER or PROJECT_EDITOR
  if (newRole === PROJECT_ROLES.PROJECT_OWNER || newRole === PROJECT_ROLES.PROJECT_EDITOR) {
    await autoPromoteToEditor(userId, teamId);
  }

  // Fetch user details
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  logger.info("project.member.role_updated", {
    projectId,
    userId,
    oldRole: currentMember.role,
    newRole,
  });

  return {
    userId: result.userId,
    userName: user.name,
    userEmail: user.email,
    userAvatar: user.image,
    role: result.role as ProjectRole,
    joinedAt: result.joinedAt,
  };
}

/**
 * Remove a member from a project
 * Prevents removing the sole owner
 * 
 * @param projectId - Project ID
 * @param userId - User ID to remove
 * @throws Error if trying to remove sole owner
 */
export async function removeMember(
  projectId: string,
  userId: string
): Promise<void> {
  // Get current member
  const currentMember = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, projectId),
      eq(projectMembers.userId, userId)
    ),
  });

  if (!currentMember) {
    throw new Error("Member not found");
  }

  // Check if this is the sole owner
  if (currentMember.role === PROJECT_ROLES.PROJECT_OWNER) {
    const ownerCount = await db
      .select({ count: count() })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.role, PROJECT_ROLES.PROJECT_OWNER)
        )
      );

    if (ownerCount[0]?.count === 1) {
      throw new Error(
        "Cannot remove the sole project owner. Transfer ownership first."
      );
    }
  }

  // Remove member in transaction
  await db.transaction(async (tx) => {
    // Remove from project_members
    await tx
      .delete(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId)
        )
      );

    // Remove from user_roles
    await tx
      .delete(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.resourceType, "project"),
          eq(userRoles.resourceId, projectId)
        )
      );
  });

  logger.info("project.member.removed", {
    projectId,
    userId,
  });
}

/**
 * Join a public project as a viewer
 * 
 * @param projectId - Project ID
 * @param userId - User ID
 * @param teamId - Team ID (for validation)
 * @returns Created project member
 * @throws Error if project is private or user is already a member
 */
export async function joinProject(
  projectId: string,
  userId: string,
  teamId: string
): Promise<ProjectMember> {
  // Get project
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), isNull(projects.deletedAt)),
  });

  if (!project) {
    throw new Error("Project not found");
  }

  // Check if project is public
  if (project.visibility !== "public") {
    throw new Error("Cannot join a private project without invitation");
  }

  // Check if user is already a member
  const existing = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, projectId),
      eq(projectMembers.userId, userId)
    ),
  });

  if (existing) {
    throw new Error("User is already a member of this project");
  }

  // Add as viewer
  return addMember(projectId, userId, PROJECT_ROLES.PROJECT_VIEWER, teamId);
}

/**
 * Leave a project
 * Prevents the sole owner from leaving
 * 
 * @param projectId - Project ID
 * @param userId - User ID
 * @throws Error if user is the sole owner
 */
export async function leaveProject(
  projectId: string,
  userId: string
): Promise<void> {
  // Get current member
  const currentMember = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, projectId),
      eq(projectMembers.userId, userId)
    ),
  });

  if (!currentMember) {
    throw new Error("User is not a member of this project");
  }

  // Check if this is the sole owner
  if (currentMember.role === PROJECT_ROLES.PROJECT_OWNER) {
    const ownerCount = await db
      .select({ count: count() })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.role, PROJECT_ROLES.PROJECT_OWNER)
        )
      );

    if (ownerCount[0]?.count === 1) {
      throw new Error(
        "Cannot leave project as the sole owner. Transfer ownership first."
      );
    }
  }

  // Remove member
  await removeMember(projectId, userId);

  logger.info("project.member.left", {
    projectId,
    userId,
  });
}
