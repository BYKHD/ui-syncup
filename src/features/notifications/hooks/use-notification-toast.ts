/**
 * USE NOTIFICATION TOAST HOOK
 * Listens for new notification events and triggers Sonner toast
 */

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { notificationKeys } from './use-notifications'
import type { Notification } from '../api'

// ============================================================================
// TYPES
// ============================================================================

export interface UseNotificationToastOptions {
  /** Whether to show toasts for new notifications */
  enabled?: boolean
  /** Custom toast duration in milliseconds */
  duration?: number
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook that shows toast notifications when new notifications arrive
 *
 * Listens to query cache updates and shows a toast for new notifications.
 * Works with both Realtime subscription and polling updates.
 *
 * @example
 * // In your app layout or notification provider
 * useNotificationToast({ enabled: true })
 */
export function useNotificationToast({
  enabled = true,
  duration = 5000,
}: UseNotificationToastOptions = {}) {
  const queryClient = useQueryClient()
  const previousNotificationIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!enabled) return

    // Subscribe to query cache changes for notifications
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      // Only handle successful updates to the notifications list
      if (
        event.type === 'updated' &&
        event.action.type === 'success' &&
        event.query.queryKey[0] === 'notifications' &&
        event.query.queryKey[1] === 'list'
      ) {
        const data = event.query.state.data as { notifications?: Notification[] } | undefined
        if (!data?.notifications) return

        // Find new notifications (not in previous set)
        const currentIds = new Set(data.notifications.map((n) => n.id))
        const newNotifications = data.notifications.filter(
          (n) => !previousNotificationIds.current.has(n.id) && !n.readAt
        )

        // Show toast for each new notification (limit to 3 to avoid spam)
        newNotifications.slice(0, 3).forEach((notification) => {
          showNotificationToast(notification, duration)
        })

        // If more than 3 new notifications, show a summary
        if (newNotifications.length > 3) {
          toast.info(`${newNotifications.length - 3} more new notifications`, {
            duration,
          })
        }

        // Update previous IDs
        previousNotificationIds.current = currentIds
      }
    })

    return () => {
      unsubscribe()
    }
  }, [enabled, duration, queryClient])
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Show a toast for a notification
 */
function showNotificationToast(notification: Notification, duration: number) {
  const message = getToastMessage(notification)
  const actorName = notification.metadata.actor_name || 'Someone'
  const isInvitation = 
    notification.type === 'project_invitation' || 
    notification.type === 'team_invitation'

  // For invitation notifications, show simple toast (Accept handled in notification panel)
  // This avoids redundant toasts and 404 redirects
  if (isInvitation) {
    toast(message, {
      description: actorName,
      duration,
    })
    return
  }

  // For other notifications, show View action
  toast(message, {
    description: actorName,
    duration,
    action: notification.metadata.target_url
      ? {
          label: 'View',
          onClick: () => {
            window.location.href = notification.metadata.target_url
          },
        }
      : undefined,
  })
}

/**
 * Get toast message based on notification type
 */
function getToastMessage(notification: Notification): string {
  const { type, metadata } = notification

  switch (type) {
    case 'mention':
      return `You were mentioned${metadata.issue_key ? ` in ${metadata.issue_key}` : ''}`

    case 'comment_created':
      return `New comment on ${metadata.issue_key || 'an issue'}`

    case 'reply':
      return `New reply to your comment`

    case 'issue_assigned':
      return `You were assigned to ${metadata.issue_key || 'an issue'}`

    case 'issue_status_changed':
      return `${metadata.issue_key || 'Issue'} status changed${metadata.new_status ? ` to ${metadata.new_status}` : ''}`

    case 'project_invitation':
      return `You were invited to ${metadata.project_name || 'a project'}`

    case 'team_invitation':
      return `You were invited to ${metadata.team_name || 'a team'}`

    case 'role_updated':
      return `Your role was updated${metadata.new_role ? ` to ${metadata.new_role}` : ''}`

    default:
      return 'New notification'
  }
}
