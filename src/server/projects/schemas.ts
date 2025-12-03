/**
 * Server-Side Project Validation Schemas
 * 
 * Zod schemas for validating project data on the server.
 * These schemas match the frontend types in src/features/projects/api/types.ts
 * but handle server-specific concerns like Date objects vs ISO strings.
 */

import { z } from "zod";
import { PROJECT_ROLES, type ProjectRole } from "@/config/roles";

// ============================================================================
// ENUMS & PRIMITIVES
// ============================================================================

export const ProjectStatusSchema = z.enum(["active", "archived"]);
export const ProjectVisibilitySchema = z.enum(["private", "public"]);
export const ProjectRoleSchema = z.enum([
  PROJECT_ROLES.PROJECT_OWNER,
  PROJECT_ROLES.PROJECT_EDITOR,
  PROJECT_ROLES.PROJECT_DEVELOPER,
  PROJECT_ROLES.PROJECT_VIEWER,
] as const);

// ============================================================================
// DATABASE MODELS (with Date objects)
// ============================================================================

/**
 * Project schema for database records
 * Uses Date objects for timestamps (as returned by Drizzle)
 */
export const ProjectDbSchema = z.object({
  id: z.string().uuid(),
  teamId: z.string().uuid(),
  name: z.string().min(1).max(100),
  key: z.string().min(2).max(10).regex(/^[A-Z]+$/),
  slug: z.string().min(1).max(120),
  description: z.string().max(500).nullable(),
  icon: z.string().max(255).nullable(),
  visibility: ProjectVisibilitySchema,
  status: ProjectStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

/**
 * Project member schema for database records
 */
export const ProjectMemberDbSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  role: ProjectRoleSchema,
  joinedAt: z.date(),
});

// ============================================================================
// API RESPONSE MODELS (with ISO string dates)
// ============================================================================

/**
 * Project schema for API responses
 * Uses ISO string dates for JSON serialization
 */
