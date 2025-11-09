'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@components/ui/card'
import { Switch } from '@components/ui/switch'
import { Label } from '@components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'
import { useUserPreferences } from '../hooks/use-user-preferences'
import type { UserPreferences } from '../types'

interface UserPreferencesComponentProps {
  initialPreferences: UserPreferences
}

export function UserPreferencesComponent({
  initialPreferences,
}: UserPreferencesComponentProps) {
  const { preferences, isPending, updatePreference } = useUserPreferences({
    initialPreferences,
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize how the application looks and feels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select
              value={preferences.theme}
              onValueChange={(value: UserPreferences['theme']) =>
                updatePreference('theme', value)
              }
              disabled={isPending}
            >
              <SelectTrigger id="theme" className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose your preferred color scheme
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="compact-mode">Compact mode</Label>
              <p className="text-sm text-muted-foreground">
                Reduce spacing and size of UI elements
              </p>
            </div>
            <Switch
              id="compact-mode"
              checked={preferences.compactMode}
              onCheckedChange={(checked) =>
                updatePreference('compactMode', checked)
              }
              disabled={isPending}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email digest</CardTitle>
          <CardDescription>
            Control how often you receive email summaries
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-digest">Frequency</Label>
            <Select
              value={preferences.emailDigest}
              onValueChange={(value: UserPreferences['emailDigest']) =>
                updatePreference('emailDigest', value)
              }
              disabled={isPending}
            >
              <SelectTrigger id="email-digest" className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Get a summary of your activity and updates
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sound</CardTitle>
          <CardDescription>
            Manage audio notifications and sounds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sound-enabled">Enable sounds</Label>
              <p className="text-sm text-muted-foreground">
                Play sounds for notifications and actions
              </p>
            </div>
            <Switch
              id="sound-enabled"
              checked={preferences.soundEnabled}
              onCheckedChange={(checked) =>
                updatePreference('soundEnabled', checked)
              }
              disabled={isPending}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
