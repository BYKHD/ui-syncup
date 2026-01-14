/**
 * NOTIFICATION API BARREL EXPORT
 */

// API Fetchers
export { getNotifications } from "./get-notifications";
export { getUnreadCount } from "./get-unread-count";
export { markAsRead } from "./mark-as-read";
export { markAllAsRead } from "./mark-all-as-read";

// Types
export type {
  NotificationType,
  EntityType,
  NotificationMetadata,
  Notification,
  GetNotificationsParams,
  GetNotificationsResponse,
  GetUnreadCountResponse,
  MarkAsReadResponse,
  MarkAllAsReadResponse,
} from "./types";

// Schemas (for external validation if needed)
export {
  NotificationTypeSchema,
  EntityTypeSchema,
  NotificationMetadataSchema,
  NotificationSchema,
  GetNotificationsParamsSchema,
  GetNotificationsResponseSchema,
  GetUnreadCountResponseSchema,
  MarkAsReadResponseSchema,
  MarkAllAsReadResponseSchema,
} from "./types";
