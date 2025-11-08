"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@lib/utils";
import { Badge } from "@components/ui/badge";
import { useTeam } from "@hooks/use-team";
import type { SettingsNavItem } from "../types";

interface SettingsNavigationProps {
  items: SettingsNavItem[];
  teamId?: string;
}

export function SettingsNavigation({ items, teamId }: SettingsNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentTeam, teams } = useTeam();

  // Process items to replace teamId placeholders and validate team access
  const processedItems = React.useMemo(() => {
    return items.map(item => {
      let href = item.href;
      
      if (teamId) {
        // Replace [teamId] placeholder with actual team ID
        href = href.replace('[teamId]', teamId);
        
        // Only validate team access if teams are loaded
        if (teams && teams.length > 0) {
          // Validate that the team exists in user's teams
          const teamExists = teams.find(team => team.id === teamId);
          if (!teamExists) {
            // If team doesn't exist, use the first available team
            const fallbackTeamId = teams[0].id;
            href = href.replace(teamId, fallbackTeamId);
          }
        }
      }
      
      return {
        ...item,
        href
      };
    });
  }, [items, teamId, teams]);

  // Handle navigation with team context validation
  const handleNavigation = React.useCallback((href: string, event: React.MouseEvent) => {
    // Only validate if teams are loaded
    if (!teams || teams.length === 0) {
      return; // Allow default navigation if teams aren't loaded yet
    }

    // Check if this is a team settings navigation
    if (href.includes('/teams/') && href.includes('/settings')) {
      const urlTeamId = href.split('/')[2];
      const teamExists = teams.find(team => team.id === urlTeamId);
      
      if (!teamExists) {
        // Prevent default navigation and redirect to valid team
        event.preventDefault();
        const fallbackTeamId = teams[0].id;
        const correctedHref = href.replace(urlTeamId, fallbackTeamId);
        router.push(correctedHref);
        return;
      }
    }
    
    // Allow default navigation for valid links
  }, [teams, router]);

  return (
    <nav className="space-y-2">
      <div className="pb-2">
        <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
          Settings
        </h2>
      </div>
      <div className="space-y-1">
        {processedItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(event) => handleNavigation(item.href, event)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent hover:text-accent-foreground",
                isActive 
                  ? "bg-accent text-accent-foreground font-medium" 
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {item.title}
                  {item.comingSoon && (
                    <Badge variant="secondary" className="text-xs">
                      Soon
                    </Badge>
                  )}
                  {item.badge !== undefined && item.badge !== null && (
                    <Badge
                      variant={item.badgeVariant || 'destructive'}
                      className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.description}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}