import { AppHeaderConfigurator, type BreadcrumbItem } from '@/components/layout/headers'
import PreferencesScreen from '@/features/user-settings/screens/setting-preferences-screen'
import { getLandingView } from '@/server/preferences/landing-view'

const PREFERENCES_BREADCRUMBS: BreadcrumbItem[] = [
  { label: 'Settings', href: '/settings' },
  { label: 'Preferences' },
]

export default async function PreferencesPage() {
  const landingView = await getLandingView()
  return (
    <>
      <AppHeaderConfigurator
        pageName="Preferences"
        breadcrumbs={PREFERENCES_BREADCRUMBS}
      />
      <PreferencesScreen initialLandingView={landingView} />
    </>
  )
}
