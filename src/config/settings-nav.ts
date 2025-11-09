import { Bell, Settings2, Plug, MoreHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface SettingsNavItem {
  href: string
  label: string
  description: string
  icon: LucideIcon
}

export const SETTINGS_NAV: SettingsNavItem[] = [
  {
    href: '/setting/notifications',
    label: 'Notifications',
    description: 'Manage your notification preferences',
    icon: Bell,
  },
  {
    href: '/setting/preferences',
    label: 'Preferences',
    description: 'Customize your experience',
    icon: Settings2,
  },
  {
    href: '/setting/integrations',
    label: 'Integrations',
    description: 'Connect third-party services',
    icon: Plug,
  },
  {
    href: '/setting/other',
    label: 'Other',
    description: 'Advanced settings and account management',
    icon: MoreHorizontal,
  },
]
