/**
 * PROJECT API DTOs & SCHEMAS
 * Zod validation schemas for all API request/response payloads
 */

import { z } from 'zod'

// ============================================================================
// SHARED SCHEMAS
// ============================================================================

export const ProjectStatusSchema = z.enum(['active', 'archived'])
export const ProjectVisibilitySchema = z.enum(['private', 'public'])
export const ProjectRoleSchema = z.enum(['owner', 'editor', 'member', 'viewer'])

// ============================================================================
// PROJECT SCHEMAS
// ============================================================================

export const ProjectSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  name: z.string(),
  key: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  visibility: ProjectVisibilitySchema,
  status: ProjectStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const ProjectStatsSchema = z.object({
  totalTickets: z.number(),
  completedTickets: z.number(),
  progressPercent: z.number(),
  memberCount: z.number(),
})

export const ProjectWithStatsSchema = ProjectSchema.extend({
  stats: ProjectStatsSchema,
  userRole: ProjectRoleSchema.nullable(),
  canJoin: z.boolean(),
})

export const ProjectSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  visibility: ProjectVisibilitySchema,
  status: ProjectStatusSchema,
  stats: ProjectStatsSchema,
  userRole: ProjectRoleSchema.nullable(),
  canJoin: z.boolean(),
  updatedAt: z.string(),
})

// ============================================================================
// PROJECT MEMBER SCHEMAS
// ============================================================================

export const ProjectMemberSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  userEmail: z.string(),
  userAvatar: z.string().nullable(),
  role: ProjectRoleSchema,
  joinedAt: z.string(),
})

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

export const GetProjectsParamsSchema = z.object({
  teamId: z.string(),
  status: ProjectStatusSchema.optional(),
  visibility: ProjectVisibilitySchema.optional(),
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
})

export const CreateProjectBodySchema = z.object({
  teamId: z.string(),
  name: z.string().min(1, 'Project name is required').max(100),
  key: z.string().min(2).max(10).regex(/^[A-Z]+$/, 'Key must be uppercase letters only'),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  visibility: ProjectVisibilitySchema.default('private'),
})

export const UpdateProjectBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  icon: z.string().nullable().optional(),
  visibility: ProjectVisibilitySchema.optional(),
  status: ProjectStatusSchema.optional(),
})

export const UpdateMemberRoleBodySchema = z.object({
  role: ProjectRoleSchema,
})

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const GetProjectsResponseSchema = z.object({
  projects: z.array(ProjectSummarySchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
})

export const GetProjectResponseSchema = ProjectWithStatsSchema

export const CreateProjectResponseSchema = ProjectSchema

export const UpdateProjectResponseSchema = ProjectSchema

export const GetProjectMembersResponseSchema = z.object({
  members: z.array(ProjectMemberSchema),
})

export const UpdateMemberRoleResponseSchema = z.object({
  success: z.boolean(),
  member: ProjectMemberSchema,
})

export const RemoveMemberResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})

export const DeleteProjectResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})

export const LeaveMemberResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type GetProjectsParams = z.infer<typeof GetProjectsParamsSchema>
export type GetProjectsResponse = z.infer<typeof GetProjectsResponseSchema>
export type GetProjectResponse = z.infer<typeof GetProjectResponseSchema>
export type CreateProjectBody = z.infer<typeof CreateProjectBodySchema>
export type CreateProjectResponse = z.infer<typeof CreateProjectResponseSchema>
export type UpdateProjectBody = z.infer<typeof UpdateProjectBodySchema>
export type UpdateProjectResponse = z.infer<typeof UpdateProjectResponseSchema>
export type GetProjectMembersResponse = z.infer<typeof GetProjectMembersResponseSchema>
export type UpdateMemberRoleBody = z.infer<typeof UpdateMemberRoleBodySchema>
export type UpdateMemberRoleResponse = z.infer<typeof UpdateMemberRoleResponseSchema>
export type RemoveMemberResponse = z.infer<typeof RemoveMemberResponseSchema>
export type DeleteProjectResponse = z.infer<typeof DeleteProjectResponseSchema>
export type LeaveMemberResponse = z.infer<typeof LeaveMemberResponseSchema>
