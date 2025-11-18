'use client'

import { UserPreferencesComponent } from '../components/user-preferences'
import type { UserPreferences } from '../types'

interface PreferencesScreenProps {
  initialPreferences: UserPreferences
}

export default function PreferencesScreen({
  initialPreferences,
}: PreferencesScreenProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Preferences</h2>
        <p className="text-muted-foreground mt-1">
          Customize your experience
        </p>
      </div>
      <UserPreferencesComponent initialPreferences={initialPreferences} />
    </div>
  )
}
