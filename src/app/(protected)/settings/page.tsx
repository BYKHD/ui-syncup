import { AppHeaderConfigurator, type BreadcrumbItem } from '@/components/layout/headers'
import PreferencesScreen from '@/features/user-settings/screens/setting-preferences-screen'
import { getLandingView } from '@/server/preferences/landing-view'

const SETTINGS_BREADCRUMBS: BreadcrumbItem[] = [
  { label: 'Settings' },
]

export default async function SettingsPage() {
  const landingView = await getLandingView()

  return (
    <>
      <AppHeaderConfigurator
        pageName="Settings"
        breadcrumbs={SETTINGS_BREADCRUMBS}
      />
      <PreferencesScreen initialLandingView={landingView} />
    </>
  )
}
