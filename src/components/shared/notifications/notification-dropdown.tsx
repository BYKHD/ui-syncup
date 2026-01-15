'use client'

import { useRef, useMemo } from 'react'
import { NotificationItem } from './notification-item'
import { NotificationGroupItem } from './notification-group-item'
import { NotificationLoadMore } from './notification-load-more'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotifications, useMarkAllAsRead } from '@/features/notifications/hooks'
import { groupNotifications } from '@/features/notifications/utils/group-notifications'

// ============================================================================
// NOTIFICATION DROPDOWN COMPONENT
// ============================================================================

interface NotificationDropdownProps {
  teamId: string | null
}

/**
 * NotificationDropdown - Dropdown panel showing notification list
 *
 * Features:
 * - Paginated notification list with load more
 * - Client-side grouping of similar notifications
 * - Mark all as read functionality
 * - Loading and empty states
 */
export function NotificationDropdown({ teamId }: NotificationDropdownProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  // Fetch notifications
  const { 
    data, 
    isLoading, 
    isFetching,
    hasNextPage, 
    fetchNextPage 
  } = useNotifications({
    limit: 20,
    enabled: !!teamId,
  })

  // Mark all as read mutation
  const { mutate: markAllAsRead, isPending: isMarkingAllRead } = useMarkAllAsRead()

  // Group notifications for display
  const groupedNotifications = useMemo(() => {
    if (!data?.notifications) return []
    return groupNotifications(data.notifications)
  }, [data?.notifications])

  const handleLoadMore = () => {
    if (!isFetching && hasNextPage) {
      fetchNextPage()
    }
  }

  const handleMarkAllAsRead = () => {
    if (!isMarkingAllRead && data?.totalUnread && data.totalUnread > 0) {
      markAllAsRead()
    }
  }

  if (!teamId) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Select a team to view notifications
      </div>
    )
  }

  return (
    <div className="flex flex-col max-h-[min(80vh,500px)] sm:max-h-[500px] min-h-[320px]">
      {/* Header */}
      <div className="border-b p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="font-semibold">Notifications</h3>
            {data?.totalUnread !== undefined && data.totalUnread > 0 && (
              <span className="text-xs text-muted-foreground">
                {data.totalUnread} unread
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {data?.totalUnread !== undefined && data.totalUnread > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAllRead}
              >
                {isMarkingAllRead ? 'Marking...' : 'Mark all read'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Notification List */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
        role="list"
        aria-label="Notifications"
      >
        {isLoading ? (
          <NotificationListSkeleton />
        ) : groupedNotifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          groupedNotifications.map((group, index) => (
            <div key={group.key}>
              {group.notifications.length > 1 ? (
                <NotificationGroupItem group={group} teamId={teamId} />
              ) : (
                <NotificationItem 
                  notification={group.latest} 
                  teamId={teamId} 
                />
              )}
              {index < groupedNotifications.length - 1 && <Separator />}
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      <NotificationLoadMore
        hasMore={hasNextPage}
        isLoading={isFetching && !isLoading}
        onLoadMore={handleLoadMore}
        disabled={isFetching}
      />
    </div>
  )
}

/**
 * Loading skeleton for notification list
 */
function NotificationListSkeleton() {
  return (
    <div className="space-y-0">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 flex gap-3">
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}
