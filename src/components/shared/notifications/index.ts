// ============================================================================
// NOTIFICATION COMPONENTS - BARREL EXPORTS
// ============================================================================
//
// This file provides clean imports for all notification-related components
// following the compound component pattern as per AGENTS.md
//

// Main entry point
export { NotificationPanel } from './notification-panel'

// Sub-components
export { NotificationBell } from './notification-bell-button'
export { NotificationDropdown } from './notification-dropdown'
export { NotificationItem } from './notification-item'
export { NotificationGroupItem } from './notification-group-item'
export { NotificationActions } from './notification-actions'
export { NotificationLoadMore } from './notification-load-more'

// Utility functions
export {
  formatTimestamp,
  getNotificationIcon,
  getInitials,
} from './utils'

// Re-export types from features for convenience
export type { Notification, NotificationType, NotificationMetadata } from '@/features/notifications/api'

// ============================================================================
// USAGE EXAMPLES
// ============================================================================
//
// Import notification components:
// import { NotificationPanel, NotificationBell } from '@/components/shared/notifications'
//
// Import types:
// import type { Notification } from '@/components/shared/notifications'
//
// Import utilities:
// import { formatTimestamp, getNotificationIcon } from '@/components/shared/notifications'
//
// Example usage in header:
// <NotificationPanel />
//
