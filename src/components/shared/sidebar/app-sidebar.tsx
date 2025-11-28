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
  RiBugLine,
} from '@remixicon/react';
import {
  TeamSwitcher,
  NavMain,
  NavProjects,
  MOCK_PROJECTS,
} from '@/components/shared/sidebar';
import type { NavItem } from '@/components/shared/sidebar';
import { Separator } from '@/components/ui/separator';

import Cookies from 'js-cookie';
import { useCanManageTeam } from '@/features/teams/hooks/use-can-manage-team';
import { useTeams } from '@/features/teams';

// Mock navigation data for mockup UI
// const MOCK_NAV_ITEMS: NavItem[] = [ ... ] - Moved inside component for dynamic permissions


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const teamIdCookie = Cookies.get("team_id");
  const { data: teamsData } = useTeams();
  const teams = teamsData?.teams ?? [];
  
  // Use cookie if available and valid, otherwise fallback to first team
  const currentTeam = teams.find((t) => t.id === teamIdCookie) ?? teams[0];
  const teamId = currentTeam?.id;
  
  const canManageTeam = useCanManageTeam(teamId);

  const navItems = React.useMemo(() => {
    const items: NavItem[] = [
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
        url: '/team',
        icon: RiTeamLine,
      },
      {
        title: 'Analytics',
        url: '/analytics',
        icon: RiBarChartBoxLine,
      },
    ];

    if (canManageTeam) {
      items.push({
        title: 'Team Settings',
        url: '/team/settings',
        icon: RiListSettingsLine,
        items: [
          {
            title: 'General',
            url: '/team/settings',
          },
          {
            title: 'Members',
            url: '/team/settings/members',
          },
          {
            title: 'Billing',
            url: '/team/settings/billing',
          },
        ],
      });
    }

    // Dev-only: Auth testing page
    if (process.env.NODE_ENV !== 'production') {
      items.push({
        title: 'Dev: Auth Testing',
        url: '/dev/auth',
        icon: RiBugLine,
      });
    }

    return items;
  }, [canManageTeam]);

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
        <NavMain items={navItems} />
        <NavProjects projects={MOCK_PROJECTS} />
      </SidebarContent>
      <SidebarFooter>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
