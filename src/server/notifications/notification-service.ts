/**
 * Notification Service
 *
 * Core business logic for notification operations including:
 * - Creating notifications (with actor exclusion and deduplication)
 * - Fetching notifications (paginated)
 * - Marking notifications as read
 * - Getting unread count
 * - Building deep-link URLs
 *
 * Design principles:
 * - Fire-and-forget: Notification creation does NOT block triggering actions
 * - Actor exclusion: Users don't receive notifications for their own actions
 * - Deduplication: Identical notifications within 5-minute window are skipped
 * - RLS: Read operations respect row-level security via service role bypass
 */

import { db } from "@/lib/db";
import { notifications } from "@/server/db/schema/notifications";
import { eq, and, desc, lt, isNull, gt, inArray, count } from "drizzle-orm";
import { logger } from "@/lib/logger";
import type {
  Notification,
  NotificationType,
  EntityType,
  CreateNotificationDTO,
  NotificationMetadata,
  NotificationQueryOptions,
  PaginatedNotifications,
} from "./types";
import { CreateNotificationSchema } from "./types";

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default deduplication window in milliseconds (5 minutes)
 */
const DEFAULT_DEDUP_WINDOW_MS = 5 * 60 * 1000;

/**
 * Default pagination limit
 */
const DEFAULT_LIMIT = 20;

/**
 * Maximum pagination limit
 */
const MAX_LIMIT = 100;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a notification should be created based on actor exclusion rules.
 *
 * Returns false if the actor is the same as the recipient (prevents self-notifications).
 *
 * @param actorId - The user who performed the action
 * @param recipientId - The user who would receive the notification
 * @returns true if notification should be created, false otherwise
 */
export function shouldCreateNotification(
  actorId: string | undefined,
  recipientId: string
): boolean {
  // Never notify the actor of their own action
  if (actorId && actorId === recipientId) {
    return false;
  }
  return true;
}

/**
 * Check if an identical notification exists within the deduplication window.
 *
 * Identical means same (recipientId, actorId, type, entityType, entityId).
 *
 * @param data - The notification data to check
 * @param windowMs - The deduplication window in milliseconds (default: 5 minutes)
 * @returns true if a duplicate exists, false otherwise
 */
export async function isDuplicate(
  data: CreateNotificationDTO,
  windowMs: number = DEFAULT_DEDUP_WINDOW_MS
): Promise<boolean> {
  const cutoff = new Date(Date.now() - windowMs);

  try {
    const existing = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, data.recipientId),
          data.actorId
            ? eq(notifications.actorId, data.actorId)
            : isNull(notifications.actorId),
          eq(notifications.type, data.type),
          eq(notifications.entityType, data.entityType),
          eq(notifications.entityId, data.entityId),
          gt(notifications.createdAt, cutoff)
        )
      )
      .limit(1);

    return existing.length > 0;
  } catch (error) {
    // Log error but don't block - err on the side of creating the notification
    logger.error("Error checking for duplicate notification", { error, data });
    return false;
  }
}

/**
 * Build a deep-link URL for navigation based on notification type and metadata.
 *
 * URL patterns:
 * - Issue notifications: /teams/{teamSlug}/projects/{projectKey}/issues/{issueKey}#comment-{commentId}
 * - Project invitations: /teams/{teamSlug}/projects/{projectKey}
 * - Team invitations: /teams/{teamSlug}
 *
 * @param type - The notification type
 * @param metadata - Partial metadata containing URL components
 * @returns The generated deep-link URL
 */
