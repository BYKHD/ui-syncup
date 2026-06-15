'use client'

import { OtherSettings } from '../components/other-settings'
import { MockupBanner } from '../components/mockup-banner'

export default function OtherSettingsScreen() {
  return (
    <div className="space-y-6">
      <MockupBanner />
      <div>
        <h2 className="text-xl font-semibold">Other Settings</h2>
        <p className="text-muted-foreground mt-1">
          Advanced settings and account management
        </p>
      </div>
      <OtherSettings />
    </div>
  )
}
