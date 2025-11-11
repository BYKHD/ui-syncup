import { AppHeaderConfigurator, type BreadcrumbItem } from '@/components/shared/headers'
import NotificationsScreen from '@/features/user-settings/screens/notifications-screen'
import { MOCK_NOTIFICATION_PREFERENCES } from '@/mocks/user-settings.fixtures'

const NOTIFICATIONS_BREADCRUMBS: BreadcrumbItem[] = [
  { label: 'Settings', href: '/settings' },
  { label: 'Notifications' },
]

export default function NotificationsPage() {
  // Server component - thin page that renders feature screen
  // Layout provides UserSettingsScreen wrapper with sidebar and shared structure

  return (
    <>
      <AppHeaderConfigurator
        pageName="Notifications"
        breadcrumbs={NOTIFICATIONS_BREADCRUMBS}
      />
      <NotificationsScreen
        initialPreferences={MOCK_NOTIFICATION_PREFERENCES}
        emailEnabled={true}
      />
    </>
  )
}
