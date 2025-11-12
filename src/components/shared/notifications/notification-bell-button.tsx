'use client'

import { RiNotification2Line } from '@remixicon/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationDropdown } from './notification-dropdown'
import { MOCK_UNREAD_COUNT } from '@/mocks'

// ============================================================================
// NOTIFICATION BELL COMPONENT (MOCKUP UI)
// ============================================================================

interface NotificationBellProps {
  teamId: string | null
  className?: string
}

/**
 * NotificationBell - Bell icon with unread count badge
 *
 * Mockup version using MOCK_UNREAD_COUNT instead of data-fetching hooks.
 */
export function NotificationBell({ teamId, className = '' }: NotificationBellProps) {
  const unreadCount = MOCK_UNREAD_COUNT

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={`relative ${className}`}>
          <RiNotification2Line className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[90vw] max-w-[380px] sm:w-[380px] p-0">
        <NotificationDropdown teamId={teamId} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
