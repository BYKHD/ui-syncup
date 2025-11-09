import type { Metadata } from 'next'

import { UserSettingsScreen } from '@features/user-settings/screens'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your account settings and preferences',
}

interface SettingsLayoutProps {
  children: React.ReactNode
}

export default function SettingsLayout({
  children,
}: SettingsLayoutProps) {
  // Server component - thin layout that delegates to feature Screen
  // In a real implementation, could fetch user data here
  // const user = await getUser();

  return (
    <UserSettingsScreen>
      {children}
    </UserSettingsScreen>
  )
}
