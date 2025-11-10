'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { NotificationItem } from './notification-item'
import { NotificationLoadMore } from './notification-load-more'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { MOCK_NOTIFICATIONS } from '@/mocks'

// ============================================================================
// NOTIFICATION DROPDOWN COMPONENT (MOCKUP UI)
// ============================================================================

interface NotificationDropdownProps {
  teamId: string | null
}

/**
 * NotificationDropdown - Dropdown panel showing notification list
 *
 * Mockup version using MOCK_NOTIFICATIONS instead of data-fetching hooks.
 * Removed real-time updates, network status checks, and API calls.
 */
export function NotificationDropdown({ teamId }: NotificationDropdownProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showNewIndicator] = useState(false)
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS)

  const visibleNotifications = notifications

  const handleLoadMore = () => {
    console.log('Load more notifications (mockup - no more data)')
    toast.info('No more notifications to load')
  }

  const handleClearAll = () => {
    console.log('Clear all notifications (mockup)')
    setNotifications([])
    toast.success('All notifications cleared')
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
      <div className="border-b p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="font-semibold">Notifications</h3>
          </div>
          <div className="flex items-center gap-2">
            {showNewIndicator && visibleNotifications.length > 0 && (
              <Badge variant="secondary" className="animate-in fade-in zoom-in">
                New notifications
              </Badge>
            )}
            {visibleNotifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearAll}>
                Clear all
              </Button>
            )}
          </div>
        </div>
      </div>
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
        role="list"
      >
        {visibleNotifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          visibleNotifications.map((notification, index) => (
            <div key={notification.id}>
              <NotificationItem notification={notification} teamId={teamId} />
              {index < visibleNotifications.length - 1 && <Separator />}
            </div>
          ))
        )}
      </div>
      <NotificationLoadMore
        hasMore={false}
        isLoading={false}
        onLoadMore={handleLoadMore}
        disabled={false}
      />
    </div>
  )
}
