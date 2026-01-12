/**
 * Project Activity Service
 *
 * Manages project-level activity logging and retrieval for timeline display.
 * Tracks invitation events, member changes, and other project-level actions.
 */

import { db } from "@/lib/db";
import {
  projectActivities,
  type ProjectActivityType,
} from "@/server/db/schema/project-activities";
import { users } from "@/server/db/schema/users";
import { eq, and, desc, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Actor information for activity display
 * Note: Email is intentionally excluded to minimize PII exposure
 */
export interface ProjectActivityActor {
  id: string;
  name: string;
  avatarUrl: string | null;
}

/**
 * Activity with enriched actor information
 */
export interface ProjectActivityWithActor {
  id: string;
  teamId: string;
  projectId: string;
  actorId: string | null;
  actor: ProjectActivityActor | null;
  type: ProjectActivityType;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Parameters for listing activities
 */
export interface ListProjectActivitiesParams {
  projectId: string;
  type?: ProjectActivityType;
  page?: number;
  limit?: number;
}

/**
 * Paginated result for activities
 */
export interface ProjectActivityListResult {
  items: ProjectActivityWithActor[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Data for logging a project activity
 */
export interface LogProjectActivityData {
  teamId: string;
  projectId: string;
  actorId?: string | null;
  type: ProjectActivityType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

// ============================================================================
// INVITATION METADATA TYPES
// ============================================================================

export interface InvitationSentMetadata {
  invitationId: string;
  email: string;
  role: string;
}

export interface InvitationAcceptedMetadata {
  invitationId: string;
  userId: string;
  userName: string;
  role: string;
}

export interface InvitationDeclinedMetadata {
  invitationId: string;
  email: string;
}

export interface InvitationRevokedMetadata {
  invitationId: string;
  email: string;
}

export interface InvitationEmailFailedMetadata {
  invitationId: string;
  email: string;
  reason: string;
  lastAttemptAt: string;
}

export interface MemberRoleChangedMetadata {
  userId: string;
  userName: string;
  oldRole: string;
  newRole: string;
}

export interface MemberAddedMetadata {
  userId: string;
  userName: string;
  role: string;
  addedVia: "invitation" | "direct";
}

export interface MemberRemovedMetadata {
  userId: string;
  userName: string;
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Maximum number of activities per page to prevent abuse
 */
const MAX_ACTIVITIES_LIMIT = 100;

/**
 * Get paginated activities for a project with actor information
 *
 * Uses a window function to get count in a single query for performance.
 *
 * @param params - List parameters including pagination
 * @returns Paginated list of activities with actor details
 */
export async function getProjectActivities(
  params: ListProjectActivitiesParams
): Promise<ProjectActivityListResult> {
  const { projectId, type, page = 1, limit: requestedLimit = 20 } = params;

  // Clamp limit to prevent abuse
  const limit = Math.min(Math.max(1, requestedLimit), MAX_ACTIVITIES_LIMIT);
  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [eq(projectActivities.projectId, projectId)];

  if (type) {
    conditions.push(eq(projectActivities.type, type));
  }

  // Single query with window function for count optimization
  const rows = await db
    .select({
      activity: projectActivities,
      actor: {
        id: users.id,
        name: users.name,
        avatarUrl: users.image,
      },
      totalCount: sql<number>`count(*) over()`.as("total_count"),
    })
    .from(projectActivities)
    .leftJoin(users, eq(projectActivities.actorId, users.id))
    .where(and(...conditions))
    .orderBy(desc(projectActivities.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total from first row (window function provides same value for all rows)
  const total = rows[0]?.totalCount ?? 0;

  const items: ProjectActivityWithActor[] = rows.map((row) => ({
    id: row.activity.id,
    teamId: row.activity.teamId,
    projectId: row.activity.projectId,
    actorId: row.activity.actorId,
    actor: row.actor?.id
      ? {
          id: row.actor.id,
          name: row.actor.name,
          avatarUrl: row.actor.avatarUrl,
        }
      : null,
    type: row.activity.type,
    metadata: (row.activity.metadata as Record<string, unknown>) ?? {},
    createdAt: row.activity.createdAt,
  }));

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a single activity by ID with actor information
 *
 * @param activityId - Activity UUID
 * @returns Activity with actor or null if not found
 */
export async function getProjectActivity(
  activityId: string
): Promise<ProjectActivityWithActor | null> {
  const rows = await db
    .select({
      activity: projectActivities,
      actor: {
        id: users.id,
        name: users.name,
        avatarUrl: users.image,
      },
    })
    .from(projectActivities)
    .leftJoin(users, eq(projectActivities.actorId, users.id))
    .where(eq(projectActivities.id, activityId))
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    id: row.activity.id,
    teamId: row.activity.teamId,
    projectId: row.activity.projectId,
    actorId: row.activity.actorId,
    actor: row.actor?.id
      ? {
          id: row.actor.id,
          name: row.actor.name,
          avatarUrl: row.actor.avatarUrl,
        }
      : null,
    type: row.activity.type,
    metadata: (row.activity.metadata as Record<string, unknown>) ?? {},
    createdAt: row.activity.createdAt,
  };
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

/**
 * Log an activity for a project
 *
 * @param data - Activity data to log
 * @returns Created activity ID
 */
export async function logProjectActivity(
  data: LogProjectActivityData
): Promise<string> {
  const { teamId, projectId, actorId, type, metadata } = data;

  try {
    const [activity] = await db
      .insert(projectActivities)
      .values({
        teamId,
        projectId,
        actorId: actorId ?? null,
        type,
        metadata: metadata
          ? sql`${JSON.stringify(metadata)}::jsonb`
          : sql`'{}'::jsonb`,
      })
      .returning({ id: projectActivities.id });

    logger.debug("project.activity.logged", {
      activityId: activity.id,
      projectId,
      actorId,
      type,
    });

    return activity.id;
  } catch (error) {
    // Log error but don't fail the calling operation
    logger.error("project.activity.log_failed", {
      projectId,
      actorId,
      type,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

// ============================================================================
// INVITATION ACTIVITY LOGGING
// ============================================================================

/**
 * Log invitation sent activity
 *
 * @param teamId - Team UUID
 * @param projectId - Project UUID
 * @param actorId - User who sent the invitation
 * @param metadata - Invitation details
 * @returns Created activity ID
 */
export async function logInvitationSent(
  teamId: string,
  projectId: string,
  actorId: string,
  metadata: InvitationSentMetadata
): Promise<string> {
  return logProjectActivity({
    teamId,
    projectId,
    actorId,
    type: "invitation_sent",
    metadata,
  });
}

/**
 * Log invitation accepted activity
 *
 * @param teamId - Team UUID
 * @param projectId - Project UUID
 * @param actorId - User who accepted the invitation
 * @param metadata - Acceptance details
 * @returns Created activity ID
 */
export async function logInvitationAccepted(
  teamId: string,
  projectId: string,
  actorId: string,
  metadata: InvitationAcceptedMetadata
): Promise<string> {
  return logProjectActivity({
    teamId,
    projectId,
    actorId,
    type: "invitation_accepted",
    metadata,
  });
}

/**
 * Log invitation declined activity
 *
 * Note: No actorId since decline can happen without authentication
 *
 * @param teamId - Team UUID
 * @param projectId - Project UUID
 * @param metadata - Decline details
 * @returns Created activity ID
 */
export async function logInvitationDeclined(
  teamId: string,
  projectId: string,
  metadata: InvitationDeclinedMetadata
): Promise<string> {
  return logProjectActivity({
    teamId,
    projectId,
    actorId: null,
    type: "invitation_declined",
    metadata,
  });
}

/**
 * Log invitation revoked activity
 *
 * @param teamId - Team UUID
 * @param projectId - Project UUID
 * @param actorId - User who revoked the invitation
 * @param metadata - Revocation details
 * @returns Created activity ID
 */
export async function logInvitationRevoked(
  teamId: string,
  projectId: string,
  actorId: string,
  metadata: InvitationRevokedMetadata
): Promise<string> {
  return logProjectActivity({
    teamId,
    projectId,
    actorId,
    type: "invitation_revoked",
    metadata,
  });
}

/**
 * Log invitation email failed activity
 *
 * Note: No actorId since this is a system event
 *
 * @param teamId - Team UUID
 * @param projectId - Project UUID
 * @param metadata - Failure details
 * @returns Created activity ID
 */
export async function logInvitationEmailFailed(
  teamId: string,
  projectId: string,
  metadata: InvitationEmailFailedMetadata
): Promise<string> {
  return logProjectActivity({
    teamId,
    projectId,
    actorId: null,
    type: "invitation_email_failed",
    metadata,
  });
}

// ============================================================================
// MEMBER ACTIVITY LOGGING
// ============================================================================

/**
 * Log member role changed activity
 *
 * @param teamId - Team UUID
 * @param projectId - Project UUID
 * @param actorId - User who changed the role
 * @param metadata - Role change details
 * @returns Created activity ID
 */
export async function logMemberRoleChanged(
  teamId: string,
  projectId: string,
  actorId: string,
  metadata: MemberRoleChangedMetadata
): Promise<string> {
  return logProjectActivity({
    teamId,
    projectId,
    actorId,
    type: "member_role_changed",
    metadata,
  });
}

/**
 * Log member added activity
 *
 * @param teamId - Team UUID
 * @param projectId - Project UUID
 * @param actorId - User who added the member (or the member themselves if via invitation)
 * @param metadata - Member addition details
 * @returns Created activity ID
 */
export async function logMemberAdded(
  teamId: string,
  projectId: string,
  actorId: string,
  metadata: MemberAddedMetadata
): Promise<string> {
  return logProjectActivity({
    teamId,
    projectId,
    actorId,
    type: "member_added",
    metadata,
  });
}

/**
 * Log member removed activity
 *
 * @param teamId - Team UUID
 * @param projectId - Project UUID
 * @param actorId - User who removed the member
 * @param metadata - Member removal details
 * @returns Created activity ID
 */
export async function logMemberRemoved(
  teamId: string,
  projectId: string,
  actorId: string,
  metadata: MemberRemovedMetadata
): Promise<string> {
  return logProjectActivity({
    teamId,
    projectId,
    actorId,
    type: "member_removed",
    metadata,
  });
}

// ============================================================================
// ACTIVITY TYPE HELPERS
// ============================================================================

/**
 * All invitation-related activity types for filtering
 */
export const INVITATION_ACTIVITY_TYPES = [
  "invitation_sent",
  "invitation_accepted",
  "invitation_declined",
  "invitation_revoked",
  "invitation_email_failed",
] as const;

export type InvitationActivityType = (typeof INVITATION_ACTIVITY_TYPES)[number];

/**
 * Check if an activity type is invitation-related
 */
export function isInvitationActivityType(
  type: string
): type is InvitationActivityType {
  return INVITATION_ACTIVITY_TYPES.includes(type as InvitationActivityType);
}

/**
 * All member-related activity types for filtering
 */
export const MEMBER_ACTIVITY_TYPES = [
  "member_role_changed",
  "member_added",
  "member_removed",
] as const;

export type MemberActivityType = (typeof MEMBER_ACTIVITY_TYPES)[number];

/**
 * Check if an activity type is member-related
 */
export function isMemberActivityType(type: string): type is MemberActivityType {
  return MEMBER_ACTIVITY_TYPES.includes(type as MemberActivityType);
}
