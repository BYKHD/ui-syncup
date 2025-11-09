import type { Metadata } from 'next'
import { SettingsSidebar } from '@components/shared/settings-sidebar'
import { SETTINGS_NAV } from '@config/settings-nav'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your account settings and preferences',
}

export default function SettingLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="container mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="lg:w-64">
          <div className="pb-2">
            <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">Settings</h2>
          </div>
          <SettingsSidebar items={SETTINGS_NAV} />
        </div>
        <main className="flex-1 max-w-2xl">{children}</main>
      </div>
    </div>
  )
}
