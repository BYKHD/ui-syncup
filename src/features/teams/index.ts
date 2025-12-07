// ============================================================================
// TEAMS FEATURE - BARREL EXPORTS
// ============================================================================
//
// This feature module handles all team-related functionality including
// team creation, management, and team-specific UI components.
//
// Following AGENTS.md feature-first architecture:
// - Feature-specific components live in components/
// - Feature hooks live in hooks/
// - Feature API fetchers live in api/
// - Feature types live in api/types
//

// Components
export { CreateTeamDialog } from './components/create-team-dialog'
export { PlanLimitDialog } from './components/plan-limit-dialog'

// Hooks - Query
export {
  useTeams,
  useTeam,
  useTeamMembers,
  useInvitations,
  TEAMS_QUERY_KEY,
  TEAM_QUERY_KEY,
  TEAM_MEMBERS_QUERY_KEY,
  INVITATIONS_QUERY_KEY,
} from './hooks'

// Hooks - Mutation (Teams)
export {
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useSwitchTeam,
} from './hooks'

// Hooks - Mutation (Members)
export {
  useUpdateMemberRoles,
  useRemoveMember,
  useLeaveTeam,
} from './hooks'

// Hooks - Mutation (Invitations)
export {
  useCreateInvitation,
  useResendInvitation,
  useCancelInvitation,
} from './hooks'

// Hooks - Permissions
export {
  useTeamPermissions,
  useCanManageTeam,
  useCanManageMembers,
} from './hooks'

// Types
export type {
  Team,
  TeamWithMemberInfo,
  TeamMember,
  Invitation,
  CreateTeamInput,
  UpdateTeamInput,
  UpdateMemberRolesInput,
  CreateInvitationInput,
  Pagination,
  TeamsResponse,
  TeamResponse,
  MembersResponse,
  InvitationsResponse,
  GetTeamsParams,
  GetTeamMembersParams,
  GetInvitationsParams,
  DeleteTeamResponse,
  UpdateMemberRolesResponse,
  RemoveMemberResponse,
  LeaveTeamResponse,
  CreateInvitationResponse,
  ResendInvitationResponse,
  CancelInvitationResponse,
} from './api'

export type {
  UpdateTeamVariables,
  UpdateMemberRolesVariables,
  RemoveMemberVariables,
  CreateInvitationVariables,
  ResendInvitationVariables,
  CancelInvitationVariables,
  TeamPermissions,
} from './hooks'

// ============================================================================
// USAGE EXAMPLES
// ============================================================================
//
// Import team components:
// import { CreateTeamDialog } from '@/features/teams'
//
// Import team hooks:
// import { useTeams, useTeam, useTeamMembers } from '@/features/teams'
//
// Import team types:
// import type { Team, TeamMember } from '@/features/teams'
//
// This keeps team functionality portable and organized
//
