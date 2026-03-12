'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import type { NotificationPreference } from '../types'

interface UseNotificationPreferencesProps {
  initialPreferences: NotificationPreference[]
}

/**
 * Mock hook for managing notification preferences
 * Simulates API delay and optimistic updates for UI prototyping
 */
export function useNotificationPreferences({
  initialPreferences,
}: UseNotificationPreferencesProps) {
  const [isPending, startTransition] = useTransition()
  const [preferences, setPreferences] = useState<NotificationPreference[]>(
    initialPreferences
  )

  const handleToggle = (
    prefId: string,
    field: 'inApp' | 'email',
    value: boolean
  ) => {
    // Optimistic update
    setPreferences((prev) =>
      prev.map((pref) =>
        pref.id === prefId ? { ...pref, [field]: value } : pref
      )
    )

    // Simulate API call
    startTransition(async () => {
      try {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 300))
        toast.success('Notification preferences updated')
      } catch (err) {
        console.error('Failed to update notification preferences', err)
        toast.error('Failed to update preferences')
        // Revert optimistic update on error
        setPreferences(initialPreferences)
      }
    })
  }

  const handleRefresh = () => {
    startTransition(async () => {
      // Simulate API refresh
      await new Promise((resolve) => setTimeout(resolve, 500))
      setPreferences(initialPreferences)
      toast.success('Preferences refreshed')
    })
  }

  return {
    preferences,
    isPending,
    handleToggle,
    handleRefresh,
  }
}
