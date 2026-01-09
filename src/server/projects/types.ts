/**
 * Project Service Types
 * 
 * Type definitions for project service operations.
 */

import type { ProjectRole } from "@/config/roles";

/**
 * Project visibility options
 */
export type ProjectVisibility = "public" | "private";

/**
 * Project status options
 */
export type ProjectStatus = "active" | "archived";

/**
 * Base project data from database
 */
export interface Project {
  id: string;
  teamId: string;
  name: string;
  key: string;
  slug: string;
  description: string | null;
  icon: string | null;
  visibility: ProjectVisibility;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Project statistics
 */
export interface ProjectStats {
  totalTickets: number;
  completedTickets: number;
  progressPercent: number;
  memberCount: number;
}

/**
 * Project with statistics and user context
 */
export interface ProjectWithStats extends Project {
  stats: ProjectStats;
  userRole: ProjectRole | null;
  canJoin: boolean;
}

/**
 * Parameters for listing projects
 */
export interface ListProjectsParams {
  teamId: string;
  userId: string;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Result of listing projects
 */
export interface ProjectListResult {
  items: ProjectWithStats[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Data for creating a new project
 */
export interface CreateProjectData {
  teamId: string;
  name: string;
  key: string;
  description?: string | null;
  icon?: string | null;
  visibility?: ProjectVisibility;
  status?: ProjectStatus;
}

/**
 * Data for updating a project
 */
export interface UpdateProjectData {
  name?: string;
  description?: string | null;
  icon?: string | null;
  visibility?: ProjectVisibility;
  status?: ProjectStatus;
}

/**
 * Project member with user details
 */
export interface ProjectMember {
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  role: ProjectRole;
  joinedAt: Date;
}

/**
 * Project invitation status
 */
export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";

/**
 * Project invitation with user details
 */
export interface ProjectInvitation {
  id: string;
  projectId: string;
  email: string;
  role: Exclude<ProjectRole, "PROJECT_OWNER">;
  status: InvitationStatus;
  invitedBy: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt: Date | null;
  cancelledAt: Date | null;
  emailDeliveryFailed: boolean;
  emailFailureReason: string | null;
  emailLastAttemptAt: Date | null;
}

/**
 * Project invitation with enriched user information
 */
export interface ProjectInvitationWithUsers extends ProjectInvitation {
  invitedUser: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  } | null;
  invitedByUser: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

/**
 * Data for creating a project invitation
 */
export interface CreateProjectInvitationData {
  projectId: string;
  email: string;
  role: Exclude<ProjectRole, "PROJECT_OWNER">;
  invitedBy: string;
}
