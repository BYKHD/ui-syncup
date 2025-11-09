'use client'

import { IntegrationsList } from '../components/integrations-list'
import { MOCK_INTEGRATIONS } from '@/mocks/user-settings.fixtures'

export default function IntegrationsScreen() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Integrations</h2>
        <p className="text-muted-foreground mt-1">
          Connect third-party services
        </p>
      </div>
      <IntegrationsList integrations={MOCK_INTEGRATIONS} />
    </div>
  )
}
