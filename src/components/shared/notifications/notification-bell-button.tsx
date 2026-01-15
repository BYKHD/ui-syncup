'use client'

import { useState } from 'react'
import { RiNotification2Line } from '@remixicon/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationDropdown } from './notification-dropdown'
import { useUnreadCount } from '@/features/notifications/hooks'
import { cn } from '@/lib/utils'

// ============================================================================
// NOTIFICATION BELL COMPONENT
// ============================================================================

interface NotificationBellProps {
  teamId: string | null
  className?: string
  /** Whether Realtime is connected (disables polling when true) */
  realtimeConnected?: boolean
}

/**
 * NotificationBell - Bell icon with unread count badge
 *
 * Displays unread notification count and opens dropdown on click.
 * Uses useUnreadCount hook with polling fallback for real-time updates.
 * Polling is disabled when Supabase Realtime is connected.
 */
export function NotificationBell({ 
  teamId, 
  className = '',
  realtimeConnected = false,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Fetch unread count with polling fallback (30s interval when dropdown is closed)
  // Disable polling when Realtime is connected
  const { count: unreadCount, isLoading } = useUnreadCount({
    enabled: !!teamId,
    refetchInterval: realtimeConnected || isOpen ? false : 30000, // Poll every 30s when closed and no Realtime
  })

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn('relative', className)}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <RiNotification2Line className="h-5 w-5" />
          {!isLoading && unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-[90vw] max-w-[380px] sm:w-[380px] p-0"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <NotificationDropdown teamId={teamId} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