export const ProjectApiSchema = z.object({
  id: z.string().uuid(),
  teamId: z.string().uuid(),
  name: z.string().min(1).max(100),
  key: z.string().min(2).max(10).regex(/^[A-Z]+$/),
  slug: z.string().min(1).max(120),
  description: z.string().max(500).nullable(),
  icon: z.string().max(255).nullable(),
  visibility: ProjectVisibilitySchema,
  status: ProjectStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Project statistics schema
 */
export const ProjectStatsSchema = z.object({
  totalTickets: z.number().int().min(0),
  completedTickets: z.number().int().min(0),
  progressPercent: z.number().min(0).max(100),
  memberCount: z.number().int().min(0),
});

/**
 * Project with stats and user context for API responses
 */
export const ProjectWithStatsApiSchema = ProjectApiSchema.extend({
  stats: ProjectStatsSchema,
  userRole: ProjectRoleSchema.nullable(),
  canJoin: z.boolean(),
});

/**
 * Project member with user details for API responses
 */
export const ProjectMemberApiSchema = z.object({
  userId: z.string().uuid(),
  userName: z.string().min(1),
  userEmail: z.string().email(),
  userAvatar: z.string().url().nullable(),
  role: ProjectRoleSchema,
  joinedAt: z.string().datetime(),
});

// ============================================================================
// REQUEST VALIDATION SCHEMAS
// ============================================================================

/**
 * Query parameters for listing projects
 */
export const ListProjectsQuerySchema = z.object({
  teamId: z.string().uuid(),
  status: ProjectStatusSchema.optional(),
  visibility: ProjectVisibilitySchema.optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Request body for creating a project
 */
export const CreateProjectBodySchema = z.object({
  teamId: z.string().uuid(),
  name: z.string().min(1, "Project name is required").max(100),
  key: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[A-Z]+$/, "Key must be uppercase letters only"),
  description: z
    .string()
    .max(500)
    .nullish()
    .transform((val) => (!val || val.trim() === "" ? null : val)),
  icon: z
    .string()
    .max(255)
    .nullish()
    .transform((val) => (!val || val.trim() === "" ? null : val)),
  visibility: ProjectVisibilitySchema.default("private"),
});

/**
 * Request body for updating a project
 */
export const UpdateProjectBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  icon: z.string().max(255).nullable().optional(),
  visibility: ProjectVisibilitySchema.optional(),
  status: ProjectStatusSchema.optional(),
});

/**
 * Request body for updating member role
 */
export const UpdateMemberRoleBodySchema = z.object({
  role: ProjectRoleSchema,
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Response for listing projects
 */
export const ListProjectsResponseSchema = z.object({
  projects: z.array(ProjectWithStatsApiSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  }),
});

/**
 * Response for getting a single project
 */
export const GetProjectResponseSchema = ProjectWithStatsApiSchema;

/**
 * Response for creating a project
 */
export const CreateProjectResponseSchema = ProjectApiSchema;

/**
 * Response for updating a project
 */
export const UpdateProjectResponseSchema = ProjectApiSchema;

/**
 * Response for deleting a project
 */
export const DeleteProjectResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

/**
 * Response for listing project members
 */
export const ListProjectMembersResponseSchema = z.object({
  members: z.array(ProjectMemberApiSchema),
});

/**
 * Response for joining a project
 */
export const JoinProjectResponseSchema = z.object({
  success: z.boolean(),
  member: ProjectMemberApiSchema,
});

/**
 * Response for leaving a project
 */
export const LeaveProjectResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

/**
 * Response for updating member role
 */
export const UpdateMemberRoleResponseSchema = z.object({
  success: z.boolean(),
  member: ProjectMemberApiSchema,
});

/**
 * Response for removing a member
 */
export const RemoveMemberResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ProjectDb = z.infer<typeof ProjectDbSchema>;
export type ProjectMemberDb = z.infer<typeof ProjectMemberDbSchema>;
export type ProjectApi = z.infer<typeof ProjectApiSchema>;
export type ProjectStats = z.infer<typeof ProjectStatsSchema>;
export type ProjectWithStatsApi = z.infer<typeof ProjectWithStatsApiSchema>;
export type ProjectMemberApi = z.infer<typeof ProjectMemberApiSchema>;
export type ListProjectsQuery = z.infer<typeof ListProjectsQuerySchema>;
export type CreateProjectBody = z.infer<typeof CreateProjectBodySchema>;
export type UpdateProjectBody = z.infer<typeof UpdateProjectBodySchema>;
export type UpdateMemberRoleBody = z.infer<typeof UpdateMemberRoleBodySchema>;
export type ListProjectsResponse = z.infer<typeof ListProjectsResponseSchema>;
export type GetProjectResponse = z.infer<typeof GetProjectResponseSchema>;
export type CreateProjectResponse = z.infer<typeof CreateProjectResponseSchema>;
export type UpdateProjectResponse = z.infer<typeof UpdateProjectResponseSchema>;
export type DeleteProjectResponse = z.infer<typeof DeleteProjectResponseSchema>;
export type ListProjectMembersResponse = z.infer<typeof ListProjectMembersResponseSchema>;
export type JoinProjectResponse = z.infer<typeof JoinProjectResponseSchema>;
export type LeaveProjectResponse = z.infer<typeof LeaveProjectResponseSchema>;
export type UpdateMemberRoleResponse = z.infer<typeof UpdateMemberRoleResponseSchema>;
export type RemoveMemberResponse = z.infer<typeof RemoveMemberResponseSchema>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert database project (with Date objects) to API format (with ISO strings)
 */
export function projectDbToApi(project: ProjectDb): ProjectApi {
  return {
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

/**
 * Convert database project member to API format
 */
export function projectMemberDbToApi(
  member: {
    userId: string;
    userName: string;
    userEmail: string;
    userAvatar: string | null;
    role: ProjectRole;
    joinedAt: Date;
  }
): ProjectMemberApi {
  return {
    userId: member.userId,
    userName: member.userName,
    userEmail: member.userEmail,
    userAvatar: member.userAvatar,
    role: member.role,
    joinedAt: member.joinedAt.toISOString(),
  };
}
