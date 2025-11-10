import PreferencesScreen from '@/features/user-settings/screens/setting-preferences-screen'
import { MOCK_USER_PREFERENCES } from '@/mocks/user-settings.fixtures'

export default function PreferencesPage() {
  // Server component - thin page that renders feature screen
  // Layout provides UserSettingsScreen wrapper with sidebar and shared structure

  return <PreferencesScreen initialPreferences={MOCK_USER_PREFERENCES} />
}
