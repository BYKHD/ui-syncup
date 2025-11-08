'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Badge } from '@components/ui/badge'
import type { Notification } from './mock-data'

// ============================================================================
// NOTIFICATION BATCH CARD COMPONENT (MOCKUP UI)
// ============================================================================

interface NotificationBatchCardProps {
  notifications: Notification[]
}

/**
 * NotificationBatchCard - Summary card shown when many notifications arrive at once
 *
 * Already mockup-ready - just displays a summary of notification types.
 */
export function NotificationBatchCard({ notifications }: NotificationBatchCardProps) {
  const summary = useMemo(() => {
    const groups = new Map<string, number>()
    notifications.forEach((notification) => {
      const key = notification.type
      groups.set(key, (groups.get(key) ?? 0) + 1)
    })

    return Array.from(groups.entries()).map(([type, count]) => ({ type, count }))
  }, [notifications])

  return (
    <Card className="mb-3 border-dashed bg-muted/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Busy day!</CardTitle>
        <CardDescription className="text-xs">
          {notifications.length} new updates arrived together. Highlights below.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {summary.map((item) => (
          <Badge key={item.type} variant="secondary" className="capitalize">
            {item.type.replace(/_/g, ' ')} · {item.count}
          </Badge>
        ))}
      </CardContent>
    </Card>
  )
}
