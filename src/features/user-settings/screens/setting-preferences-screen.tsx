'use client'

import { UserPreferencesComponent } from '../components/user-preferences'
import type { LandingView } from '@/server/preferences/landing-view'

interface PreferencesScreenProps {
  initialLandingView: LandingView
}

export default function PreferencesScreen({
  initialLandingView,
}: PreferencesScreenProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Preferences</h2>
        <p className="text-muted-foreground mt-1">Customize your experience</p>
      </div>
      <UserPreferencesComponent initialLandingView={initialLandingView} />
    </div>
  )
}