export function buildTargetUrl(
  type: NotificationType,
  metadata: Partial<NotificationMetadata>
): string {
  const { team_slug, project_key, issue_key, comment_id } = metadata;

  // Base team URL
  const teamUrl = team_slug ? `/teams/${team_slug}` : "";

  switch (type) {
    case "mention":
    case "comment_created":
    case "reply":
      // Comment-related notifications navigate to issue with comment anchor
      if (team_slug && project_key && issue_key) {
        const issueUrl = `${teamUrl}/projects/${project_key}/issues/${issue_key}`;
        return comment_id ? `${issueUrl}#comment-${comment_id}` : issueUrl;
      }
      break;

    case "issue_assigned":
    case "issue_status_changed":
      // Issue notifications navigate to the issue
      if (team_slug && project_key && issue_key) {
        return `${teamUrl}/projects/${project_key}/issues/${issue_key}`;
      }
      break;

    case "project_invitation":
      // Project invitation navigates to project (after acceptance)
      if (team_slug && project_key) {
        return `${teamUrl}/projects/${project_key}`;
      }
      break;

    case "team_invitation":
      // Team invitation redirects to /projects after team context is switched
      // The /teams/{slug} route doesn't exist - app uses route groups
      return "/projects";

    case "role_updated":
      // Role update navigates to team settings or project
      if (team_slug && project_key) {
        return `${teamUrl}/projects/${project_key}/settings/members`;
      }
      if (team_slug) {
        return `${teamUrl}/settings/members`;
      }
      break;
  }

  // Fallback to root or provided target_url
  return metadata.target_url || "/";
}

/**
 * Transform a database notification row to the domain Notification type.
 *
 * @param row - The database row
 * @returns The transformed Notification object
 */
function transformNotification(row: typeof notifications.$inferSelect): Notification {
  return {
    id: row.id,
    recipientId: row.recipientId,
    actorId: row.actorId,
    type: row.type as NotificationType,
    entityType: row.entityType as EntityType,
    entityId: row.entityId,
    metadata: (row.metadata as NotificationMetadata) || { target_url: "/" },
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

/**
 * Create a single notification with validation, actor exclusion, and deduplication.
 *
 * Fire-and-forget pattern: This function logs errors but does not throw,
 * ensuring the calling action is not blocked by notification failures.
 *
 * @param data - The notification creation data
 * @returns The created notification, or null if skipped (actor exclusion/dedup)
 */
export async function createNotification(
  data: CreateNotificationDTO
): Promise<Notification | null> {
  try {
    // Validate input
    const validated = CreateNotificationSchema.safeParse(data);
    if (!validated.success) {
      logger.warn("Invalid notification data", {
        errors: validated.error.errors,
        data,
      });
      return null;
    }

    // Actor exclusion check
    if (!shouldCreateNotification(data.actorId, data.recipientId)) {
      logger.debug("Skipping self-notification", { actorId: data.actorId });
      return null;
    }

    // Deduplication check
    if (await isDuplicate(data)) {
      logger.debug("Skipping duplicate notification", {
        type: data.type,
        entityId: data.entityId,
        recipientId: data.recipientId,
      });
      return null;
    }

    // Create the notification
    const [created] = await db
      .insert(notifications)
      .values({
        recipientId: data.recipientId,
        actorId: data.actorId || null,
        type: data.type,
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: data.metadata,
      })
      .returning();

    logger.info("Notification created", {
      id: created.id,
      type: data.type,
      recipientId: data.recipientId,
    });

    return transformNotification(created);
  } catch (error) {
    // Fire-and-forget: Log error but don't throw
    logger.error("Failed to create notification", { error, data });
    return null;
  }
}

/**
 * Create multiple notifications in batch.
 *
 * Useful for multi-recipient events (e.g., notifying all watchers).
 * Each notification is individually validated with actor exclusion and dedup.
 *
 * @param dataArray - Array of notification creation data
 * @returns Array of created notifications (nulls filtered out)
 */
export async function createNotifications(
  dataArray: CreateNotificationDTO[]
): Promise<Notification[]> {
  const results = await Promise.all(
    dataArray.map((data) => createNotification(data))
  );

  return results.filter((n): n is Notification => n !== null);
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get paginated notifications for a user.
 *
 * Uses cursor-based pagination for efficient scrolling.
 * Ordered by created_at DESC (newest first).
 *
 * @param userId - The recipient user ID
 * @param options - Pagination and filter options
 * @returns Paginated notification list with metadata
 */
export async function getNotifications(
  userId: string,
  options: NotificationQueryOptions = {}
): Promise<PaginatedNotifications> {
  const limit = Math.min(options.limit || DEFAULT_LIMIT, MAX_LIMIT);
  const cursor = options.cursor ? new Date(options.cursor) : null;
  const unreadOnly = options.unreadOnly || false;

  try {
    // Build where conditions
    const conditions = [eq(notifications.recipientId, userId)];

    if (cursor) {
      conditions.push(lt(notifications.createdAt, cursor));
    }

    if (unreadOnly) {
      conditions.push(isNull(notifications.readAt));
    }

    // Fetch notifications (+1 for hasMore check)
    const rows = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit + 1);

    // Check if there are more results
    const hasMore = rows.length > limit;
    const notificationRows = hasMore ? rows.slice(0, limit) : rows;

    // Get total unread count
    const [unreadResult] = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, userId),
          isNull(notifications.readAt)
        )
      );

    const totalUnread = unreadResult?.count || 0;

    // Transform to domain types
    const notificationList = notificationRows.map(transformNotification);

    // Calculate next cursor
    const lastNotification = notificationList[notificationList.length - 1];
    const nextCursor = hasMore && lastNotification
      ? lastNotification.createdAt.toISOString()
      : null;

    return {
      notifications: notificationList,
      nextCursor,
      hasMore,
      totalUnread,
    };
  } catch (error) {
    logger.error("Failed to get notifications", { error, userId });
    throw error;
  }
}

