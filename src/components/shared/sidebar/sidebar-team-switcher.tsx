"use client";

import { useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { RiExpandUpDownLine, RiAddLine } from "@remixicon/react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useTeams, useSwitchTeam } from "@/features/teams";
import { useTeam } from "@/hooks/use-team";
import { TeamAvatar } from "./sidebar-team-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { isSingleTeamMode } from "@/config/team";

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
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile, state } = useSidebar();
  const { data: teamsData, isLoading } = useTeams();
  const { mutate: switchTeam, isPending: isSwitching } = useSwitchTeam();
  const { currentTeam } = useTeam();

  const teams = useMemo(() => teamsData?.teams ?? [], [teamsData?.teams]);
  const visibleTeams = useMemo(
    () => teams.slice(0, VISIBLE_TEAM_LIMIT),
    [teams]
  );

  // Hide team switcher in single-team mode (Requirement 12.1)
  if (isSingleTeamMode()) {
    return null;
  }

  const isCollapsed = state === "collapsed";

  const handleTeamSwitch = (teamId: string) => {
    if (teamId === currentTeam?.id) return;

    const newTeam = teams.find((t) => t.id === teamId);
    if (!newTeam) return;

    switchTeam(teamId, {
      onSuccess: () => {
        toast.success("Team switched successfully");
        const isOnTeamRoute = /^\/team\/[^/]+/.test(pathname);
        if (isOnTeamRoute) {
          router.push(pathname.replace(/^\/team\/[^/]+/, `/team/${newTeam.slug}`));
        } else if (newTeam.slug) {
          router.push(`/team/${newTeam.slug}/settings`);
        }
      },
      onError: (error) => {
        toast.error(error.message || "Failed to switch team");
      },
    });
  };

  const handleCreateTeam = () => {
    router.push("/onboarding");
  };

  // Loading state
  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex w-full items-center gap-2">
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // No teams state - shouldn't happen as users are redirected to onboarding
  if (!currentTeam) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex w-full items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={isSwitching}>
              <button
                className={`
                  ${!isCollapsed ? TEAM_SWITCHER_DESIGN.backgroundColor : ""}
                  ${TEAM_SWITCHER_DESIGN.borderRadius}
                  ${!isCollapsed ? TEAM_SWITCHER_DESIGN.padding : "p-1"}
                  ${!isCollapsed ? TEAM_SWITCHER_DESIGN.border : ""}
                  ${TEAM_SWITCHER_DESIGN.hoverState}
                  flex w-full items-center gap-2 transition-colors
                  ${isSwitching ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                `}
                disabled={isSwitching}
              >
                <TeamAvatar
                  team={currentTeam}
                  size="sm"
                  className={isCollapsed ? "" : ""}
                />
                {!isCollapsed && (
                  <>
                    <span className="truncate text-sm font-medium text-sidebar-accent-foreground">
                      {currentTeam.name}
                    </span>
                    <RiExpandUpDownLine className="ml-auto size-4 text-sidebar-accent-foreground/70" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-[220px] rounded-2xl border border-sidebar-border/60 p-1 shadow-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Teams
              </DropdownMenuLabel>
              {visibleTeams.map((team) => (
                <DropdownMenuItem
                  key={team.id}
                  onClick={() => handleTeamSwitch(team.id)}
                  disabled={isSwitching || team.id === currentTeam.id}
                  className={`gap-2 rounded-xl px-2 py-2 text-sm ${
                    currentTeam.id === team.id ? "bg-sidebar-accent/30" : ""
                  }`}
                >
                  <TeamAvatar team={team} size="md" />
                  <div className="flex flex-1 flex-col truncate">
                    <span className="truncate font-medium">{team.name}</span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {team.memberCount} members
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
              {teams.length > visibleTeams.length && (
                <DropdownMenuItem
                  className="rounded-xl px-2 py-2 text-xs text-muted-foreground"
                  disabled
                >
                  +{teams.length - visibleTeams.length} more teams
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={handleCreateTeam}
                className="gap-2 rounded-xl px-2 py-2 text-sm font-medium text-sidebar-accent-foreground/90"
              >
                <div className="flex size-7 items-center justify-center rounded-full bg-sidebar-accent/30 text-sidebar-accent-foreground">
                  <RiAddLine className="size-4" />
                </div>
                Create team
              </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
