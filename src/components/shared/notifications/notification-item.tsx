'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { RiCloseLine, RiInformationLine } from '@remixicon/react'
import { formatTimestamp, getNotificationMessage } from './utils'
import type { Notification } from '@/mocks'
import { cn } from '@/lib/utils'
import { NotificationActions } from './notification-actions'

// ============================================================================
// NOTIFICATION ITEM COMPONENT (MOCKUP UI)
// ============================================================================

interface NotificationItemProps {
  notification: Notification
  teamId: string | null
}

/**
 * Get avatar color based on user ID
 */
function getMonogramColor(userId: string): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-indigo-500',
  ]
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

/**
 * Get first letter of name for avatar
 */
function getMonogramLetter(name?: string): string {
  return (name?.[0] || '?').toUpperCase()
}

/**
 * NotificationItem - Single notification in the list
 *
 * Mockup version with console.log instead of API calls.
 */
export function NotificationItem({ notification, teamId }: NotificationItemProps) {
  const [isDismissing, setIsDismissing] = useState(false)
  const metadata = (notification.metadata as Record<string, unknown> | null) ?? {}
  const projectDeleted = metadata?.projectDeleted === true

  const handleClick = () => {
    if (!notification.readAt) {
      console.log('Mark as read (mockup):', notification.id)
      // In mockup, we don't actually update the state
    }
  }

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isDismissing) return

    setIsDismissing(true)
    console.log('Dismiss notification (mockup):', notification.id)

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))

    setIsDismissing(false)
    // In mockup, we don't actually remove the notification
  }

  const actorName = notification.actorName || 'Someone'
  const message = getNotificationMessage(notification)
  const timestamp = formatTimestamp(notification.createdAt)

  return (
    <div
      className={cn(
        'p-4 hover:bg-muted/50 cursor-pointer relative group',
        !notification.readAt && 'bg-blue-50/50 dark:bg-blue-950/20'
      )}
      role="listitem"
      aria-live="polite"
      aria-label={`Notification from ${actorName}`}
      onClick={handleClick}
    >
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarFallback className={cn('text-white', getMonogramColor(notification.actorId || 'default'))}>
            {getMonogramLetter(actorName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground line-clamp-2">
            {message}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {timestamp}
          </p>
          {notification.type === 'invitation' && (
            <NotificationActions notification={notification} teamId={teamId} />
          )}
          {projectDeleted && (
            <Alert
              variant="default"
              className="mt-2 flex items-start gap-2 border-dashed bg-muted/30"
              onClick={(event) => event.stopPropagation()}
            >
              <RiInformationLine className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <AlertDescription className="text-xs text-muted-foreground">
                This project is no longer available. Actions may be limited.
              </AlertDescription>
            </Alert>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          disabled={isDismissing}
          onClick={handleDismiss}
          aria-label="Dismiss notification"
        >
          {isDismissing ? (
            <Spinner className="m-0" />
          ) : (
            <RiCloseLine className="h-4 w-4" />
          )}
        </Button>
      </div>
      {!notification.readAt && (
        <div className="absolute left-2 top-4 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500" />
      )}
    </div>
  )
}