/**
 * Get the count of unread notifications for a user.
 *
 * Lightweight query for badge display and polling fallback.
 *
 * @param userId - The recipient user ID
 * @returns Count of unread notifications
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, userId),
          isNull(notifications.readAt)
        )
      );

    return result?.count || 0;
  } catch (error) {
    logger.error("Failed to get unread count", { error, userId });
    throw error;
  }
}

// ============================================================================
// UPDATE OPERATIONS
// ============================================================================

/**
 * Mark specific notifications as read.
 *
 * Only updates notifications owned by the specified user (RLS enforcement).
 *
 * @param userId - The notification owner
 * @param notificationIds - Array of notification IDs to mark as read
 * @returns Number of notifications updated
 */
export async function markAsRead(
  userId: string,
  notificationIds: string[]
): Promise<number> {
  if (notificationIds.length === 0) {
    return 0;
  }

  try {
    const result = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.recipientId, userId),
          isNull(notifications.readAt),
          inArray(notifications.id, notificationIds)
        )
      )
      .returning({ id: notifications.id });

    logger.info("Marked notifications as read", {
      userId,
      count: result.length,
    });

    return result.length;
  } catch (error) {
    logger.error("Failed to mark notifications as read", {
      error,
      userId,
      notificationIds,
    });
    throw error;
  }
}

/**
 * Mark all unread notifications as read for a user.
 *
 * @param userId - The notification owner
 * @returns Number of notifications updated
 */
export async function markAllAsRead(userId: string): Promise<number> {
  try {
    const result = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.recipientId, userId),
          isNull(notifications.readAt)
        )
      )
      .returning({ id: notifications.id });

    logger.info("Marked all notifications as read", {
      userId,
      count: result.length,
    });

    return result.length;
  } catch (error) {
    logger.error("Failed to mark all notifications as read", { error, userId });
    throw error;
  }
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

/**
 * Delete notifications by entity.
 *
 * Used for cleanup when an entity is deleted (e.g., issue, comment).
 *
 * @param entityType - The entity type
 * @param entityId - The entity ID
 * @returns Number of notifications deleted
 */
export async function deleteNotificationsByEntity(
  entityType: EntityType,
  entityId: string
): Promise<number> {
  try {
    const result = await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.entityType, entityType),
          eq(notifications.entityId, entityId)
        )
      )
      .returning({ id: notifications.id });

    if (result.length > 0) {
      logger.info("Deleted notifications for entity", {
        entityType,
        entityId,
        count: result.length,
      });
    }

    return result.length;
  } catch (error) {
    logger.error("Failed to delete notifications by entity", {
      error,
      entityType,
      entityId,
    });
    throw error;
  }
}
