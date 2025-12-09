/**
 * Activity Service
 *
 * Manages issue activity logging and retrieval for timeline display.
 */

import { db } from "@/lib/db";
import { issueActivities } from "@/server/db/schema/issue-activities";
import { users } from "@/server/db/schema/users";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";
import type {
  ActivityWithActor,
  ListActivitiesParams,
  ActivityListResult,
  LogActivityData,
  FieldChange,
} from "./types";

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get paginated activities for an issue with actor information
 *
 * @param params - List parameters including pagination
 * @returns Paginated list of activities with actor details
 */
export async function getActivitiesByIssue(
  params: ListActivitiesParams
): Promise<ActivityListResult> {
  const { issueId, type, page = 1, limit = 20 } = params;

  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [eq(issueActivities.issueId, issueId)];

  if (type) {
    conditions.push(eq(issueActivities.type, type));
  }

  // Get total count
  const totalResult = await db
    .select({ count: count() })
    .from(issueActivities)
    .where(and(...conditions));

  const total = totalResult[0]?.count ?? 0;

  // Fetch activities with actor info
  const rows = await db
    .select({
      activity: issueActivities,
      actor: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.image,
      },
    })
    .from(issueActivities)
    .innerJoin(users, eq(issueActivities.actorId, users.id))
    .where(and(...conditions))
    .orderBy(desc(issueActivities.createdAt))
    .limit(limit)
    .offset(offset);

  const items: ActivityWithActor[] = rows.map((row) => ({
    ...row.activity,
    actor: row.actor,
    changes: row.activity.changes as FieldChange[] | null,
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
export async function getActivity(
  activityId: string
): Promise<ActivityWithActor | null> {
  const rows = await db
    .select({
      activity: issueActivities,
      actor: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.image,
      },
    })
    .from(issueActivities)
    .innerJoin(users, eq(issueActivities.actorId, users.id))
    .where(eq(issueActivities.id, activityId))
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    ...row.activity,
    actor: row.actor,
    changes: row.activity.changes as FieldChange[] | null,
  };
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

/**
 * Log an activity for an issue
 *
 * @param data - Activity data to log
 * @returns Created activity ID
 */
export async function logActivity(data: LogActivityData): Promise<string> {
  const { teamId, projectId, issueId, actorId, type, changes, comment } = data;

  const [activity] = await db
    .insert(issueActivities)
    .values({
      teamId, // Denormalized for multi-tenant queries
      projectId, // Denormalized for multi-tenant queries
      issueId,
      actorId,
      type,
      changes: changes ? sql`${JSON.stringify(changes)}::jsonb` : sql`'[]'::jsonb`,
      comment: comment ?? null,
    })
    .returning({ id: issueActivities.id });

  logger.debug("issue.activity.logged", {
    activityId: activity.id,
    issueId,
    actorId,
    type,
  });

  return activity.id;
}

/**
 * Log a comment activity
 *
 * Convenience wrapper for logging comment_added activities.
 *
 * @param teamId - Team UUID (denormalized)
 * @param projectId - Project UUID (denormalized)
 * @param issueId - Issue UUID
 * @param actorId - User adding the comment
 * @param comment - Comment text
 * @returns Created activity ID
 */
export async function logCommentActivity(
  teamId: string,
  projectId: string,
  issueId: string,
  actorId: string,
  comment: string
): Promise<string> {
  return logActivity({
    teamId,
    projectId,
    issueId,
    actorId,
    type: "comment_added",
    comment,
  });
}

/**
 * Log an attachment activity
 *
 * @param teamId - Team UUID (denormalized)
 * @param projectId - Project UUID (denormalized)
 * @param issueId - Issue UUID
 * @param actorId - User performing the action
 * @param action - "added" or "removed"
 * @param attachmentInfo - Attachment metadata for the activity
 * @returns Created activity ID
 */
export async function logAttachmentActivity(
  teamId: string,
  projectId: string,
  issueId: string,
  actorId: string,
  action: "added" | "removed",
  attachmentInfo: { id: string; fileName: string }
): Promise<string> {
  return logActivity({
    teamId,
    projectId,
    issueId,
    actorId,
    type: action === "added" ? "attachment_added" : "attachment_removed",
    changes: [
      {
        field: "attachment",
        from: action === "added" ? null : attachmentInfo,
        to: action === "added" ? attachmentInfo : null,
      },
    ],
  });
}
