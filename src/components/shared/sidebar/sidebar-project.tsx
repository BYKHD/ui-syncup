"use client"

import { Folder, Forward, MoreHorizontal, Trash2 } from "lucide-react"
import { usePathname } from "next/navigation"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/src/components/ui/sidebar"
import { RemixiconComponentType } from "@remixicon/react"
import * as RemixIcons from "@remixicon/react"
import { RiFolderLine } from "@remixicon/react"
import { Skeleton } from "@/src/components/ui/skeleton"

export function NavProjects({
  projects,
  isLoading = false,
}: {
  projects: {
    id: string
    name: string
    url: string
    icon: string | null
  }[]
  isLoading?: boolean
}) {
  const { isMobile } = useSidebar()
  const pathname = usePathname()

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarMenu>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <SidebarMenuItem key={`project-skeleton-${index}`}>
              <SidebarMenuButton disabled>
                <Skeleton className="size-4 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))
        ) : projects.length ? (
          projects.map((item) => {
            const IconComponent = (item.icon && (RemixIcons as Record<string, RemixiconComponentType>)[item.icon]) || RiFolderLine
            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton asChild isActive={pathname === item.url}>
                  <a href={item.url}>
                    <IconComponent />
                    <span>{item.name}</span>
                  </a>
                </SidebarMenuButton>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuAction showOnHover>
                      <MoreHorizontal />
                      <span className="sr-only">More</span>
                    </SidebarMenuAction>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-48 rounded-lg"
                    side={isMobile ? "bottom" : "right"}
                    align={isMobile ? "end" : "start"}
                  >
                    <DropdownMenuItem>
                      <Folder className="text-muted-foreground" />
                      <span>View Project</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Forward className="text-muted-foreground" />
                      <span>Share Project</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Trash2 className="text-muted-foreground" />
                      <span>Delete Project</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            )
          })
        ) : (
          <SidebarMenuItem>
            <SidebarMenuButton disabled>
              <RiFolderLine />
              <span>No projects yet</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
