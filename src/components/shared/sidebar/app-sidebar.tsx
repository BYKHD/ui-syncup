'use client';

import * as React from 'react';
import Link from 'next/link';
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
import { Badge } from '@/components/ui/badge';
import {
  RiHome3Line,
  RiBox2Line,
  RiListSettingsLine,
  RiBugLine,
} from '@remixicon/react';
import {
  TeamSwitcher,
  NavMain,
  NavProjects,
} from '@/components/shared/sidebar';
import { useRecentProjects } from '@/features/projects/hooks';
import type { NavItem } from '@/components/shared/sidebar';

import { useTeam } from '@/hooks/use-team';
import { useCanManageTeam } from '@/features/teams/hooks/use-can-manage-team';
import { isSingleTeamMode } from '@/config/team';

// Mock navigation data for mockup UI
// const MOCK_NAV_ITEMS: NavItem[] = [ ... ] - Moved inside component for dynamic permissions

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '';

function getPrereleaseLabel(version: string): string | null {
  const match = version.match(/-([a-zA-Z]+)/);
  if (!match) return null;
  const channel = match[1].toLowerCase();
  if (channel === 'rc') return 'RC';
  return channel.charAt(0).toUpperCase() + channel.slice(1);
}


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const prereleaseLabel = getPrereleaseLabel(APP_VERSION);
  const { currentTeam } = useTeam();
  const teamSlug = currentTeam?.slug;
  const teamId = currentTeam?.id;

  const canManageTeam = useCanManageTeam(teamId);
  const { recentProjects, isLoaded: isRecentProjectsLoaded } = useRecentProjects();

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
    ];

    // Only add settings nav when slug is resolved — prevents /team/undefined/settings
    if (canManageTeam && teamSlug) {
      items.push({
        // In single-team mode: Use "Settings" label (Requirement 12.4)
        // In multi-team mode: Use "Team Settings" label
        title: isSingleTeamMode() ? 'Settings' : 'Team Settings',
        url: `/team/${teamSlug}/settings`,
        icon: RiListSettingsLine,
        items: [
          {
            title: 'General',
            url: `/team/${teamSlug}/settings`,
          },
          {
            title: 'Members',
            url: `/team/${teamSlug}/settings/members`,
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
  }, [canManageTeam, teamSlug]);

  return (
    <Sidebar
      collapsible="icon"
      {...props}
    >
      <SidebarHeader className="border-b-3d group-data-[collapsible=icon]:h-12">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-7 items-center justify-center group-data-[collapsible=icon]:ml-0.5">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 218 218"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="size-8"
                  >
                    <path
                      d="M119.001 109.071V209.071H99.001V132.879L14.002 216.212L0 201.931L84.5166 119.071H9.00098V99.0713H109.001L119.001 109.071ZM186.782 172.711L179.711 179.782L172.641 186.854L132.234 146.447L139.306 139.376L146.376 132.305L186.782 172.711ZM209.001 119.071H151.857V99.0713H209.001V119.071ZM85.7676 71.6953L71.625 85.8379L31.2188 45.4316L45.3613 31.2891L85.7676 71.6953ZM209.001 9.07129L216.071 16.1426L146.376 85.8379L139.306 78.7666L132.234 71.6953L201.93 2L209.001 9.07129ZM119.001 66.2139H99.001V9.07129H119.001V66.2139Z"
                      fill="currentColor"
                      className="dark:fill-white fill-black"
                    />
                  </svg>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">UI Syncup</span>
                    {prereleaseLabel && (
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-4 leading-none font-mono">{prereleaseLabel}</Badge>
                    )}
                  </div>
                  <span className="truncate text-xs text-muted-foreground">Design Feedback Tracker</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        <NavProjects projects={recentProjects} isLoading={!isRecentProjectsLoaded} />
      </SidebarContent>
      <SidebarFooter>
        {APP_VERSION && (
          <span className="px-2 py-1 text-[11px] text-muted-foreground/60 group-data-[collapsible=icon]:hidden">
            v{APP_VERSION}
          </span>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
