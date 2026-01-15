'use client'

import { NotificationBell } from './notification-bell-button'
import { useTeam } from '@/hooks/use-team'
import { useNotificationToast, useNotificationSubscription } from '@/features/notifications/hooks'
import { useSession } from '@/features/auth/hooks/use-session'

// ============================================================================
// NOTIFICATION PANEL
// ============================================================================

interface NotificationPanelProps {
  className?: string
}

/**
 * NotificationPanel - Main entry point for notifications
 *
 * Wraps NotificationBell with team context and enables:
 * - Supabase Realtime subscription for instant updates
 * - Toast notifications for new notifications
 * - Polling fallback when Realtime is unavailable
 *
 * Place this in your app header/layout.
 */
export function NotificationPanel({ className = '' }: NotificationPanelProps) {
  const { currentTeam } = useTeam()
  const { user } = useSession()
  
  // Subscribe to real-time notification updates via Supabase Realtime
  // Falls back to polling if Realtime connection fails
  const { isConnected } = useNotificationSubscription({
    userId: user?.id ?? null,
    enabled: !!user && !!currentTeam,
  })
  
  // Enable toast notifications for real-time updates
  useNotificationToast({ enabled: !!currentTeam })

  return (
    <NotificationBell 
      teamId={currentTeam?.id ?? null} 
      className={className}
      realtimeConnected={isConnected}
    />
  )
}

export default NotificationPanel
