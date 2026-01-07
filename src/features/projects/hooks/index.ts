// ============================================================================
// PROJECT HOOKS BARREL EXPORTS
// ============================================================================

// Query Hooks
export { useProjects } from './use-projects'
export { useProject, projectKeys } from './use-project'
export { useProjectMembers } from './use-project-members'
export { useProjectInvitations } from './use-project-invitations'

// Mutation Hooks
export { useCreateProject } from './use-create-project'
export { useUpdateProject } from './use-update-project'
export { useDeleteProject } from './use-delete-project'
export { useJoinProject } from './use-join-project'
export { useLeaveProject } from './use-leave-project'
export { useUpdateMemberRole } from './use-update-member-role'
export { useRemoveMember } from './use-remove-member'
export { useCreateInvitation } from './use-create-invitation'
export { useRevokeInvitation } from './use-revoke-invitation'
export { useResendInvitation } from './use-resend-invitation'

// Filter Hooks
export { useProjectFilters, type ProjectFilters } from './use-project-filters'

// UI Hooks
export { useRecentProjects } from './use-recent-projects'
export { useTeamMemberSuggestions } from './use-team-member-suggestions'
