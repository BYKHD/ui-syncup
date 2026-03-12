'use client';

import { useMemo } from 'react';
import { useTeam } from './use-team';

export interface TeamPermissions {
  canManageTeam: boolean;
  canManageMembers: boolean;
  canManageInvitations: boolean;
  canUpdateSettings: boolean;
  canDeleteTeam: boolean;
  canTransferOwnership: boolean;
  canCreateProjects: boolean;
  canManageProjects: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isMember: boolean;
  isViewer: boolean;
  isLoading: boolean;
}

/**
 * Hook to check team permissions for the current user
 * Returns a comprehensive set of permission flags based on user's roles
 * 
 * @example
 * ```tsx
 * const permissions = useTeamPermissions(teamId);
 * 
 * if (permissions.canManageTeam) {
 *   // Show team settings
 * }
 * 
 * if (permissions.canManageMembers) {
 *   // Show member management UI
 * }
 * ```
 */
export function useTeamPermissions(teamId: string | undefined): TeamPermissions {
  const { data, isLoading } = useTeam(teamId);
  const team = data?.team;

  return useMemo(() => {
    if (!team || isLoading) {
      // Return all false if no team data or still loading
      return {
        canManageTeam: false,
        canManageMembers: false,
        canManageInvitations: false,
        canUpdateSettings: false,
        canDeleteTeam: false,
        canTransferOwnership: false,
        canCreateProjects: false,
        canManageProjects: false,
        isOwner: false,
        isAdmin: false,
        isEditor: false,
        isMember: false,
        isViewer: false,
        isLoading: true,
      };
    }

    const managementRole = team.myManagementRole;
    const operationalRole = team.myOperationalRole;

    // Role checks
    const isOwner = managementRole === 'WORKSPACE_OWNER';
    const isAdmin = managementRole === 'WORKSPACE_ADMIN';
    const isEditor = operationalRole === 'WORKSPACE_EDITOR';
    const isMember = operationalRole === 'WORKSPACE_MEMBER';
    const isViewer = operationalRole === 'WORKSPACE_VIEWER';

    // Permission derivations
    const canManageTeam = isOwner || isAdmin;
    const canManageMembers = isOwner || isAdmin;
    const canManageInvitations = isOwner || isAdmin;
    const canUpdateSettings = isOwner || isAdmin;
    const canDeleteTeam = isOwner;
    const canTransferOwnership = isOwner;
    const canCreateProjects = isEditor;
    const canManageProjects = isEditor;

    return {
      canManageTeam,
      canManageMembers,
      canManageInvitations,
      canUpdateSettings,
      canDeleteTeam,
      canTransferOwnership,
      canCreateProjects,
      canManageProjects,
      isOwner,
      isAdmin,
      isEditor,
      isMember,
      isViewer,
      isLoading,
    };
  }, [team, isLoading]);
}
