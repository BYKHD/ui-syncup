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

} from './components'

// Screens
export { ProjectsListScreen } from './screens'

// Utils
export { formatLastActivity, getRoleDisplayName, getRoleBadgeVariant } from './utils'
