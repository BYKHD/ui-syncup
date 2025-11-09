'use client'

import { useState, useTransition } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { Github, MessageSquare, Figma, ArrowUpRight } from 'lucide-react'
import { toast } from 'sonner'
import type { Integration } from '../types'

interface IntegrationsListProps {
  integrations: Integration[]
}

const iconMap = {
  github: Github,
  slack: MessageSquare,
  linear: ArrowUpRight,
  figma: Figma,
}

function formatLastSync(lastSync: string | undefined): string {
  if (!lastSync) return ''

  const date = new Date(lastSync)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

export function IntegrationsList({ integrations }: IntegrationsListProps) {
  const [isPending, startTransition] = useTransition()
  const [items, setItems] = useState(integrations)

  const handleToggle = (integrationId: string, currentStatus: boolean) => {
    // Optimistic update
    setItems((prev) =>
      prev.map((item) =>
        item.id === integrationId
          ? {
              ...item,
              connected: !currentStatus,
              lastSync: !currentStatus ? new Date().toISOString() : undefined,
            }
          : item
      )
    )

    // Simulate API call
    startTransition(async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 500))
        toast.success(
          currentStatus
            ? 'Integration disconnected'
            : 'Integration connected successfully'
        )
      } catch (err) {
        console.error('Failed to toggle integration', err)
        toast.error('Failed to update integration')
        // Revert on error
        setItems(integrations)
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Connected services</CardTitle>
          <CardDescription>
            Manage your third-party integrations and connected accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((integration) => {
            const Icon = iconMap[integration.icon as keyof typeof iconMap]

            return (
              <div
                key={integration.id}
                className="flex items-start justify-between gap-4 rounded-lg border p-4"
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="rounded-lg bg-primary/10 p-2 mt-1">
                    {Icon && <Icon className="h-5 w-5 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{integration.name}</h3>
                      {integration.connected && (
                        <Badge variant="secondary" className="text-xs">
                          Connected
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {integration.description}
                    </p>
                    {integration.connected && integration.lastSync && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Last synced {formatLastSync(integration.lastSync)}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant={integration.connected ? 'outline' : 'default'}
                  size="sm"
                  onClick={() =>
                    handleToggle(integration.id, integration.connected)
                  }
                  disabled={isPending}
                >
                  {integration.connected ? 'Disconnect' : 'Connect'}
                </Button>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Looking for more?</CardTitle>
          <CardDescription>
            We're always adding new integrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Have a suggestion for an integration?{' '}
            <Button variant="link" className="h-auto p-0">
              Let us know
            </Button>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
