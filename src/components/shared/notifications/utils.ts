// ============================================================================
// UTILITY FUNCTIONS FOR NOTIFICATIONS (MOCKUP UI)
// ============================================================================

import type { Notification } from './mock-data'

/**
 * Format timestamp to human-readable relative time
 */
export function formatTimestamp(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) {
    return 'just now'
  }

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.floor(hours / 24)
  if (days < 7) {
    return `${days}d ago`
  }

  const weeks = Math.floor(days / 7)
  if (weeks < 4) {
    return `${weeks}w ago`
  }

  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

/**
 * Get notification message text based on type and metadata
 */
export function getNotificationMessage(notification: Notification): string {
  const { type, actorName, metadata } = notification
  const actor = actorName || 'Someone'

  switch (type) {
    case 'invitation':
      return `${metadata.inviterName || actor} invited you to join ${metadata.projectName || 'a project'}`

    case 'comment':
      return `${actor} commented on ${metadata.projectName || 'your project'}`

    case 'mention':
      return `${actor} mentioned you in ${metadata.projectName || 'a project'}`

    case 'status_change':
      return `${actor} changed ${metadata.projectName || 'project'} status to ${metadata.newStatus || 'updated'}`

    case 'assignment':
      return `${actor} assigned you to ${metadata.taskName || 'a task'} in ${metadata.projectName || 'a project'}`

    default:
      return `${actor} sent you a notification`
  }
}

/**
 * Check if notifications should be batched (5+ notifications in last 5 minutes)
 */
export function shouldBatchNotifications(notifications: Notification[]): {
  shouldBatch: boolean
  batchNotifications: Notification[]
} {
  const BATCH_THRESHOLD = 5
  const BATCH_TIME_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

  const now = new Date().getTime()
  const recentNotifications = notifications.filter((notif) => {
    const notifTime = new Date(notif.createdAt).getTime()
    return now - notifTime <= BATCH_TIME_WINDOW_MS
  })

  const shouldBatch = recentNotifications.length >= BATCH_THRESHOLD

  return {
    shouldBatch,
    batchNotifications: shouldBatch ? recentNotifications : [],
  }
}

/**
 * Generate initials from name for avatar fallback
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}
