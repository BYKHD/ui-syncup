import { z } from 'zod';

// ============================================================================
// TEAM API TYPES & SCHEMAS
// ============================================================================
// Transport layer types and Zod schemas for team API operations

// Team schemas
export const teamSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(50),
  slug: z.string(),
  description: z.string().nullable(),
  image: z.string().nullable(),
  planId: z.string(),
  billableSeats: z.number().int().min(0),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const teamWithMemberInfoSchema = teamSchema.extend({
  memberCount: z.number().int().min(0),
  myManagementRole: z.string().nullable(),
  myOperationalRole: z.string(),
});

export const teamMemberSchema = z.object({
  id: z.string().uuid(),
  teamId: z.string().uuid(),
  userId: z.string().uuid(),
  user: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    image: z.string().nullable(),
  }),
  managementRole: z.string().nullable(),
  operationalRole: z.string(),
  joinedAt: z.string(),
  invitedBy: z.string().uuid().nullable(),
});

export const invitationSchema = z.object({
  id: z.string().uuid(),
  teamId: z.string().uuid(),
  email: z.string().email(),
  managementRole: z.string().nullable(),
  operationalRole: z.string(),
  invitedBy: z.string().uuid(),
  inviterName: z.string().optional(),
  expiresAt: z.string(),
  usedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  createdAt: z.string(),
  status: z.enum(['pending', 'accepted', 'expired', 'cancelled']).optional(),
});

// Request/Response types
export const createTeamInputSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(500).optional(),
  image: z.string().optional(),
});

export const updateTeamInputSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(500).optional(),
  image: z.string().optional(),
});

export const updateMemberRolesInputSchema = z.object({
  managementRole: z.string().nullable().optional(),
  operationalRole: z.string().optional(),
});

export const createInvitationInputSchema = z.object({
  email: z.string().email(),
  managementRole: z.string().nullable().optional(),
  operationalRole: z.string(),
});

// Pagination
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

// Response types
export const teamsResponseSchema = z.object({
  teams: z.array(teamWithMemberInfoSchema),
  pagination: paginationSchema.optional(),
});

export const teamResponseSchema = z.object({
  team: teamWithMemberInfoSchema,
});

export const membersResponseSchema = z.object({
  members: z.array(teamMemberSchema),
  pagination: paginationSchema.optional(),
});

export const invitationsResponseSchema = z.object({
  invitations: z.array(invitationSchema),
  pagination: paginationSchema.optional(),
});

// Inferred types
export type Team = z.infer<typeof teamSchema>;
export type TeamWithMemberInfo = z.infer<typeof teamWithMemberInfoSchema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type Invitation = z.infer<typeof invitationSchema>;
export type CreateTeamInput = z.infer<typeof createTeamInputSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamInputSchema>;
export type UpdateMemberRolesInput = z.infer<typeof updateMemberRolesInputSchema>;
export type CreateInvitationInput = z.infer<typeof createInvitationInputSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type TeamsResponse = z.infer<typeof teamsResponseSchema>;
export type TeamResponse = z.infer<typeof teamResponseSchema>;
export type MembersResponse = z.infer<typeof membersResponseSchema>;
export type InvitationsResponse = z.infer<typeof invitationsResponseSchema>;
