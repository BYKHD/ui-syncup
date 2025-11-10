import NotificationsScreen from '@/features/user-settings/screens/notifications-screen'
import { MOCK_NOTIFICATION_PREFERENCES } from '@/mocks/user-settings.fixtures'

export default function NotificationsPage() {
  // Server component - thin page that renders feature screen
  // Layout provides UserSettingsScreen wrapper with sidebar and shared structure

  return (
    <NotificationsScreen
      initialPreferences={MOCK_NOTIFICATION_PREFERENCES}
      emailEnabled={true}
    />
  )
}
