'use client'

import UserSettingsScreen from '@features/user-settings/screens/user-settings-screen'
import { IntegrationsList } from '@features/user-settings/components/integrations-list'
import { MOCK_INTEGRATIONS } from '@/mocks'

export default function IntegrationsPage() {
  return (
    <UserSettingsScreen>
      <IntegrationsList integrations={MOCK_INTEGRATIONS} />
    </UserSettingsScreen>
  )
}
