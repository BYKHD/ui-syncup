'use client'

import PreferencesScreen from './setting-preferences-screen'

// This screen now renders only the Preferences content.
// The shared sidebar is provided by `src/app/(protected)/settings/layout.tsx`.
export default function UserSettingsScreen() {
  return <PreferencesScreen />
}
