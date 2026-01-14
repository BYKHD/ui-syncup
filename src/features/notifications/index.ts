/**
 * NOTIFICATIONS FEATURE BARREL EXPORT
 *
 * Public API for the notifications feature module.
 */

// API
export {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "./api";

// Hooks
export {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  notificationKeys,
} from "./hooks";

// Utils
export { groupNotifications, formatActorNames } from "./utils";

// Types
export type {
  Notification,
  NotificationType,
  EntityType,
  NotificationMetadata,
  GetNotificationsParams,
  GetNotificationsResponse,
} from "./api";

export type { NotificationGroup } from "./utils";

export type {
  UseNotificationsParams,
  UseNotificationsResult,
  UseUnreadCountParams,
  UseUnreadCountResult,
  UseMarkAsReadOptions,
  UseMarkAsReadResult,
  UseMarkAllAsReadOptions,
  UseMarkAllAsReadResult,
} from "./hooks";
