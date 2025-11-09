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

// Hooks
export { useProjects, useProjectFilters, useJoinProject } from './hooks'
export type { ProjectFilters } from './hooks'

// Components
export {
  ProjectCard,
  ProjectFiltersComponent,
  ProjectCreateDialog,
  ProjectMemberManager,
} from './components'

// Screens
export { ProjectsListScreen } from './screens'

// Utils
export { formatLastActivity, getRoleDisplayName, getRoleBadgeVariant } from './utils'
