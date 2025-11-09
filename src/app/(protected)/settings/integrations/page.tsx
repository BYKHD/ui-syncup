import IntegrationsScreen from '@features/user-settings/screens/integrations-screen'
import { MOCK_INTEGRATIONS } from '@/mocks/user-settings.fixtures'

export default function IntegrationsPage() {
  // Server component - thin page that renders feature screen
  // Layout provides UserSettingsScreen wrapper with sidebar and shared structure

  return <IntegrationsScreen integrations={MOCK_INTEGRATIONS} />
}
