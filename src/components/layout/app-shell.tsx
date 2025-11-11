"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/shared/sidebar/app-sidebar"
import { AppHeader } from "@/components/shared/headers"

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
  return (
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
        {header || <AppHeader />}
        
        {/* Single scroll container */}
        <main 
          id="content"
          className="flex-1 overflow-auto p-3 md:p-4 [scrollbar-gutter:stable]"
        >
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
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