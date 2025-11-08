'use client';

import { useState, useTransition } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Switch } from '@/src/components/ui/switch';
import { Button } from '@/src/components/ui/button';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Alert, AlertDescription } from '@/src/components/ui/alert';
import { useTeam } from '@/src/hooks/use-team';
import { fetcher } from '@/src/lib/utils';
import {
  EMAIL_GATE_ENABLED,
  type NotificationPreference,
} from '@/features/team-settings';

export default function NotificationPreferencesPage() {
  const { currentTeam } = useTeam();
  const [isPending, startTransition] = useTransition();
  const [localPrefs, setLocalPrefs] = useState<Record<string, NotificationPreference> | null>(null);

  const teamId = currentTeam?.id ?? null;

  const { data, error, isLoading, mutate } = useSWR(
    teamId ? `/api/v1/notifications/preferences?teamId=${teamId}` : null,
    fetcher,
    {
      onSuccess: (result) => {
        const map = Object.fromEntries(
          result.preferences.map((pref: NotificationPreference) => [pref.type, pref])
        );
        setLocalPrefs(map);
      },
    }
  );

  const preferences: NotificationPreference[] = localPrefs
    ? Object.values(localPrefs)
    : data?.preferences ?? [];

  const handleToggle = (
    pref: NotificationPreference,
    key: 'enabled' | 'emailEnabled',
    value: boolean
  ) => {
    if (!teamId || !localPrefs) return;

    const updated = {
      ...localPrefs,
      [pref.type]: {
        ...pref,
        [key]: value,
      },
    };

    setLocalPrefs(updated);

    startTransition(async () => {
      try {
        await fetch('/api/v1/notifications/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamId,
            preferences: Object.values(updated).map((item: NotificationPreference) => ({
              type: item.type,
              enabled: item.enabled,
              emailEnabled: item.emailEnabled,
            })),
          }),
        });
        await mutate();
        toast.success('Notification preferences updated');
      } catch (err) {
        console.error('Failed to update notification preferences', err);
        toast.error('Failed to update preferences');
        mutate();
      }
    });
  };

  if (!teamId) {
    return (
      <Alert>
        <AlertDescription>Select a team to manage notification settings.</AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load notification preferences.</AlertDescription>
      </Alert>
    );
  }

  if (isLoading || !preferences.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email notifications</CardTitle>
          <CardDescription>Loading notification preferences…</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification channels</CardTitle>
          <CardDescription>
            Control which in-app and email notifications you receive for this team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {preferences.map((pref) => (
            <div key={pref.type} className="space-y-3 rounded-lg border p-4" role="group" aria-label={`${pref.type} preferences`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium capitalize">{pref.type.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-muted-foreground">
                    Toggle in-app and email channels for this notification type.
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      In-app
                    </span>
                    <Switch
                      checked={pref.enabled}
                      disabled={isPending}
                      onCheckedChange={(checked) =>
                        handleToggle(pref, 'enabled', checked)
                      }
                      aria-label={`Toggle in-app notifications for ${pref.type}`}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      Email
                    </span>
                    <Switch
                      checked={pref.emailEnabled && EMAIL_GATE_ENABLED}
                      disabled={isPending || !EMAIL_GATE_ENABLED}
                      onCheckedChange={(checked) =>
                        handleToggle(pref, 'emailEnabled', checked)
                      }
                      aria-label={`Toggle email notifications for ${pref.type}`}
                    />
                  </div>
                </div>
              </div>
              {!EMAIL_GATE_ENABLED && (
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
          Use the unsubscribe link in any notification email to immediately stop emails for that notification type.
        </AlertDescription>
      </Alert>

      <Button
        variant="outline"
        size="sm"
        onClick={() => mutate()}
        disabled={isPending}
      >
        Refresh preferences
      </Button>
    </div>
  );
}
