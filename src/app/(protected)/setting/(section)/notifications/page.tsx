'use client'

import UserSettingsScreen from '@features/user-settings/screens/user-settings-screen'
import { NotificationPreferences } from '@features/user-settings/components/notification-preferences'
import { MOCK_NOTIFICATION_PREFERENCES } from '@/mocks'

const EMAIL_ENABLED = false // Mock: Email feature gate

export default function NotificationPreferencesPage() {
  return (
    <UserSettingsScreen>
      <NotificationPreferences
        initialPreferences={MOCK_NOTIFICATION_PREFERENCES}
        emailEnabled={EMAIL_ENABLED}
      />
    </UserSettingsScreen>
  )
}
