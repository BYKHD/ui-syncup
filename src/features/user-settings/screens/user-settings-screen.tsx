'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Bell, Settings2, Plug } from 'lucide-react'
import { cn } from '@lib/utils'

interface UserSettingsScreenProps {
  children?: React.ReactNode
}

const settingsNav = [
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
]

export default function UserSettingsScreen({
  children,
}: UserSettingsScreenProps) {
  const pathname = usePathname()

  // If we're on the main settings page, show navigation
  const isMainPage = pathname === '/setting'

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="space-y-1">
            {settingsNav.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-start gap-3 rounded-lg px-3 py-3 transition-colors',
                    isActive
                      ? 'bg-secondary text-secondary-foreground'
                      : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {item.description}
                    </div>
                  </div>
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {isMainPage ? (
            <div className="rounded-lg border bg-card p-8">
              <h2 className="text-xl font-semibold mb-4">
                Welcome to Settings
              </h2>
              <p className="text-muted-foreground mb-6">
                Select a category from the sidebar to manage your preferences.
              </p>
              <div className="grid gap-4">
                {settingsNav.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-secondary/50"
                    >
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{item.label}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.description}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  )
}
