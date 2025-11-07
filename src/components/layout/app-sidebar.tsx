'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/src/components/ui/sidebar';
import { NavProjects } from './nav-project';
import {
  RiHome3Line,
  RiEmpathizeFill,
  RiBox2Line,
  RiListSettingsLine,
  RemixiconComponentType,
} from '@remixicon/react';
import { NavMain } from './nav-main';
import useSWR from 'swr';
import { fetcher } from '@/src/lib/utils';
import { toProjectNavigationItem, ProjectSummary } from '@/src/lib/projects';
import { NavUser } from './nav-user';
import { useTeam } from '@/src/hooks/use-team';
import { useTeamPermissions } from '@/src/hooks/use-team-permissions';
import { useSettingsContext } from '@/src/hooks/use-settings-context';
import { TeamSwitcher } from './team-switcher';

interface NavItem {
  title: string;
  url: string;
  icon: RemixiconComponentType;
  isActive?: boolean;
  items?: {
    title: string;
    url: string;
    isActive?: boolean;
  }[];
}

const baseNavItems: NavItem[] = [
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
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { currentTeam, isLoading: isTeamLoading } = useTeam();
  const teamId = currentTeam?.id;
  const { permissions } = useTeamPermissions(teamId);
  const { isTeamSettingsPath, currentPathTeamId } = useSettingsContext();

  const { data, isLoading } = useSWR<{ items: ProjectSummary[] }>(
    teamId ? `/api/projects?teamId=${teamId}` : null,
    fetcher
  );
  const projects = data?.items ?? [];
  const projectsLoading = isTeamLoading || !teamId || isLoading;

  // Build navigation items based on permissions
  const navItems = React.useMemo((): NavItem[] => {
    const items: NavItem[] = [...baseNavItems];
    
    // Determine which team ID to use for team settings URLs
    // If we're on a team settings path, use the team ID from the URL
    // Otherwise, use the current team context
    const settingsTeamId = isTeamSettingsPath && currentPathTeamId ? currentPathTeamId : teamId;
    
    // Add team settings if user has permission and team is selected
    if (settingsTeamId && permissions.canViewTeamSettings) {
      const teamSettingsItems = [
        {
          title: 'General',
          url: `/teams/${settingsTeamId}/settings`,
        },
        {
          title: 'Members',
          url: `/teams/${settingsTeamId}/settings/members`,
        },
        {
          title: 'Invitations',
          url: `/teams/${settingsTeamId}/settings/invitations`,
        },
      ];

      // Add billing for team owners only
      if (permissions.canManageBilling) {
        teamSettingsItems.push({
          title: 'Billing',
          url: `/teams/${settingsTeamId}/settings/billing`,
        });
      }

      items.push({
        title: 'Team Settings',
        url: `/teams/${settingsTeamId}/settings`,
        icon: RiListSettingsLine,
        items: teamSettingsItems,
      });
    }
    
    return items;
  }, [teamId, permissions, isTeamSettingsPath, currentPathTeamId]);

  // Create nav items with active state based on current pathname
  const navItemsWithActive = navItems.map((item) => {
    const subItems = item.items?.map((subItem) => ({
      ...subItem,
      isActive: pathname === subItem.url,
    }));
    const isSubItemActive = subItems?.some((subItem) => subItem.isActive) ?? false;
    const isActive =
      pathname === item.url ||
      (item.url !== '/' && pathname.startsWith(`${item.url}/`)) ||
      isSubItemActive;

    return {
      ...item,
      items: subItems,
      isActive,
    };
  });

  return (
    <Sidebar collapsible="icon" {...props} className="group-data-[side=left]:border-0 group-data-[side=right]:border-0 p-1" >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <RiEmpathizeFill className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">UIMatcha</span>
                  <span className="truncate text-xs">Design Feedback Tracker</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <TeamSwitcher/>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItemsWithActive} />
        <NavProjects
          projects={projects.map((project) => toProjectNavigationItem(project))}
          isLoading={projectsLoading}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail/>
    </Sidebar>
  );
}
