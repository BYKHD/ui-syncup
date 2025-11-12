import { AppHeaderConfigurator, type BreadcrumbItem } from '@/components/shared/headers'
import IntegrationsScreen from '@/features/user-settings/screens/integrations-screen'
import { MOCK_INTEGRATIONS } from '@/mocks/user-settings.fixtures'

const INTEGRATIONS_BREADCRUMBS: BreadcrumbItem[] = [
  { label: 'Settings', href: '/settings' },
  { label: 'Integrations' },
]

export default function IntegrationsPage() {
  // Server component - thin page that renders feature screen
  // Layout provides UserSettingsScreen wrapper with sidebar and shared structure

  return (
    <>
      <AppHeaderConfigurator
        pageName="Integrations"
        breadcrumbs={INTEGRATIONS_BREADCRUMBS}
      />
      <IntegrationsScreen integrations={MOCK_INTEGRATIONS} />
    </>
  )
}
