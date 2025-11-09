'use client'

import { UserPreferencesComponent } from '../components/user-preferences'
import type { UserPreferences } from '../types'

// Mock data - will be replaced with real API calls
const MOCK_USER_PREFERENCES: UserPreferences = {
  theme: 'system',
  emailDigest: 'weekly',
  soundEnabled: true,
  compactMode: false,
}

export default function PreferencesScreen() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Preferences</h2>
        <p className="text-muted-foreground mt-1">
          Customize your experience
        </p>
      </div>
      <UserPreferencesComponent initialPreferences={MOCK_USER_PREFERENCES} />
    </div>
  )
}
