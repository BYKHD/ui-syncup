import { AppHeaderConfigurator, type BreadcrumbItem } from '@/components/shared/headers'
import PreferencesScreen from '@/features/user-settings/screens/setting-preferences-screen'
import { MOCK_USER_PREFERENCES } from '@/mocks/user-settings.fixtures'

const SETTINGS_PREFERENCES_BREADCRUMBS: BreadcrumbItem[] = [
  { label: 'Settings', href: '/settings' },
  { label: 'Preferences' },
]

export default function SettingsPage() {
  // Server component - thin page that delegates to feature screen
  // In a real implementation, fetch user preferences from server
  // const preferences = await getUserPreferences();

  return (
    <>
      <AppHeaderConfigurator
        pageName="Preferences"
        breadcrumbs={SETTINGS_PREFERENCES_BREADCRUMBS}
      />
      <PreferencesScreen initialPreferences={MOCK_USER_PREFERENCES} />
    </>
  )
}
