'use client';

import * as React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  RiHome3Line,
  RiBox2Line,
  RiListSettingsLine,
  RiTeamLine,
  RiBarChartBoxLine,
  RiDragDropFill,
} from '@remixicon/react';
import {
  TeamSwitcher,
  NavMain,
  NavProjects,
  MOCK_PROJECTS,
} from '@/components/shared/sidebar';
import type { NavItem } from '@/components/shared/sidebar';
import { Separator } from '@/components/ui/separator';

// Mock navigation data for mockup UI
const MOCK_NAV_ITEMS: NavItem[] = [
  {
    title: 'Home',
    url: '/',
    icon: RiHome3Line,
  },
  {
    title: 'Projects',
    url: '/projects',
    icon: RiBox2Line,
  },
  {
    title: 'Team',
    url: '#',
    icon: RiTeamLine,
  },
  {
    title: 'Analytics',
    url: '#',
    icon: RiBarChartBoxLine,
  },
  {
    title: 'Team Settings',
    url: '#',
    icon: RiListSettingsLine,
    items: [
      {
        title: 'General',
        url: '#',
      },
      {
        title: 'Members',
        url: '#',
      },
      {
        title: 'Invitations',
        url: '#',
      },
      {
        title: 'Billing',
        url: '#',
      },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="icon"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <RiDragDropFill className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">SyncUP</span>
                  <span className="truncate text-xs">Design Feedback Tracker</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <TeamSwitcher />
      </SidebarHeader>
      <Separator/>
      <SidebarContent>
        <NavMain items={MOCK_NAV_ITEMS} />
        <NavProjects projects={MOCK_PROJECTS} />
      </SidebarContent>
      <SidebarFooter>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
