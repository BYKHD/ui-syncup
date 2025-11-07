// ============================================================================
// SIDEBAR COMPONENTS - BARREL EXPORTS
// ============================================================================
//
// This file provides clean imports for all sidebar-related components
// following the compound component pattern as per AGENTS.md
//

// Main navigation components
export { NavMain } from './sidebar-root'
export { NavProjects } from './sidebar-project'
export { NavUser } from './sidebar-user'

// Team management components
export { TeamSwitcher } from './team-switcher'
export { TeamAvatar, generateTeamInitials } from './sidebar-team-avatar'
export { CreateTeamDialog } from './create-team-dialog'

// Types and mock data
export type { Team, Project, NavItem, NavSubItem, User } from './type'
export {
  MOCK_TEAMS,
  MOCK_PROJECTS,
  MOCK_USER,
  getPlanDisplayName
} from './type'

// ============================================================================
// USAGE EXAMPLES
// ============================================================================
//
// Import individual components:
// import { NavMain, NavProjects, TeamSwitcher } from '@components/shared/sidebar'
//
// Import types:
// import type { Team, NavItem } from '@components/shared/sidebar'
//
// Import mock data:
// import { MOCK_TEAMS, MOCK_PROJECTS } from '@components/shared/sidebar'
//
