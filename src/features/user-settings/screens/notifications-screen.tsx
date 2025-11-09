'use client'

import { NotificationPreferences } from '../components/notification-preferences'
import type { NotificationPreference } from '../types'

// Mock data - will be replaced with real API calls
const MOCK_NOTIFICATION_PREFERENCES: NotificationPreference[] = [
  {
    id: '1',
    type: 'issues',
    label: 'Issue activity',
    description: 'Updates on issues you created or are assigned to',
    inApp: true,
    email: true,
  },
  {
    id: '2',
    type: 'mentions',
    label: 'Mentions',
    description: 'When someone mentions you in a comment or description',
    inApp: true,
    email: false,
  },
  {
    id: '3',
    type: 'updates',
    label: 'Product updates',
    description: 'News, feature announcements, and product updates',
    inApp: false,
    email: true,
  },
  {
    id: '4',
    type: 'security',
    label: 'Security alerts',
    description: 'Important security notifications and account activity',
    inApp: true,
    email: true,
  },
]

export default function NotificationsScreen() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Notifications</h2>
        <p className="text-muted-foreground mt-1">
          Manage your notification preferences
        </p>
      </div>
      <NotificationPreferences
        initialPreferences={MOCK_NOTIFICATION_PREFERENCES}
        emailEnabled={true}
      />
    </div>
  )
}
