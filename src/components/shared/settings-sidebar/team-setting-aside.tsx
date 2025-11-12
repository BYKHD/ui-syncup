'use client'

import type { ComponentType } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export interface TeamSettingsNavItem {
  href: string
  label: string
  description?: string
  icon: ComponentType<{ className?: string }>
  badge?: number | string
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
  comingSoon?: boolean
}

interface TeamSettingAsideProps {
  items: TeamSettingsNavItem[]
  heading?: string
}

export function TeamSettingAside({ items, heading = 'Settings' }: TeamSettingAsideProps) {
  const pathname = usePathname()

  return (
    <aside className="w-full md:w-64 shrink-0">
      <div className="pb-2">
        <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">{heading}</h2>
      </div>
      <nav className="space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          if (item.comingSoon) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-muted-foreground opacity-60"
              >
                <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{item.label}</span>
                    <Badge variant="secondary" className="text-xs">
                      Soon
                    </Badge>
                  </div>
                  {item.description && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {item.description}
                    </div>
                  )}
                </div>
              </div>
            )
          }

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
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{item.label}</span>
                  {item.badge !== undefined && item.badge !== null && (
                    <Badge
                      variant={item.badgeVariant ?? 'secondary'}
                      className="h-5 min-w-5 rounded-full px-1 font-mono text-xs tabular-nums"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>
                {item.description && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {item.description}
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
