/**
 * NOTIFICATION GROUPING UTILITY
 *
 * Groups notifications by (type, entityType, entityId) within a time window
 * for better UI display. Shows "User A and 3 others commented on Issue #123"
 * instead of 4 separate notifications.
 */

import type { Notification, NotificationType, EntityType } from "../api/types";

// ============================================================================
// TYPES
// ============================================================================

export interface NotificationGroup {
  /** Unique key for the group */
  key: string;
  /** Notification type (shared by all in group) */
  type: NotificationType;
  /** Entity type (shared by all in group) */
  entityType: EntityType;
  /** Entity ID (shared by all in group) */
  entityId: string;
  /** All notifications in this group */
  notifications: Notification[];
  /** Most recent notification in the group */
  latest: Notification;
  /** Timestamp of most recent notification */
  latestAt: Date;
  /** List of unique actor names in the group */
  actorNames: string[];
  /** Whether any notification in the group is unread */
  hasUnread: boolean;
}

// ============================================================================
// GROUPING FUNCTION
// ============================================================================

/**
 * Groups notifications by (type, entityType, entityId) within a time window
 *
 * @param notifications - Array of notifications to group
 * @param windowMs - Time window in milliseconds (default: 1 hour)
 * @returns Array of notification groups, sorted by latestAt DESC
 *
 * @example
 * const groups = groupNotifications(notifications, 60 * 60 * 1000)
 * // Returns groups like:
 * // [
 * //   { type: 'mention', entityId: '123', actorNames: ['Alice', 'Bob'], ... },
 * //   { type: 'issue_assigned', entityId: '456', actorNames: ['Carol'], ... }
 * // ]
 */
export function groupNotifications(
  notifications: Notification[],
  windowMs: number = 60 * 60 * 1000 // 1 hour default
): NotificationGroup[] {
  if (!notifications.length) {
    return [];
  }

  // Sort by createdAt DESC first
  const sorted = [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const groups = new Map<string, NotificationGroup>();

  for (const notification of sorted) {
    const notificationTime = new Date(notification.createdAt).getTime();
    const groupKey = `${notification.type}:${notification.entityType}:${notification.entityId}`;

    // Check if this notification belongs to an existing group (within time window)
    const existingGroup = groups.get(groupKey);

    if (existingGroup) {
      const latestTime = existingGroup.latestAt.getTime();
      const timeDiff = latestTime - notificationTime;

      // If within time window, add to existing group
      if (timeDiff <= windowMs) {
        existingGroup.notifications.push(notification);

        // Track unique actor names
        const actorName = notification.metadata.actor_name;
        if (actorName && !existingGroup.actorNames.includes(actorName)) {
          existingGroup.actorNames.push(actorName);
        }

        // Track unread status
        if (!notification.readAt) {
          existingGroup.hasUnread = true;
        }

        continue;
      }
    }

    // Create a new group
    const actorName = notification.metadata.actor_name;
    groups.set(groupKey, {
      key: `${groupKey}:${notificationTime}`,
      type: notification.type,
      entityType: notification.entityType,
      entityId: notification.entityId,
      notifications: [notification],
      latest: notification,
      latestAt: new Date(notification.createdAt),
      actorNames: actorName ? [actorName] : [],
      hasUnread: !notification.readAt,
    });
  }

  // Convert to array and sort by latestAt DESC
  return Array.from(groups.values()).sort(
    (a, b) => b.latestAt.getTime() - a.latestAt.getTime()
  );
}

/**
 * Formats actor names for display
 *
 * @example
 * formatActorNames(['Alice']) // 'Alice'
 * formatActorNames(['Alice', 'Bob']) // 'Alice and Bob'
 * formatActorNames(['Alice', 'Bob', 'Carol']) // 'Alice, Bob and Carol'
 * formatActorNames(['Alice', 'Bob', 'Carol', 'Dave']) // 'Alice, Bob and 2 others'
 */
export function formatActorNames(names: string[], maxDisplay: number = 2): string {
  if (names.length === 0) {
    return "Someone";
  }

  if (names.length === 1) {
    return names[0];
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }

  if (names.length <= maxDisplay + 1) {
    const last = names[names.length - 1];
    const rest = names.slice(0, -1).join(", ");
    return `${rest} and ${last}`;
  }

  const displayed = names.slice(0, maxDisplay).join(", ");
  const remaining = names.length - maxDisplay;
  return `${displayed} and ${remaining} other${remaining > 1 ? "s" : ""}`;
}
