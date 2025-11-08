"use client"

import { RiFolderLine } from "@remixicon/react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@components/ui/sidebar"
import { Skeleton } from "@components/ui/skeleton"
import type { Project } from "./type"

export function NavProjects({
  projects,
  isLoading = false,
}: {
  projects: Project[]
  isLoading?: boolean
}) {

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
          projects.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton asChild>
                <a href={item.url}>
                  <RiFolderLine />
                  <span>{item.name}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))
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
