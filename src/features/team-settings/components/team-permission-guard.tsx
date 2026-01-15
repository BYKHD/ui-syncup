"use client";

import * as React from "react";
import { useTeamPermissions } from "@/features/teams/hooks/use-team-permissions";

/**
 * Team Permission Guard Component (Mockup)
 * For UI mockup purposes - always allows access
 * TODO: Implement real team permission checking when backend is ready
 */

interface TeamPermissionGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  permission?: string; // Simplified for mockup
  teamId?: string;
}

export function TeamPermissionGuard({
  children,
  fallback = null,
  permission,
  teamId,
}: TeamPermissionGuardProps) {
  const { 
    canManageTeam,
    canManageMembers,
    canManageInvitations,
    canUpdateSettings,
    canDeleteTeam,
    canTransferOwnership, 
    isLoading
  } = useTeamPermissions(teamId);

  // If no permission specified or loading, render children (fail closed handled by API/hooks)
  if (!permission) return <>{children}</>;
  
  if (isLoading) return null; // Or some skeleton if needed, but null avoids flash of forbidden content

  const permissionsMap: Record<string, boolean> = {
    canManageTeam,
    canManageMembers,
    canManageInvitations,
    canUpdateSettings,
    canDeleteTeam,
    canTransferOwnership,
  };

  const hasPermission = permissionsMap[permission];

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}