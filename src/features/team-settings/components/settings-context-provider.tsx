"use client";

import { createContext, useContext, ReactNode } from "react";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();

  // Check if current path is a team settings path
  const isTeamSettingsPath = pathname.startsWith('/team/') && pathname.includes('/setting');

  // Check if current path is global settings path
  const isGlobalSettingsPath = pathname.startsWith('/setting') && !pathname.startsWith('/setting/team');

  // Extract team ID from current path if it's a team settings path
  const currentPathTeamId = isTeamSettingsPath
    ? pathname.split('/')[2] // /team/[teamId]/setting/...
    : null;

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