"use client"

import { useEffect } from "react"
import { RiExpandUpDownLine, RiAddLine } from "@remixicon/react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/src/components/ui/sidebar"
import { useTeam, type TeamUpdateEvent } from "@/src/hooks/use-team"
import { useSettingsContext } from "@/src/hooks/use-settings-context"
import { getPlanDisplayName } from "@/src/config/billing"
import { CreateTeamDialog } from "./create-team-dialog"
import { TeamAvatar } from "./team-avatar"

// ============================================================================
// TEAM SWITCHER DESIGN CONSTANTS
// ============================================================================

const TEAM_SWITCHER_DESIGN = {
  // Visual distinction from platform logo
  backgroundColor: 'bg-sidebar-accent',
  borderRadius: 'rounded-lg',
  padding: 'p-2.5',
  
  // Hover and active states
  hoverState: 'hover:bg-sidebar-accent/80',
  activeState: 'data-[state=open]:bg-sidebar-accent',
  
  // Enhanced visual separation
  border: 'border border-sidebar-border/50',
} as const;

export function TeamSwitcher() {
  const { isMobile, state } = useSidebar()
  const { currentTeam, teams, switchTeam, isLoading } = useTeam()
  const { handleTeamSwitchFromSettings, isTeamSettingsPath, isGlobalSettingsPath } = useSettingsContext()
  const isCollapsed = state === "collapsed"

  // Use settings-aware team switching if we're in settings context
  const handleTeamSwitch = async (teamId: string) => {
    try {
      if (isTeamSettingsPath || isGlobalSettingsPath) {
        await handleTeamSwitchFromSettings(teamId);
      } else {
        // Default team switching for non-settings pages
        await switchTeam(teamId);
      }
    } catch (error) {
      console.error('Failed to switch team:', error);
      // The useTeam hook will handle error state
    }
  }

  // Handle team creation completion - automatically switch to new team
  const handleTeamCreated = async (newTeam: any) => {
    try {
      // The team creation already handles switching in the CreateTeamDialog
      // This is just for additional handling if needed
      console.log('New team created:', newTeam.name);
    } catch (error) {
      console.error('Error handling team creation:', error);
    }
  }

  // Listen for team update events to ensure real-time updates
  useEffect(() => {
    const handleTeamUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<TeamUpdateEvent>;
      const { type, teamId } = customEvent.detail;
      
      // Log team updates for debugging
      console.log(`Team update: ${type} for team ${teamId}`);
      
      // The useTeam hook already handles the state updates
      // This is just for any additional UI-specific handling
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('teamUpdate', handleTeamUpdate);
      return () => window.removeEventListener('teamUpdate', handleTeamUpdate);
    }
  }, [])

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton 
            size="sm" 
            className={`animate-pulse ${TEAM_SWITCHER_DESIGN.backgroundColor} ${TEAM_SWITCHER_DESIGN.borderRadius} ${TEAM_SWITCHER_DESIGN.padding} ${TEAM_SWITCHER_DESIGN.border}`}
          >
            <div className="bg-muted flex size-6 items-center justify-center rounded-full" />
            {!isCollapsed && (
              <div className="grid flex-1 text-left text-sm leading-tight">
                <div className="bg-muted h-4 w-20 rounded" />
                <div className="bg-muted h-3 w-12 rounded mt-1" />
              </div>
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  if (!currentTeam) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className={`
                ${TEAM_SWITCHER_DESIGN.backgroundColor}
                ${TEAM_SWITCHER_DESIGN.borderRadius}
                ${TEAM_SWITCHER_DESIGN.padding}
                ${TEAM_SWITCHER_DESIGN.border}
                ${TEAM_SWITCHER_DESIGN.hoverState}
                ${TEAM_SWITCHER_DESIGN.activeState}
                transition-all duration-200 ease-in-out
                focus-visible:ring-2 focus-visible:ring-sidebar-ring
                focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar-background
              `}
            >
              <TeamAvatar team={currentTeam} size="sm" />
              {!isCollapsed && (
                <>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-sidebar-accent-foreground">
                      {currentTeam.name}
                    </span>
                    <span className="truncate text-xs text-sidebar-accent-foreground/70">
                      {getPlanDisplayName(currentTeam.plan)}
                    </span>
                  </div>
                  <RiExpandUpDownLine className="ml-auto size-4 text-sidebar-accent-foreground/70" />
                </>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg shadow-lg border-sidebar-border"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs font-medium px-3 py-2">
              Teams
            </DropdownMenuLabel>
            {teams.map((team, index) => (
              <DropdownMenuItem
                key={team.id}
                onClick={() => handleTeamSwitch(team.id)}
                className={`
                  gap-3 p-3 cursor-pointer transition-colors
                  hover:bg-sidebar-accent/50 focus:bg-sidebar-accent/50
                  ${currentTeam.id === team.id ? 'bg-sidebar-accent/30' : ''}
                `}
              >
                <TeamAvatar team={team} size="sm" />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-medium truncate">{team.name}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {getPlanDisplayName(team.plan)}
                  </span>
                </div>
                {index < 9 && (
                  <DropdownMenuShortcut className="text-xs">
                    ⌘{index + 1}
                  </DropdownMenuShortcut>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="my-1" />
            <CreateTeamDialog onTeamCreated={handleTeamCreated}>
              <DropdownMenuItem 
                className={`
                  gap-3 p-3 cursor-pointer transition-colors
                  hover:bg-sidebar-accent/50 focus:bg-sidebar-accent/50
                  text-sidebar-accent-foreground/80 hover:text-sidebar-accent-foreground
                `}
                onSelect={(e) => e.preventDefault()}
              >
                <div className="flex size-6 items-center justify-center rounded-full bg-sidebar-accent/30 text-sidebar-accent-foreground">
                  <RiAddLine className="size-4" />
                </div>
                <div className="font-medium">Add team</div>
              </DropdownMenuItem>
            </CreateTeamDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
