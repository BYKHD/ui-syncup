"use client";

import { createContext, useContext, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTeam } from "@hooks/use-team";

interface SettingsContextType {
  isTeamSettingsPath: boolean;
  isGlobalSettingsPath: boolean;
  currentPathTeamId: string | null;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsContextProviderProps {
  children: ReactNode;
}

export function SettingsContextProvider({ children }: SettingsContextProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentTeam, teams } = useTeam();

  // Check if current path is a team settings path
  const isTeamSettingsPath = pathname.startsWith('/teams/') && pathname.includes('/settings');
  
  // Check if current path is global settings path
  const isGlobalSettingsPath = pathname.startsWith('/settings') && !pathname.startsWith('/settings/teams');

  // Extract team ID from current path if it's a team settings path
  const currentPathTeamId = isTeamSettingsPath 
    ? pathname.split('/')[2] // /teams/[teamId]/settings/...
    : null;

  // Handle team context validation and redirection
  useEffect(() => {
    if (isTeamSettingsPath && currentPathTeamId && teams.length > 0) {
      // Check if the team ID in the URL exists in user's teams
      const teamExists = teams.find(team => team.id === currentPathTeamId);
      
      if (!teamExists) {
        // Team doesn't exist or user doesn't have access - redirect to first available team
        const firstTeam = teams[0];
        const settingsSubpath = pathname.split('/settings')[1] || '';
        const newPath = `/teams/${firstTeam.id}/settings${settingsSubpath}`;
        
        console.warn(`Team ${currentPathTeamId} not found, redirecting to ${firstTeam.id}`);
        router.replace(newPath);
        return;
      }

      // If team exists but current team context doesn't match, this will be handled by useTeam hook
      // The team context should be updated automatically by the useSettingsContext hook
    }
  }, [isTeamSettingsPath, currentPathTeamId, teams, router, pathname]);

  const contextValue: SettingsContextType = {
    isTeamSettingsPath,
    isGlobalSettingsPath,
    currentPathTeamId
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContextProvider() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettingsContextProvider must be used within SettingsContextProvider");
  }
  return context;
}