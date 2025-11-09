'use client'

import UserSettingsScreen from '@features/user-settings/screens/user-settings-screen'
import { UserPreferencesComponent } from '@features/user-settings/components/user-preferences'
import { MOCK_USER_PREFERENCES } from '@/mocks'

export default function PreferencesPage() {
  return (
    <UserSettingsScreen>
      <UserPreferencesComponent initialPreferences={MOCK_USER_PREFERENCES} />
    </UserSettingsScreen>
  )
}
