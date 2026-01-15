'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { NotificationItem } from './notification-item'
import { formatTimestamp, getNotificationIcon, getInitials } from './utils'
import { formatActorNames, type NotificationGroup } from '@/features/notifications/utils/group-notifications'
import { useMarkAsRead } from '@/features/notifications/hooks'

// ============================================================================
// NOTIFICATION GROUP ITEM COMPONENT
// ============================================================================

interface NotificationGroupItemProps {
  group: NotificationGroup
  teamId: string | null
}

/**
 * NotificationGroupItem - Collapsed view for grouped notifications
 *
 * Shows "User A and 3 others commented on Issue #123" with expandable details.
 * Clicking the main area navigates to the entity, clicking expand shows all notifications.
 */
export function NotificationGroupItem({ group, teamId }: NotificationGroupItemProps) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)
  const { mutate: markAsRead } = useMarkAsRead()

  const { latest, notifications, actorNames, hasUnread, type } = group
  const Icon = getNotificationIcon(type)
  const timestamp = formatTimestamp(latest.createdAt)
  const actorDisplay = formatActorNames(actorNames)

  const handleClick = () => {
    // Mark all unread notifications in group as read
    if (hasUnread) {
      notifications
        .filter((n) => !n.readAt)
        .forEach((n) => markAsRead(n.id))
    }

    // Navigate to target URL of latest notification
    if (latest.metadata.target_url) {
      router.push(latest.metadata.target_url)
    }
  }

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  const message = getGroupMessage(group)

  return (
    <div className="relative">
      {/* Main collapsed view */}
      <div
        className={cn(
          'p-4 hover:bg-muted/50 cursor-pointer relative group transition-colors min-h-[56px]',
          hasUnread && 'bg-blue-50/50 dark:bg-blue-950/20'
        )}
        role="listitem"
        aria-label={`${notifications.length} notifications from ${actorDisplay}`}
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
          {/* Stacked Avatars */}
          <div className="relative h-10 w-10 flex-shrink-0">
            <StackedAvatars 
              notifications={notifications.slice(0, 3)} 
              actorNames={actorNames}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              {Icon && <Icon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />}
              <p className="text-sm text-foreground line-clamp-2 flex-1">
                {message}
              </p>
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">
                {timestamp}
              </p>
              <span className="text-xs text-muted-foreground">•</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleExpandClick}
              >
                {notifications.length} notifications
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3 ml-1" />
                ) : (
                  <ChevronDown className="h-3 w-3 ml-1" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Unread indicator */}
        {hasUnread && (
          <div 
            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500" 
            aria-label="Unread"
          />
        )}
      </div>

      {/* Expanded view */}
      {isExpanded && (
        <div className="border-l-2 border-muted ml-6 bg-muted/30">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              teamId={teamId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface StackedAvatarsProps {
  notifications: NotificationGroup['notifications']
  actorNames: string[]
}

/**
 * Stacked avatars showing multiple actors
 */
function StackedAvatars({ notifications, actorNames }: StackedAvatarsProps) {
  const uniqueActors = notifications
    .filter((n, i, arr) => arr.findIndex((a) => a.actorId === n.actorId) === i)
    .slice(0, 3)

  if (uniqueActors.length === 1) {
    const notification = uniqueActors[0]
    const name = notification.metadata.actor_name || actorNames[0] || 'Someone'
    return (
      <Avatar className="h-10 w-10">
        {notification.metadata.actor_avatar_url && (
          <AvatarImage src={notification.metadata.actor_avatar_url} alt={name} />
        )}
        <AvatarFallback className={cn('text-white', getAvatarColor(notification.actorId || 'default'))}>
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
    )
  }

  return (
    <div className="relative h-10 w-10">
      {uniqueActors.slice(0, 2).map((notification, index) => {
        const name = notification.metadata.actor_name || actorNames[index] || 'Someone'
        return (
          <Avatar
            key={notification.actorId || index}
            className={cn(
              'h-7 w-7 border-2 border-background absolute',
              index === 0 ? 'top-0 left-0 z-10' : 'bottom-0 right-0'
            )}
          >
            {notification.metadata.actor_avatar_url && (
              <AvatarImage src={notification.metadata.actor_avatar_url} alt={name} />
            )}
            <AvatarFallback 
              className={cn('text-white text-xs', getAvatarColor(notification.actorId || 'default'))}
            >
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
        )
      })}
      {uniqueActors.length > 2 && (
        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium">
          +{uniqueActors.length - 2}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get group message text based on type and actors
 */
function getGroupMessage(group: NotificationGroup): string {
  const { type, actorNames, latest } = group
  const actors = formatActorNames(actorNames)
  const { metadata } = latest

  switch (type) {
    case 'mention':
      return `${actors} mentioned you${metadata.issue_key ? ` in ${metadata.issue_key}` : ''}`

    case 'comment_created':
      return `${actors} commented on ${metadata.issue_key || 'an issue'}`

    case 'reply':
      return `${actors} replied to your comment${metadata.issue_key ? ` on ${metadata.issue_key}` : ''}`

    case 'issue_assigned':
      return `${actors} assigned you to ${metadata.issue_key || 'issues'}`

    case 'issue_status_changed':
      return `${actors} changed status on ${metadata.issue_key || 'issues'}`

    case 'project_invitation':
      return `${actors} invited you to projects`

    case 'team_invitation':
      return `${actors} invited you to teams`

    case 'role_updated':
      return `Your role was updated by ${actors}`

    default:
      return `${actors} sent you notifications`
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
