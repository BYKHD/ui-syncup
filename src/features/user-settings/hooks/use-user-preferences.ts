'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import type { UserPreferences } from '../types'

interface UseUserPreferencesProps {
  initialPreferences: UserPreferences
}

/**
 * Mock hook for managing user preferences
 * Simulates API delay and optimistic updates for UI prototyping
 */
export function useUserPreferences({
  initialPreferences,
}: UseUserPreferencesProps) {
  const [isPending, startTransition] = useTransition()
  const [preferences, setPreferences] =
    useState<UserPreferences>(initialPreferences)

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    // Optimistic update
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }))

    // Simulate API call
    startTransition(async () => {
      try {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 300))
        toast.success('Preferences updated')
      } catch (err) {
        console.error('Failed to update preferences', err)
        toast.error('Failed to update preferences')
        // Revert on error
        setPreferences(initialPreferences)
      }
    })
  }

  return {
    preferences,
    isPending,
    updatePreference,
  }
}
