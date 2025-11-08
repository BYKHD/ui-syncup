'use client';

import * as React from 'react';
import {
  RiLogoutBoxRLine,
  RiSettings4Line,
  RiSunLine,
  RiMoonLine,
} from '@remixicon/react';
import { useTheme } from 'next-themes';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@components/ui/avatar';
import { Button } from '@components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu';
import { MOCK_USER } from '../sidebar/type';

// ============================================================================
// TYPES
// ============================================================================

export interface HeaderUserMenuProps {
  /**
   * Optional custom user data to override MOCK_USER
   */
  user?: {
    name: string;
    email: string;
    image?: string | null;
  };
  /**
   * Callback when logout is triggered
   */
  onLogout?: () => void;
  /**
   * Callback when settings is clicked
   */
  onSettingsClick?: () => void;
  /**
   * Optional className for the trigger button
   */
  className?: string;
}

// ============================================================================
// HEADER USER MENU COMPONENT
// ============================================================================

/**
 * HeaderUserMenu - User menu dropdown for the application header
 *
 * Displays user avatar and provides access to settings, theme toggle, and logout.
 * Refactored from sidebar context to work properly in the header.
 *
 * @example
 * ```tsx
 * <HeaderUserMenu
 *   onLogout={() => console.log('Logging out...')}
 *   onSettingsClick={() => router.push('/settings')}
 * />
 * ```
 */
export function HeaderUserMenu({
  user: userProp,
  onLogout,
  onSettingsClick,
  className = '',
}: HeaderUserMenuProps = {}) {
  const { theme, setTheme } = useTheme();
  const user = userProp ?? MOCK_USER;

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
    if (onLogout) {
      onLogout();
    } else {
      console.log('User logged out');
    }
  };

  const handleSettingsClick = () => {
    if (onSettingsClick) {
      onSettingsClick();
    } else {
      console.log('Navigate to settings');
    }
  };

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 rounded-full ${className}`}
          aria-label="User menu"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-56 rounded-lg"
        side="bottom"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-2 py-2 text-left text-sm">
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback>{avatarFallback}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{displayName}</span>
              {displayEmail ? (
                <span className="truncate text-xs text-muted-foreground">
                  {displayEmail}
                </span>
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
            <RiSettings4Line className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              handleThemeToggle();
            }}
          >
            {theme === 'dark' ? (
              <RiSunLine className="mr-2 h-4 w-4" />
            ) : (
              <RiMoonLine className="mr-2 h-4 w-4" />
            )}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            handleLogout();
          }}
        >
          <RiLogoutBoxRLine className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
