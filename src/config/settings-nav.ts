export interface SettingsNavItem {
  href: string
  label: string
  description: string
  icon: SettingsNavIcon
}

export type SettingsNavIcon =
  | 'notifications'
  | 'preferences'
  | 'integrations'
  | 'other'

export const SETTINGS_NAV: SettingsNavItem[] = [
  {
    href: '/settings/preferences',
    label: 'Preferences',
    description: 'Customize your experience',
    icon: 'preferences',
  },
  {
    href: '/settings/notifications',
    label: 'Notifications',
    description: 'Manage your notification preferences',
    icon: 'notifications',
  },
  {
    href: '/settings/integrations',
    label: 'Integrations',
    description: 'Connect third-party services',
    icon: 'integrations',
  },
  {
    href: '/settings/other',
    label: 'Other',
    description: 'Advanced settings and account management',
    icon: 'other',
  },
]
