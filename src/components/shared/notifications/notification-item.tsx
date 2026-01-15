'use client'

import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { NotificationActions } from './notification-actions'
import { formatTimestamp, NotificationIcon } from './utils'
import { useMarkAsRead } from '@/features/notifications/hooks'
import type { Notification } from '@/features/notifications/api'

// ============================================================================
// NOTIFICATION ITEM COMPONENT
// ============================================================================

interface NotificationItemProps {
  notification: Notification
  teamId: string | null
}

/**
 * NotificationItem - Single notification in the list
 *
 * Features:
 * - Polymorphic rendering based on notification type
 * - Deep-link navigation on click with scroll-to-comment
 * - Visual distinction for read/unread state
 * - Inline actions for invitation types
 */
export function NotificationItem({ notification, teamId }: NotificationItemProps) {
  const router = useRouter()
  const { mutate: markAsRead } = useMarkAsRead()

  const handleClick = () => {
    // Don't navigate or mark as read for invitation notifications
    // User must accept/decline first (handled by NotificationActions)
    const isInvitationType = 
      notification.type === 'project_invitation' || 
      notification.type === 'team_invitation'
    if (isInvitationType) {
      return
    }

    // Mark as read if unread (non-invitation types only)
    if (!notification.readAt) {
      markAsRead(notification.id)
    }

    // Navigate to target URL for other notification types
    if (notification.metadata.target_url) {
      router.push(notification.metadata.target_url)
    }
  }

  const actorName = notification.metadata.actor_name || 'Someone'
  const message = getNotificationMessage(notification)
  const timestamp = formatTimestamp(notification.createdAt)
  const isInvitation = notification.type === 'project_invitation' || notification.type === 'team_invitation'

  return (
    <div
      className={cn(
        'p-4 hover:bg-muted/50 cursor-pointer relative group transition-colors min-h-[56px]',
        !notification.readAt && 'bg-blue-50/50 dark:bg-blue-950/20'
      )}
      role="listitem"
      aria-label={`Notification from ${actorName}`}
      onClick={handleClick}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar className="h-10 w-10 flex-shrink-0">
          {notification.metadata.actor_avatar_url && (
            <AvatarImage 
              src={notification.metadata.actor_avatar_url} 
              alt={actorName} 
            />
          )}
          <AvatarFallback className={cn('text-white', getAvatarColor(notification.actorId || 'default'))}>
            {getInitials(actorName)}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <NotificationIcon 
              type={notification.type}
              className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" 
            />
            <p className="text-sm text-foreground line-clamp-2 flex-1">
              {message}
            </p>
          </div>
          
          <p className="text-xs text-muted-foreground mt-1">
            {timestamp}
          </p>

          {/* Invitation Actions */}
          {isInvitation && (
            <NotificationActions notification={notification} teamId={teamId} />
          )}
        </div>
      </div>

      {/* Unread indicator */}
      {!notification.readAt && (
        <div 
          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500" 
          aria-label="Unread"
        />
      )}
    </div>
  )
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get notification message text based on type and metadata
 */
function getNotificationMessage(notification: Notification): string {
  const { type, metadata } = notification
  const actor = metadata.actor_name || 'Someone'

  switch (type) {
    case 'mention':
      return `${actor} mentioned you${metadata.issue_key ? ` in ${metadata.issue_key}` : ''}`

    case 'comment_created':
      return `${actor} commented on ${metadata.issue_key || 'an issue'}${metadata.comment_preview ? `: "${metadata.comment_preview}"` : ''}`

    case 'reply':
      return `${actor} replied to your comment${metadata.issue_key ? ` on ${metadata.issue_key}` : ''}`

    case 'issue_assigned':
      return `${actor} assigned you to ${metadata.issue_key || 'an issue'}${metadata.issue_title ? `: ${metadata.issue_title}` : ''}`

    case 'issue_status_changed':
      return `${actor} changed ${metadata.issue_key || 'issue'} status${metadata.new_status ? ` to ${metadata.new_status}` : ''}`

    case 'project_invitation':
      return `${actor} invited you to join ${metadata.project_name || 'a project'}`

    case 'team_invitation':
      return `${actor} invited you to join ${metadata.team_name || 'a team'}`

    case 'role_updated':
      return `Your role was updated${metadata.new_role ? ` to ${metadata.new_role}` : ''}${metadata.project_name ? ` in ${metadata.project_name}` : ''}`

    default:
      return `${actor} sent you a notification`
  }
}

/**
 * Get avatar color based on user ID
 */
function getAvatarColor(userId: string): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-rose-500',
  ]
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

/**
 * Get initials from name for avatar fallback
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}
