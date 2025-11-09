'use client'

import Link from 'next/link'
import { SETTINGS_NAV } from '@config/settings-nav'
import { usePathname } from "next/navigation";
import PreferencesScreen from './setting-preferences-screen'



export default function UserSettingsScreen() {
  // Determine if we're on the main settings page (General)
  const pathname = usePathname();
  const isMainPage = pathname === "/setting";

  return (
    <div className="container mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="lg:w-64">
          <div className="pb-2">
            <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
              Settings
            </h2>
          </div>
          <div className="space-y-1">
            {SETTINGS_NAV.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent hover:text-accent-foreground
                    ${
                      isActive
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground"
                    }
                  `}
                >
                  <item.icon className="h-4 w-4" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">{item.label}</div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </aside>
        <main className="flex-1 max-w-2xl">
          {isMainPage && <PreferencesScreen />}
        </main>
      </div>
    </div>
  )
}
