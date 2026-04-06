'use client'

import { OtherSettings } from '../components/other-settings'
import type { UserProfile } from '../types'

interface OtherSettingsScreenProps {
  userProfile: UserProfile
}

export default function OtherSettingsScreen({
  userProfile,
}: OtherSettingsScreenProps) {
  // TODO: [MOCKUP] Wire this component up to the actual API endpoint for user settings
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Other Settings</h2>
        <p className="text-muted-foreground mt-1">
          Advanced settings and account management
        </p>
      </div>
      <OtherSettings userProfile={userProfile} />
    </div>
  )
}
