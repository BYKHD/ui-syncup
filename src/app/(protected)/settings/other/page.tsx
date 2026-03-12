import { AppHeaderConfigurator, type BreadcrumbItem } from '@/components/shared/headers'
import OtherSettingsScreen from '@/features/user-settings/screens/other-settings-screen'
import { MOCK_USER_PROFILE } from '@/mocks/user-settings.fixtures'

const OTHER_SETTINGS_BREADCRUMBS: BreadcrumbItem[] = [
  { label: 'Settings', href: '/settings' },
  { label: 'Other Settings' },
]

export default function OtherPage() {
  // Server component - thin page that renders feature screen
  // Layout provides UserSettingsScreen wrapper with sidebar and shared structure

  return (
    <>
      <AppHeaderConfigurator
        pageName="Other Settings"
        breadcrumbs={OTHER_SETTINGS_BREADCRUMBS}
      />
      <OtherSettingsScreen userProfile={MOCK_USER_PROFILE} />
    </>
  )
}
