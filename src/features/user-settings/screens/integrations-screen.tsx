'use client'

import { IntegrationsList } from '../components/integrations-list'
import type { Integration } from '../types'

// Mock data - will be replaced with real API calls
const MOCK_INTEGRATIONS: Integration[] = [
  {
    id: '1',
    name: 'GitHub',
    description: 'Sync issues with GitHub repositories and pull requests',
    icon: 'github',
    connected: true,
    lastSync: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
  },
  {
    id: '2',
    name: 'Slack',
    description: 'Get notifications in Slack channels',
    icon: 'slack',
    connected: false,
  },
  {
    id: '3',
    name: 'Linear',
    description: 'Import and sync issues from Linear',
    icon: 'linear',
    connected: true,
    lastSync: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
  {
    id: '4',
    name: 'Figma',
    description: 'Attach Figma designs to issues',
    icon: 'figma',
    connected: false,
  },
]

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
