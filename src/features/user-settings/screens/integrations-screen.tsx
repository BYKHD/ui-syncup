'use client'

import { IntegrationsList } from '../components/integrations-list'
import type { Integration } from '../types'

interface IntegrationsScreenProps {
  integrations: Integration[]
}

export default function IntegrationsScreen({
  integrations,
}: IntegrationsScreenProps) {
  // TODO: [MOCKUP] Wire this component up to the actual API endpoint for user settings
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Integrations</h2>
        <p className="text-muted-foreground mt-1">
          Connect third-party services
        </p>
      </div>
      <IntegrationsList integrations={integrations} />
    </div>
  )
}
