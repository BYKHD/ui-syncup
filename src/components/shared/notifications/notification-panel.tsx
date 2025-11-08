'use client'

import React from 'react'
import { NotificationBell } from './notification-bell-button'
import { MOCK_TEAM_ID } from './mock-data'

// ============================================================================
// NOTIFICATION PANEL (MOCKUP UI)
// ============================================================================

/**
 * NotificationPanel - Main entry point for notifications
 *
 * This is the mockup version that uses hardcoded team ID.
 * No data-fetching hooks - just passes mock teamId to NotificationBell.
 */
interface NotificationPanelProps {
  className?: string
}

export function NotificationPanel({ className = '' }: NotificationPanelProps) {
  return <NotificationBell teamId={MOCK_TEAM_ID} className={className} />
}

export default NotificationPanel
