'use client'

import UserSettingsScreen from '@features/user-settings/screens/user-settings-screen'
import { OtherSettings } from '@features/user-settings/components/other-settings'
import { MOCK_USER_PROFILE } from '@/mocks'

export default function OtherSettingsPage() {
  return (
    <UserSettingsScreen>
      <OtherSettings userProfile={MOCK_USER_PROFILE} />
    </UserSettingsScreen>
  )
}
