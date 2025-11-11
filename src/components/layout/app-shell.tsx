"use client"

import { SidebarProvider } from "@/components/ui/sidebar"
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
      <div className="flex flex-1 flex-col">
        {header || <AppHeader pageName="Dashboard" />}
        <main className="p-4 overflow-auto w-full h-full">
          {children}
        </main>
      </div>
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