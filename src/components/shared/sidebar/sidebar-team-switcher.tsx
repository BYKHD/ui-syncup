"use client";

import { useMemo, useState } from "react";
import { RiExpandUpDownLine, RiAddLine } from "@remixicon/react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@components/ui/sidebar";
import { CreateTeamDialog } from "@features/teams";
import { TeamAvatar } from "./sidebar-team-avatar";
import { MOCK_TEAMS, getPlanDisplayName, type Team } from "./type";

// ============================================================================
// TEAM SWITCHER DESIGN CONSTANTS
// ============================================================================

const TEAM_SWITCHER_DESIGN = {
  backgroundColor: "bg-sidebar-accent/80",
  borderRadius: "rounded-lg",
  padding: "px-1 py-1",
  hoverState: "hover:bg-sidebar-accent",
  border: "border border-sidebar-border/40",
} as const;

const VISIBLE_TEAM_LIMIT = 5;

export function TeamSwitcher() {
  const { isMobile, state } = useSidebar();
  const [currentTeam, setCurrentTeam] = useState<Team>(MOCK_TEAMS[0]);
  const [teams] = useState<Team[]>(MOCK_TEAMS);
  const isCollapsed = state === "collapsed";
  const visibleTeams = useMemo(
    () => teams.slice(0, VISIBLE_TEAM_LIMIT),
    [teams]
  );

  const handleTeamSwitch = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (team) {
      setCurrentTeam(team);
      console.log("Switched to team:", team.name);
    }
  };

  const handleTeamCreated = () => {
    console.log("New team created");
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex w-full items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div
                className={`
                  ${!isCollapsed ? TEAM_SWITCHER_DESIGN.backgroundColor:""}
                  ${TEAM_SWITCHER_DESIGN.borderRadius}
                  ${!isCollapsed ? TEAM_SWITCHER_DESIGN.padding : "p-1"}
                  ${!isCollapsed ? "justify-start" : "justify-start"}
                  ${!isCollapsed ? TEAM_SWITCHER_DESIGN.border:""}
                  ${TEAM_SWITCHER_DESIGN.hoverState}
                  flex w-full items-center gap-2
                `}
              >
                <TeamAvatar
                  team={currentTeam}
                  size="sm"
                  className={isCollapsed ? "p-2" : "p-2"}
                />
                {!isCollapsed && (
                  <>
                    <span className="truncate text-sm font-medium text-sidebar-accent-foreground">
                      {currentTeam.name}
                    </span>
                    <RiExpandUpDownLine className="ml-auto size-4 text-sidebar-accent-foreground/70" />
                  </>
                )}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-[220px] rounded-2xl border border-sidebar-border/60 p-1 shadow-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Workspaces
              </DropdownMenuLabel>
              {visibleTeams.map((team) => (
                <DropdownMenuItem
                  key={team.id}
                  onClick={() => handleTeamSwitch(team.id)}
                  className={`gap-2 rounded-xl px-2 py-2 text-sm ${
                    currentTeam.id === team.id ? "bg-sidebar-accent/30" : ""
                  }`}
                >
                  <TeamAvatar team={team} size="sm" />
                  <div className="flex flex-1 flex-col truncate">
                    <span className="truncate font-medium">{team.name}</span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {getPlanDisplayName(team.plan)}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
              {teams.length > visibleTeams.length && (
                <DropdownMenuItem className="rounded-xl px-2 py-2 text-xs text-muted-foreground">
                  View all teams
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="my-1" />
              <CreateTeamDialog onTeamCreated={handleTeamCreated}>
                <DropdownMenuItem
                  className="gap-2 rounded-xl px-2 py-2 text-sm font-medium text-sidebar-accent-foreground/90"
                  onSelect={(event) => event.preventDefault()}
                >
                  <div className="flex size-7 items-center justify-center rounded-full bg-sidebar-accent/30 text-sidebar-accent-foreground">
                    <RiAddLine className="size-4" />
                  </div>
                  Create team
                </DropdownMenuItem>
              </CreateTeamDialog>
            </DropdownMenuContent>
          </DropdownMenu>

          {!isCollapsed && (
            <span className="rounded-full border border-sidebar-border/50 px-3 py-1 text-xs font-semibold text-sidebar-accent-foreground/80">
              {getPlanDisplayName(currentTeam.plan)}
            </span>
          )}
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
