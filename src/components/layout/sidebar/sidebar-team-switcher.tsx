"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RiAddLine, RiCheckLine, RiExpandUpDownLine } from "@remixicon/react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { isMultiTeamMode } from "@/config/team";
import { useTeams, useSwitchTeam } from "@/features/teams";
import { useTeam } from "@/hooks/use-team";
import { cn } from "@/lib/utils";
import { TeamAvatar } from "./sidebar-team-avatar";

const FILTER_TEAM_THRESHOLD = 8;

function formatMemberCount(count: number) {
  return count === 1 ? "1 member" : `${count} members`;
}

export function TeamSwitcher() {
  const router = useRouter();
  const { isMobile, state } = useSidebar();
  const { data: teamsData, isLoading } = useTeams();
  const { mutate: switchTeam, isPending: isSwitching } = useSwitchTeam();
  const { currentTeam } = useTeam();
  const [filter, setFilter] = useState("");

  const teams = useMemo(() => teamsData?.teams ?? [], [teamsData?.teams]);
  const isCollapsed = state === "collapsed";
  const multiTeamMode = isMultiTeamMode();
  const showFilter = teams.length > FILTER_TEAM_THRESHOLD;
  const normalizedFilter = filter.trim().toLowerCase();
  const filteredTeams = useMemo(
    () =>
      normalizedFilter
        ? teams.filter((team) =>
            team.name.toLowerCase().includes(normalizedFilter)
          )
        : teams,
    [normalizedFilter, teams]
  );

  const handleTeamSwitch = (teamId: string) => {
    if (teamId === currentTeam?.id) return;

    switchTeam(teamId, {
      onSuccess: () => {
        // The active team changed server-side, so every tenant-scoped tree has to be
        // rebuilt. A full reload does that; router.push would keep the old team's data.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/projects");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to switch team");
      },
    });
  };

  const handleCreateTeam = () => {
    router.push("/onboarding");
  };

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex w-full items-center gap-2">
            <Skeleton
              className={cn("h-10 rounded-lg", isCollapsed ? "w-10" : "w-full")}
            />
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // No teams state - shouldn't happen as users are redirected to onboarding
  if (!currentTeam) {
    return null;
  }

  if (!multiTeamMode && teams.length < 2) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex w-full items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={isSwitching}>
              <button
                type="button"
                aria-label={`Current team: ${currentTeam.name}. Switch team`}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg transition-colors",
                  "hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  isCollapsed
                    ? "justify-center p-1"
                    : "border border-sidebar-border/40 bg-sidebar-accent/80 px-1 py-1",
                  isSwitching
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer"
                )}
                disabled={isSwitching}
              >
                <TeamAvatar
                  team={currentTeam}
                  size="sm"
                  className="shrink-0"
                />
                {!isCollapsed && (
                  <>
                    <span className="min-w-0 flex-1 truncate text-left text-sm font-medium text-sidebar-accent-foreground">
                      {currentTeam.name}
                    </span>
                    <RiExpandUpDownLine className="size-4 shrink-0 text-sidebar-accent-foreground/70" />
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
              {showFilter && (
                <div className="px-2 pb-2">
                  <label htmlFor="team-switcher-filter" className="sr-only">
                    Filter teams
                  </label>
                  <input
                    id="team-switcher-filter"
                    type="search"
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    onKeyDown={(event) => event.stopPropagation()}
                    placeholder="Filter teams"
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              )}
              <div className="max-h-72 overflow-y-auto">
                {filteredTeams.map((team) => {
                  const isCurrentTeam = currentTeam.id === team.id;

                  return (
                    <DropdownMenuItem
                      key={team.id}
                      onClick={() => handleTeamSwitch(team.id)}
                      disabled={isSwitching}
                      aria-current={isCurrentTeam ? "true" : undefined}
                      className={cn(
                        "gap-2 rounded-xl px-2 py-2 text-sm",
                        isCurrentTeam &&
                          "bg-sidebar-accent/50 text-sidebar-accent-foreground"
                      )}
                    >
                      <TeamAvatar team={team} size="md" className="shrink-0" />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-medium">{team.name}</span>
                        <span className="truncate text-[11px] text-muted-foreground">
                          {formatMemberCount(team.memberCount)}
                        </span>
                      </div>
                      {isCurrentTeam && (
                        <RiCheckLine
                          aria-hidden="true"
                          className="size-4 shrink-0 text-sidebar-accent-foreground"
                        />
                      )}
                    </DropdownMenuItem>
                  );
                })}
                {filteredTeams.length === 0 && (
                  <div className="px-2 py-3 text-sm text-muted-foreground">
                    No teams found
                  </div>
                )}
              </div>
              {multiTeamMode && (
                <>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={handleCreateTeam}
                    className="gap-2 rounded-xl px-2 py-2 text-sm font-medium text-sidebar-accent-foreground/90"
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-accent/30 text-sidebar-accent-foreground">
                      <RiAddLine className="size-4" />
                    </div>
                    <span className="truncate">Create team</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
