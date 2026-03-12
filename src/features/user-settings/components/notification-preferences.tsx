'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useNotificationPreferences } from '../hooks/use-notification-preferences'
import type { NotificationPreference } from '../types'

interface NotificationPreferencesProps {
  initialPreferences: NotificationPreference[]
  emailEnabled?: boolean
}

export function NotificationPreferences({
  initialPreferences,
  emailEnabled = true,
}: NotificationPreferencesProps) {
  const { preferences, isPending, handleToggle, handleRefresh } =
    useNotificationPreferences({
      initialPreferences,
    })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification channels</CardTitle>
          <CardDescription>
            Control which in-app and email notifications you receive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {preferences.map((pref) => (
            <div
              key={pref.id}
              className="space-y-3 rounded-lg border p-4"
              role="group"
              aria-label={`${pref.type} preferences`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium">{pref.label}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {pref.description}
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      In-app
                    </span>
                    <Switch
                      checked={pref.inApp}
                      disabled={isPending}
                      onCheckedChange={(checked) =>
                        handleToggle(pref.id, 'inApp', checked)
                      }
                      aria-label={`Toggle in-app notifications for ${pref.type}`}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      Email
                    </span>
                    <Switch
                      checked={pref.email && emailEnabled}
                      disabled={isPending || !emailEnabled}
                      onCheckedChange={(checked) =>
                        handleToggle(pref.id, 'email', checked)
                      }
                      aria-label={`Toggle email notifications for ${pref.type}`}
                    />
                  </div>
                </div>
              </div>
              {!emailEnabled && (
                <Alert>
                  <AlertDescription>
                    Email notifications are disabled for this environment.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Alert>
        <AlertDescription>
          Use the unsubscribe link in any notification email to immediately stop
          emails for that notification type.
        </AlertDescription>
      </Alert>

      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={isPending}
      >
        Refresh preferences
      </Button>
    </div>
  )
}
