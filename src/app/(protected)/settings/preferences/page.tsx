import { AppHeaderConfigurator, type BreadcrumbItem } from '@/components/shared/headers'
import PreferencesScreen from '@/features/user-settings/screens/setting-preferences-screen'
import { MOCK_USER_PREFERENCES } from '@/mocks/user-settings.fixtures'

const PREFERENCES_BREADCRUMBS: BreadcrumbItem[] = [
  { label: 'Settings', href: '/settings' },
  { label: 'Preferences' },
]

export default function PreferencesPage() {
  // Server component - thin page that renders feature screen
  // Layout provides UserSettingsScreen wrapper with sidebar and shared structure

  return (
    <>
      <AppHeaderConfigurator
        pageName="Preferences"
        breadcrumbs={PREFERENCES_BREADCRUMBS}
      />
      <PreferencesScreen initialPreferences={MOCK_USER_PREFERENCES} />
    </>
  )
}
