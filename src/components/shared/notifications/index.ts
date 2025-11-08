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
export { NotificationActions } from './notification-actions'
export { NotificationLoadMore } from './notification-load-more'

// Types and mock data
export type { Notification } from './mock-data'
export {
  MOCK_NOTIFICATIONS,
  MOCK_UNREAD_COUNT,
  MOCK_TEAM_ID,
  MOCK_MEMBER_ROLE
} from './mock-data'

// Utility functions
export {
  formatTimestamp,
  getNotificationMessage,
  getInitials,
} from './utils'

// ============================================================================
// USAGE EXAMPLES
// ============================================================================
//
// Import notification components:
// import { NotificationPanel, NotificationBell } from '@components/shared/notifications'
//
// Import types and mock data:
// import type { Notification } from '@components/shared/notifications'
// import { MOCK_NOTIFICATIONS } from '@components/shared/notifications'
//
// Import utilities:
// import { formatTimestamp, getNotificationMessage } from '@components/shared/notifications'
//
// Example usage in header:
// <NotificationPanel />
//
