'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';


import {
  RiLogoutBoxRLine,
  RiLoginBoxLine,
  RiP2pLine,
  RiSettings4Line,
  RiNotification3Line,
  RiMore2Line,
} from '@remixicon/react';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@components/ui/sidebar';
import { authClient } from '@lib/auth/client';
import { useSession } from '@hooks/use-session';
import { useTeam } from '@hooks/use-team';

interface UserMenuItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  disabled?: boolean;
}

export function NavUser() {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useSession();
  const { teams, currentTeam, switchTeam, isLoading: isTeamsLoading } = useTeam();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const rawName = user?.name?.trim() ?? '';
  const displayName = rawName || (isLoading ? 'Loading…' : 'Guest');
  const displayEmail = user?.email ?? '';
  const avatarUrl = user?.image ?? '';

  const avatarFallback = React.useMemo(() => {
    if (!rawName) {
      return 'U';
    }

    return rawName
      .split(/\s+/)
      .filter(Boolean)
      .map((segment) => segment[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2) || 'U';
  }, [rawName]);

  const handleLogout = React.useCallback(async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    try {
      await authClient.signOut();
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Failed to sign out', error);
    } finally {
      setIsSigningOut(false);
    }
  }, [isSigningOut, router]);

  const handleSettingsClick = React.useCallback(() => {
    router.push('/settings');
  }, [router]);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="rounded-lg">
                  {avatarFallback}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                {displayEmail ? (
                  <span className="truncate text-xs">{displayEmail}</span>
                ) : null}
              </div>
              <RiMore2Line className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="rounded-lg">
                    {avatarFallback}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  {displayEmail ? (
                    <span className="truncate text-xs">{displayEmail}</span>
                  ) : null}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex items-center gap-2 text-sm">
                  <RiP2pLine className="size-4" />
                  <span>Switch Team</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="min-w-48">
                    {isTeamsLoading ? (
                      <DropdownMenuItem disabled>Loading teams…</DropdownMenuItem>
                    ) : teams.length ? (
                      teams.map((team) => (
                        <DropdownMenuItem
                          key={team.id}
                          onSelect={(event) => {
                            event.preventDefault();
                            switchTeam(team.id);
                          }}
                          className="flex flex-col items-start gap-1"
                        >
                          <span className="font-medium leading-tight">
                            {team.name}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {currentTeam?.id === team.id
                              ? 'Current team'
                              : 'Joined'}
                          </span>
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem disabled>No teams yet</DropdownMenuItem>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem 
                disabled={!isAuthenticated}
                onSelect={(event) => {
                  event.preventDefault();
                  handleSettingsClick();
                }}
              >
                <RiSettings4Line />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!isAuthenticated}>
                <RiNotification3Line />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {isAuthenticated ? (
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  handleLogout();
                }}
                disabled={isSigningOut}
              >
                <RiLogoutBoxRLine />
                {isSigningOut ? 'Logging out…' : 'Log out'}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  router.push('/login');
                }}
              >
                <RiLoginBoxLine />
                Sign in
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
