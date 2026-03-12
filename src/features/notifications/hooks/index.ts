/**
 * NOTIFICATION HOOKS BARREL EXPORT
 */

// Query hooks
export { useNotifications, notificationKeys } from "./use-notifications";
export { useUnreadCount } from "./use-unread-count";

// Mutation hooks
export { useMarkAsRead } from "./use-mark-as-read";
export { useMarkAllAsRead } from "./use-mark-all-as-read";

// Realtime subscription hook
export { useNotificationSubscription } from "./use-notification-subscription";

// Toast hook
export { useNotificationToast } from "./use-notification-toast";

// Types
export type { UseNotificationsParams, UseNotificationsResult } from "./use-notifications";
export type { UseUnreadCountParams, UseUnreadCountResult } from "./use-unread-count";
export type { UseMarkAsReadOptions, UseMarkAsReadResult } from "./use-mark-as-read";
export type { UseMarkAllAsReadOptions, UseMarkAllAsReadResult } from "./use-mark-all-as-read";
export type {
  UseNotificationSubscriptionOptions,
  UseNotificationSubscriptionResult,
} from "./use-notification-subscription";
export type { UseNotificationToastOptions } from "./use-notification-toast";
