'use client'

import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { RiBellLine } from '@remixicon/react'

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_NOTIFICATION_COUNT = 3

// ============================================================================
// NOTIFICATION PANEL COMPONENT (MOCKUP)
// ============================================================================

/**
 * NotificationPanel - Mockup notification bell with badge
 *
 * This is a mockup component for UI prototyping.
 * No real notification data or hooks - just static display.
 */
export function NotificationPanel() {
  const handleClick = () => {
    console.log('Notifications clicked - mockup only')
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="relative"
      onClick={handleClick}
      aria-label="View notifications"
    >
      <RiBellLine className="size-4" />
      {MOCK_NOTIFICATION_COUNT > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 size-5 flex items-center justify-center p-0 text-[10px]"
        >
          {MOCK_NOTIFICATION_COUNT}
        </Badge>
      )}
    </Button>
  )
}

export default NotificationPanel
