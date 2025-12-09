/**
 * Project Service
 * 
 * Core business logic for project operations including CRUD, access control,
 * and statistics aggregation.
 */

import { db } from "@/lib/db";
import { projects } from "@/server/db/schema/projects";
import { projectMembers } from "@/server/db/schema/project-members";
import { eq, and, isNull, or, like, sql, count } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { generateUniqueSlug, validateProjectKey, validateProjectName } from "./utils";
import { autoPromoteToEditor, getManagementRole } from "@/server/auth/rbac";
import { PROJECT_ROLES } from "@/config/roles";
import type {
  Project,
  ProjectWithStats,
  ProjectStats,
  ListProjectsParams,
  ProjectListResult,
  CreateProjectData,
  UpdateProjectData,
} from "./types";

/**
 * List projects with filters, pagination, and user-specific access control
 * 
 * Access rules:
 * - Public projects: visible to all team members
 * - Private projects: visible to members OR team owners/admins
 * 
 * @param params - List parameters including filters and pagination
 * @returns Paginated list of projects with stats
 */
export async function listProjects(
  params: ListProjectsParams
): Promise<ProjectListResult> {
  const {
    teamId,
    userId,
    status,
    visibility,
    search,
    page = 1,
    limit = 20,
  } = params;

  const offset = (page - 1) * limit;

  // Get user's management role to determine if they can see all private projects
  const managementRole = await getManagementRole(userId, teamId);
  const canSeeAllPrivate =
    managementRole === "TEAM_OWNER" || managementRole === "TEAM_ADMIN";

  // Build where conditions
  const conditions = [
    eq(projects.teamId, teamId),
    isNull(projects.deletedAt), // Only non-deleted projects
  ];

  if (status) {
    conditions.push(eq(projects.status, status));
  }

  if (visibility) {
    conditions.push(eq(projects.visibility, visibility));
  }

  if (search) {
    conditions.push(
      or(
        like(projects.name, `%${search}%`),
        like(projects.key, `%${search}%`),
        like(projects.description, `%${search}%`)
      )!
    );
  }

  // Get user's project memberships for access control
  const userMemberships = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId));

  const memberProjectIds = new Set(userMemberships.map((m) => m.projectId));

  // Fetch projects
  const allProjects = await db
    .select()
    .from(projects)
    .where(and(...conditions))
    .orderBy(projects.createdAt);

  // Filter by access control
  const accessibleProjects = allProjects.filter((project) => {
    // Public projects are visible to all team members
    if (project.visibility === "public") {
      return true;
    }

    // Private projects: must be member OR have management role
    return memberProjectIds.has(project.id) || canSeeAllPrivate;
  }) as Project[];

  // Apply pagination
  const total = accessibleProjects.length;
  const paginatedProjects = accessibleProjects.slice(offset, offset + limit);

  // Fetch stats for paginated projects
  const projectsWithStats = await Promise.all(
    paginatedProjects.map(async (project) => {
      const stats = await getProjectStats(project.id);
      const userRole = await getUserProjectRole(userId, project.id);
      const canJoin =
        project.visibility === "public" && userRole === null;

      return {
        ...project,
        stats,
        userRole,
        canJoin,
      } as ProjectWithStats;
    })
  );

  return {
    items: projectsWithStats,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Check if a string is a valid UUID
 */
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Get a single project by ID or slug with user context
 * 
 * @param idOrSlug - Project ID (UUID) or slug
 * @param userId - User ID for access control and role context
 * @returns Project with stats and user context
 * @throws Error if project not found or user doesn't have access
 */
export async function getProject(
  idOrSlug: string,
  userId: string
): Promise<ProjectWithStats> {
  // Detect if input is UUID or slug
  const isId = isUUID(idOrSlug);
  
  // Fetch project by ID or slug
  const project = await db.query.projects.findFirst({
    where: and(
      isId ? eq(projects.id, idOrSlug) : eq(projects.slug, idOrSlug),
      isNull(projects.deletedAt)
    ),
  });

  if (!project) {
    throw new Error("Project not found");
  }

  // Check access
  const hasAccess = await canViewProject(userId, project);

  if (!hasAccess) {
    throw new Error("Access denied");
  }

  // Get stats and user context
  const stats = await getProjectStats(project.id);
  const userRole = await getUserProjectRole(userId, project.id);
  const canJoin = project.visibility === "public" && userRole === null;

  return {
    ...project,
    stats,
    userRole,
    canJoin,
  } as ProjectWithStats;
}

/**
 * Create a new project and assign creator as owner
 * Uses transaction to ensure atomicity
 * 
 * @param data - Project creation data
 * @param userId - Creator user ID
 * @returns Created project
 * @throws Error if validation fails or key/slug already exists
 */
export async function createProject(
  data: CreateProjectData,
  userId: string
): Promise<Project> {
  const { teamId, name, key, description, icon, visibility, status } = data;

  // Validate inputs
  if (!validateProjectName(name)) {
    throw new Error("Invalid project name");
  }

  if (!validateProjectKey(key)) {
    throw new Error("Invalid project key (must be 2-10 uppercase letters)");
  }

  // Check for duplicate key
  const existingKey = await db.query.projects.findFirst({
    where: and(
      eq(projects.teamId, teamId),
      eq(projects.key, key),
      isNull(projects.deletedAt)
    ),
  });

  if (existingKey) {
    throw new Error("Project key already exists in this team");
  }

  // Generate unique slug
  const slug = await generateUniqueSlug(teamId, name);

  // Create project and assign owner in transaction
  const result = await db.transaction(async (tx) => {
    // Create project with defaults
    const [newProject] = await tx
      .insert(projects)
      .values({
        teamId,
        name,
        key,
        slug,
        description: description ?? null,
        icon: icon ?? null,
        visibility: visibility ?? "private", // Default to private
        status: status ?? "active", // Default to active
      })
      .returning();

    // Assign creator as PROJECT_OWNER (single source of truth)
    await tx.insert(projectMembers).values({
      projectId: newProject.id,
      userId,
      role: PROJECT_ROLES.PROJECT_OWNER,
    });

    // NOTE: user_roles insert removed - project_members is single source of truth
    // for project permissions per role consolidation refactor

    return newProject;
  });


  // Auto-promote creator to TEAM_EDITOR (billable)
  await autoPromoteToEditor(userId, teamId);

  logger.info("project.created", {
    projectId: result.id,
    teamId,
    userId,
    key,
    slug,
  });

  return result as Project;
}

/**
 * Update project settings
 * 
 * @param projectId - Project ID
 * @param data - Update data
 * @returns Updated project
 * @throws Error if project not found
 */
export async function updateProject(
  projectId: string,
  data: UpdateProjectData
): Promise<Project> {
  const { name, description, icon, visibility, status } = data;

  // Validate name if provided
  if (name !== undefined && !validateProjectName(name)) {
    throw new Error("Invalid project name");
  }

  // Build update object
  const updates: Partial<Project> = {
    updatedAt: new Date(),
  };

  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (icon !== undefined) updates.icon = icon;
  if (visibility !== undefined) updates.visibility = visibility;
  if (status !== undefined) updates.status = status;

  // Update project
  const [updated] = await db
    .update(projects)
    .set(updates)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .returning();

  if (!updated) {
    throw new Error("Project not found");
  }

  logger.info("project.updated", {
    projectId,
    updates: Object.keys(updates),
  });

  return updated as Project;
}

/**
 * Soft delete a project
 * Sets deletedAt timestamp to mark as deleted
 * 
 * @param projectId - Project ID
 * @throws Error if project not found
 */
export async function deleteProject(projectId: string): Promise<void> {
  const [deleted] = await db
    .update(projects)
    .set({ deletedAt: new Date() })
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .returning();

  if (!deleted) {
    throw new Error("Project not found");
  }

  logger.info("project.deleted", { projectId });
}

/**
 * Hard delete a project (permanent removal)
 * 
 * @param projectId - Project ID
 * @throws Error if project not found
 */
export async function hardDeleteProject(projectId: string): Promise<void> {
  const [deleted] = await db
    .delete(projects)
    .where(eq(projects.id, projectId))
    .returning();

  if (!deleted) {
    throw new Error("Project not found");
  }

  logger.info("project.hard_deleted", { projectId });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a user can view a project
 * 
 * @param userId - User ID
 * @param project - Project data to check
 * @returns True if user can view the project
 */
async function canViewProject(
  userId: string,
  project: { id: string; teamId: string; visibility: string }
): Promise<boolean> {
  // Public projects: any team member can view
  if (project.visibility === "public") {
    return true;
  }

  // Private projects: must be a member
  const membership = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, project.id),
      eq(projectMembers.userId, userId)
    ),
  });

  if (membership) {
    return true;
  }

  // Team owners/admins can see all private projects
  const managementRole = await getManagementRole(userId, project.teamId);
  return managementRole === "TEAM_OWNER" || managementRole === "TEAM_ADMIN";
}

/**
 * Get project statistics
 * 
 * TODO: Update this when issues table is implemented
 * Currently returns placeholder values
 * 
 * @param projectId - Project ID
 * @returns Project statistics
 */
async function getProjectStats(projectId: string): Promise<ProjectStats> {
  // Get member count
  const memberCountResult = await db
    .select({ count: count() })
    .from(projectMembers)
    .where(eq(projectMembers.projectId, projectId));

  const memberCount = memberCountResult[0]?.count ?? 0;

  // TODO: Query issues table when it exists
  // For now, return placeholder values
  return {
    totalTickets: 0,
    completedTickets: 0,
    progressPercent: 0,
    memberCount,
  };
}

/**
 * Get user's role in a project
 * 
 * @param userId - User ID
 * @param projectId - Project ID
 * @returns User's project role or null if not a member
 */
async function getUserProjectRole(
  userId: string,
  projectId: string
): Promise<string | null> {
  const membership = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, projectId),
      eq(projectMembers.userId, userId)
    ),
  });

  return membership?.role ?? null;
}
