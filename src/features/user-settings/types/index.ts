export interface UserProfile {
  id: string
  name: string
  email: string
  avatar: string | null
  bio: string | null
  timezone: string
  language: string
}

export interface NotificationPreference {
  id: string
  type: 'issues' | 'mentions' | 'updates' | 'security'
  label: string
  description: string
  inApp: boolean
  email: boolean
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  emailDigest: 'daily' | 'weekly' | 'never'
  soundEnabled: boolean
  compactMode: boolean
}

export interface Integration {
  id: string
  name: string
  description: string
  icon: string
  connected: boolean
  lastSync?: string
}

export type SettingSection = 'notifications' | 'preferences' | 'integrations' | 'other'

export interface AccountDeletionConfirmation {
  email: string
  confirmText: string
  understood: boolean
}
