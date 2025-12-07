'use client';

import { useTeamPermissions } from './use-team-permissions';

/**
 * Hook to check if the current user can manage team settings
 * Returns true if user is TEAM_OWNER or TEAM_ADMIN
 * 
 * @example
 * ```tsx
 * const canManage = useCanManageTeam(teamId);
 * 
 * if (canManage) {
 *   return <TeamSettingsButton />;
 * }
 * ```
 */
export function useCanManageTeam(teamId: string | undefined): boolean {
  const permissions = useTeamPermissions(teamId);
  return permissions.canManageTeam;
}
