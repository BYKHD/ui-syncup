"use client"

import { cn } from "@lib/utils"

type Variant = "sidebar" | "blank"

export function AppShell({
    variant = "sidebar",
    sidebar,
    header,
    children,
    className,
  }: {
    variant?: Variant
    sidebar?: React.ReactNode
    header?: React.ReactNode
    children: React.ReactNode
    className?: string
  }) {
    if (variant === "blank") return <>{children}</>
    
      // default: "sidebar"
      return (
        <div className={cn("grid min-h-dvh grid-cols-[auto_1fr]",className)}>
          {sidebar}
          <div className="flex min-h-dvh flex-col">
            {header}
            <main className="p-6">{children}</main>
          </div>
        </div>
      )
    }