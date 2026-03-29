"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { useTeams } from "@/features/teams"

import { AppShellHeaderContext } from "@/components/layout/app-shell-header-store"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/shared/sidebar/app-sidebar"
import { AppHeader, type AppHeaderProps } from "@/components/shared/headers"

type Variant = "sidebar" | "blank"

function SidebarLayout({
  sidebar,
  header,
  children
}: {
  sidebar?: React.ReactNode
  header?: React.ReactNode
  children: React.ReactNode
}) {
  const [headerConfig, setHeaderConfig] = React.useState<AppHeaderProps | null>(
    null
  )

  return (
    <AppShellHeaderContext.Provider value={{ headerConfig, setHeaderConfig }}>
      <SidebarProvider>
        {sidebar || <AppSidebar />}
        <SidebarInset className="min-w-0 flex flex-col h-screen overflow-hidden">
          {/* Skip link for accessibility */}
          <a
            href="#content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-primary text-primary-foreground px-3 py-2 rounded"
          >
            Skip to content
          </a>

          {/* Sticky header (outside scroll container) */}
          {header || (
            <AppHeader
              {...(
                headerConfig ?? {
                  pageName: "Loading",
                  isLoading: true,
                }
              )}
            />
          )}

          {/* Single scroll container */}
          <main
            id="content"
            className="flex-1 overflow-auto [scrollbar-gutter:stable] h-full"
          >
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AppShellHeaderContext.Provider>
  )
}



export function AppShell({
  variant = "sidebar",
  sidebar,
  header,
  children
}: {
  variant?: Variant
  sidebar?: React.ReactNode
  header?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: teamsData, isLoading } = useTeams()

  const isOnboarding = pathname?.startsWith("/onboarding")
  const isTeamRoute = pathname?.startsWith("/team/")
  const effectiveVariant = isOnboarding ? "blank" : variant

  React.useEffect(() => {
    if (!isLoading && teamsData?.teams && teamsData.teams.length === 0 && !isOnboarding && !isTeamRoute) {
      router.push("/onboarding")
    }
  }, [isLoading, teamsData, isOnboarding, isTeamRoute, router])

  if (effectiveVariant === "blank") return <>{children}</>

  return (
    <SidebarLayout sidebar={sidebar} header={header}>
      {children}
    </SidebarLayout>
  )
}
