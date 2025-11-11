"use client"

import * as React from "react"

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
        <SidebarInset className="min-w-0 flex flex-col">
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
            className="flex-1 overflow-auto p-3 md:p-4 [scrollbar-gutter:stable]"
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
  if (variant === "blank") return <>{children}</>

  return (
    <SidebarLayout sidebar={sidebar} header={header}>
      {children}
    </SidebarLayout>
  )
}
