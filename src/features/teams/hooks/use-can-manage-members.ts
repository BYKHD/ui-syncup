'use client';

import { useTeamPermissions } from './use-team-permissions';

/**
 * Hook to check if the current user can manage team members
 * Returns true if user is TEAM_OWNER or TEAM_ADMIN
 * 
 * @example
 * ```tsx
 * const canManageMembers = useCanManageMembers(teamId);
 * 
 * if (canManageMembers) {
 *   return <InviteMemberButton />;
 * }
 * ```
 */
export function useCanManageMembers(teamId: string | undefined): boolean {
  const permissions = useTeamPermissions(teamId);
  return permissions.canManageMembers;
}
