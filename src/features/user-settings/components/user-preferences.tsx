'use client'

import { useEffect, useState, useTransition } from 'react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { setLandingView } from '../actions/set-landing-view'
import type { LandingView } from '@/server/preferences/landing-view'

interface UserPreferencesComponentProps {
  initialLandingView: LandingView
}

export function UserPreferencesComponent({
  initialLandingView,
}: UserPreferencesComponentProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [landingView, setLandingViewState] =
    useState<LandingView>(initialLandingView)
  const [isPending, startTransition] = useTransition()

  const handleLandingChange = (value: LandingView) => {
    if (value === landingView) return // re-selected the current view — nothing to save
    const previous = landingView
    setLandingViewState(value) // optimistic
    startTransition(async () => {
      const result = await setLandingView(value)
      if (result.success) {
        toast.success('Preferences updated')
      } else {
        setLandingViewState(previous) // revert
        toast.error('Failed to update preferences')
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize how the application looks and feels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select
              value={mounted ? theme : undefined}
              onValueChange={setTheme}
              disabled={!mounted}
            >
              <SelectTrigger id="theme" className="w-full sm:w-64">
                <SelectValue placeholder="System" />
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Startup</CardTitle>
          <CardDescription>Choose where you land after signing in</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="landing-view">Default view</Label>
            <Select
              value={landingView}
              onValueChange={handleLandingChange}
              disabled={isPending}
            >
              <SelectTrigger id="landing-view" className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dashboard">Dashboard</SelectItem>
                <SelectItem value="projects">Projects</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              The page you see first when you open the app
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
