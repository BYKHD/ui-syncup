'use client'

import { OtherSettings } from '../components/other-settings'
import type { UserProfile } from '../types'

// Mock data - will be replaced with real API calls
const MOCK_USER_PROFILE: UserProfile = {
  id: 'user_123',
  name: 'John Doe',
  email: 'john.doe@example.com',
  avatar: null,
  bio: 'Product designer and developer',
  timezone: 'America/Los_Angeles',
  language: 'en',
}

export default function OtherSettingsScreen() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Other Settings</h2>
        <p className="text-muted-foreground mt-1">
          Advanced settings and account management
        </p>
      </div>
      <OtherSettings userProfile={MOCK_USER_PROFILE} />
    </div>
  )
}
