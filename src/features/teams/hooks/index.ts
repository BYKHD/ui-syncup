// Query hooks
export { useTeams, TEAMS_QUERY_KEY } from './use-teams';
export { useTeam, TEAM_QUERY_KEY } from './use-team';
export { useTeamMembers, TEAM_MEMBERS_QUERY_KEY } from './use-team-members';
export { useInvitations, INVITATIONS_QUERY_KEY } from './use-invitations';

// Mutation hooks - Teams
export { useCreateTeam } from './use-create-team';
export { useUpdateTeam } from './use-update-team';
export { useDeleteTeam } from './use-delete-team';
export { useSwitchTeam } from './use-switch-team';

// Mutation hooks - Members
export { useUpdateMemberRoles } from './use-update-member-roles';
export { useRemoveMember } from './use-remove-member';
export { useLeaveTeam } from './use-leave-team';

// Mutation hooks - Invitations
export { useCreateInvitation } from './use-create-invitation';
export { useResendInvitation } from './use-resend-invitation';
export { useCancelInvitation } from './use-cancel-invitation';

// Permission hooks
export { useTeamPermissions } from './use-team-permissions';
export { useCanManageTeam } from './use-can-manage-team';
export { useCanManageMembers } from './use-can-manage-members';

// Types
export type { UpdateTeamVariables } from './use-update-team';
export type { UpdateMemberRolesVariables } from './use-update-member-roles';
export type { RemoveMemberVariables } from './use-remove-member';
export type { CreateInvitationVariables } from './use-create-invitation';
export type { ResendInvitationVariables } from './use-resend-invitation';
export type { CancelInvitationVariables } from './use-cancel-invitation';
export type { TeamPermissions } from './use-team-permissions';
