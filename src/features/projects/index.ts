// ============================================================================
// PROJECTS FEATURE PUBLIC API
// ============================================================================

// Types
export type {
  Project,
  ProjectStats,
  ProjectMember,
  ProjectWithStats,
  ProjectSummary,
  ProjectStatus,
  ProjectVisibility,
  ProjectRole,
} from './types'

// Hooks - Query
export {
  useProjects,
  useProject,
  useProjectMembers,
  useProjectAccessRequests,
  useMyAccessRequest,
  useProjectFilters,
  projectKeys,
} from './hooks'
export type { ProjectFilters } from './hooks'

// Hooks - Mutations
export {
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useJoinProject,
  useLeaveProject,
  useUpdateMemberRole,
  useRemoveMember,
  useCreateAccessRequest,
  useApproveAccessRequest,
  useDeclineAccessRequest,
  useCancelAccessRequest,
} from './hooks'

// API Functions (for advanced use cases)
export {
  getProjects,
  getProject,
  getProjectMembers,
  createProject,
  updateProject,
  deleteProject,
  joinProject,
  leaveProject,
  updateMemberRole,
  removeMember,
  createAccessRequest,
  listAccessRequests,
  approveAccessRequest,
  declineAccessRequest,
  cancelAccessRequest,
} from './api'

// API Types (for consumers who need request/response types)
export type {
  GetProjectsParams,
  GetProjectsResponse,
  GetProjectResponse,
  CreateProjectBody,
  CreateProjectResponse,
  UpdateProjectBody,
  UpdateProjectResponse,
  GetProjectMembersResponse,
  UpdateMemberRoleBody,
  UpdateMemberRoleResponse,
  RemoveMemberResponse,
  DeleteProjectResponse,
  LeaveMemberResponse,
  AccessRequest,
  AccessRequestStatus,
  AccessRequestWithRequester,
  CreateAccessRequestBody,
  CreateAccessRequestResponse,
  ListAccessRequestsResponse,
  AccessRequestActionResponse,
} from './api'

// Components
export {
  ProjectCard,
  ProjectFiltersComponent,
  ProjectCreateDialog,
  ProjectSettingsDialog,
  ProjectInvitationDialog,
  ProjectIssues,
  ProjectOverview,
  ProjectActivityFeed,
  ProjectDetailHeader,
  ProjectTitleSection,
  ProjectStats as ProjectStatsComponent,
  ProjectActions,
  ProjectLeaveButton,
  AccessRequestPanel,
  AccessRequestRow,
  AccessRequestList,

} from './components'

// Screens
export { ProjectsListScreen, InvitationAcceptanceScreen, AccessRequestScreen } from './screens'

// Utils
export { formatLastActivity, getRoleDisplayName, getRoleBadgeVariant } from './utils'
