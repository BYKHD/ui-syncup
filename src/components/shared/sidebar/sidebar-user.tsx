'use client';

import * as React from 'react';
import {
  RiLogoutBoxRLine,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@components/ui/sidebar';
import { MOCK_USER } from './type';

export function NavUser() {
  const { isMobile } = useSidebar();
  const user = MOCK_USER;

  const displayName = user.name;
  const displayEmail = user.email;
  const avatarUrl = user.image ?? '';

  const avatarFallback = React.useMemo(() => {
    if (!user.name) {
      return 'U';
    }

    return user.name
      .split(/\s+/)
      .filter(Boolean)
      .map((segment) => segment[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2) || 'U';
  }, [user.name]);

  const handleLogout = () => {
    console.log('User logged out');
  };

  const handleSettingsClick = () => {
    console.log('Navigate to settings');
  };

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
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  handleSettingsClick();
                }}
              >
                <RiSettings4Line />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <RiNotification3Line />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                handleLogout();
              }}
            >
              <RiLogoutBoxRLine />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
