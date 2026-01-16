// ============================================================================
// SIDEBAR COMPONENTS - BARREL EXPORTS
// ============================================================================
//
// This file provides clean imports for all sidebar-related components
// following the compound component pattern as per AGENTS.md
//

// Main navigation components
export { NavMain } from './sidebar-main'
export { NavProjects } from './sidebar-project'

// Team management components
export { TeamSwitcher } from './sidebar-team-switcher'
export { TeamAvatar, generateTeamInitials } from './sidebar-team-avatar'

// Types and mock data
export type { Team, Project, NavItem, NavSubItem, User } from './type'
export {
  MOCK_TEAMS,
  MOCK_PROJECTS,
} from './type'

// ============================================================================
// USAGE EXAMPLES
// ============================================================================
//
// Import individual components:
// import { NavMain, NavProjects, TeamSwitcher } from '@/components/shared/sidebar'
//
// Import types:
// import type { Team, NavItem } from '@/components/shared/sidebar'
//
// Import mock data:
// import { MOCK_TEAMS, MOCK_PROJECTS } from '@/components/shared/sidebar'
//
