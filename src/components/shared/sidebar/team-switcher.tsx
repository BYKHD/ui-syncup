"use client"

import { useState } from "react"
import { RiExpandUpDownLine, RiAddLine } from "@remixicon/react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@components/ui/sidebar"
import { CreateTeamDialog } from "./create-team-dialog"
import { TeamAvatar } from "./sidebar-team-avatar"
import { MOCK_TEAMS, getPlanDisplayName, type Team } from "./type"

// ============================================================================
// TEAM SWITCHER DESIGN CONSTANTS
// ============================================================================

const TEAM_SWITCHER_DESIGN = {
  backgroundColor: 'bg-sidebar-accent',
  borderRadius: 'rounded-lg',
  padding: 'p-2.5',
  hoverState: 'hover:bg-sidebar-accent/80',
  activeState: 'data-[state=open]:bg-sidebar-accent',
  border: 'border border-sidebar-border/50',
} as const;

export function TeamSwitcher() {
  const { isMobile, state } = useSidebar()
  const [currentTeam, setCurrentTeam] = useState<Team>(MOCK_TEAMS[0])
  const [teams] = useState<Team[]>(MOCK_TEAMS)
  const isCollapsed = state === "collapsed"

  const handleTeamSwitch = (teamId: string) => {
    const team = teams.find(t => t.id === teamId)
    if (team) {
      setCurrentTeam(team)
      console.log('Switched to team:', team.name)
    }
  }

  const handleTeamCreated = () => {
    console.log('New team created')
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
            {teams.map((team) => (
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
