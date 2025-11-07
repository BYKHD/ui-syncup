"use client"

import { cn } from "@lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarRail,
} from "@components/ui/sidebar"
import {
  RiDashboardLine,
  RiFolderLine,
  RiTeamLine,
  RiSettings4Line,
  RiBarChartBoxLine,
} from "@remixicon/react"
import {
  TeamSwitcher,
  NavMain,
  NavProjects,
  NavUser,
  MOCK_PROJECTS,
} from "@components/shared/sidebar"
import type { NavItem } from "@components/shared/sidebar"

type Variant = "sidebar" | "blank"

// Mock navigation data
const MOCK_NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    url: "#",
    icon: RiDashboardLine,
  },
  {
    title: "Projects",
    url: "#",
    icon: RiFolderLine,
    items: [
      {
        title: "All Projects",
        url: "#",
      },
      {
        title: "Favorites",
        url: "#",
      },
      {
        title: "Archived",
        url: "#",
      },
    ],
  },
  {
    title: "Team",
    url: "#",
    icon: RiTeamLine,
  },
  {
    title: "Analytics",
    url: "#",
    icon: RiBarChartBoxLine,
  },
  {
    title: "Settings",
    url: "#",
    icon: RiSettings4Line,
  },
]

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
        <SidebarProvider>
          {sidebar || (
            <Sidebar>
              <SidebarHeader>
                <TeamSwitcher />
              </SidebarHeader>
              <SidebarContent>
                <NavMain items={MOCK_NAV_ITEMS} />
                <NavProjects projects={MOCK_PROJECTS} />
              </SidebarContent>
              <SidebarFooter>
                <NavUser />
              </SidebarFooter>
              <SidebarRail />
            </Sidebar>
          )}
        <div className="h-svh overflow-hidden p-2 w-full">
             <div className="border rounded-md overflow-hidden flex flex-col items-center justify-start bg-background h-full w-full">
               {header}
               <div
                 className="overflow-auto w-full h-full"
               >
                 {children}
               </div>
             </div>
           </div></SidebarProvider>
      )
    }