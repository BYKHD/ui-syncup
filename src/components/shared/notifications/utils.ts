// ============================================================================
// UTILITY FUNCTIONS FOR NOTIFICATIONS
// ============================================================================

import {
  RiAtLine,
  RiChat1Line,
  RiReplyLine,
  RiUserAddLine,
  RiExchangeLine,
  RiMailLine,
  RiTeamLine,
  RiShieldUserLine,
} from '@remixicon/react'
import type { NotificationType } from '@/features/notifications/api'
import type { ComponentType } from 'react'

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
 * Get icon component for notification type
 */
export function getNotificationIcon(
  type: NotificationType
): ComponentType<{ className?: string }> | null {
  switch (type) {
    case 'mention':
      return RiAtLine
    case 'comment_created':
      return RiChat1Line
    case 'reply':
      return RiReplyLine
    case 'issue_assigned':
      return RiUserAddLine
    case 'issue_status_changed':
      return RiExchangeLine
    case 'project_invitation':
      return RiMailLine
    case 'team_invitation':
      return RiTeamLine
    case 'role_updated':
      return RiShieldUserLine
    default:
      return null
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
