import OtherSettingsScreen from '@features/user-settings/screens/other-settings-screen'
import { MOCK_USER_PROFILE } from '@/mocks/user-settings.fixtures'

export default function OtherPage() {
  // Server component - thin page that renders feature screen
  // Layout provides UserSettingsScreen wrapper with sidebar and shared structure

  return <OtherSettingsScreen userProfile={MOCK_USER_PROFILE} />
}
