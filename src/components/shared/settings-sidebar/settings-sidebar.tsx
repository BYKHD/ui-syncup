'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@lib/utils'
import type { SettingsNavItem } from '@config/settings-nav'

interface SettingsSidebarProps {
  items: SettingsNavItem[]
}

export function SettingsSidebar({ items }: SettingsSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-full md:w-64 shrink-0">
      <nav className="space-y-1">
        {items.map((item) => {
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
  )
}
