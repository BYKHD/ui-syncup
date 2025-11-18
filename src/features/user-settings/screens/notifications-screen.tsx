'use client'

import { NotificationPreferences } from '../components/notification-preferences'
import type { NotificationPreference } from '../types'

interface NotificationsScreenProps {
  initialPreferences: NotificationPreference[]
  emailEnabled?: boolean
}

export default function NotificationsScreen({
  initialPreferences,
  emailEnabled = true,
}: NotificationsScreenProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Notifications</h2>
        <p className="text-muted-foreground mt-1">
          Manage your notification preferences
        </p>
      </div>
      <NotificationPreferences
        initialPreferences={initialPreferences}
        emailEnabled={emailEnabled}
      />
    </div>
  )
}
