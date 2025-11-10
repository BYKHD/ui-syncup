import PreferencesScreen from '@/features/user-settings/screens/setting-preferences-screen'
import { MOCK_USER_PREFERENCES } from '@/mocks/user-settings.fixtures'

export default function SettingsPage() {
  // Server component - thin page that delegates to feature screen
  // In a real implementation, fetch user preferences from server
  // const preferences = await getUserPreferences();

  return <PreferencesScreen initialPreferences={MOCK_USER_PREFERENCES} />
}
