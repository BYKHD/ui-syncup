import { RemixiconComponentType } from "@remixicon/react"

// ============================================================================
// CORE TYPES FOR SIDEBAR MOCKUP
// ============================================================================

/**
 * Team entity for mockup UI
 */
export interface Team {
  id: string
  name: string
  image?: string | null
  plan: 'free' | 'pro' | 'enterprise'
}

/**
 * Project entity for mockup UI
 */
export interface Project {
  id: string
  name: string
  url: string
  icon: string | null
}

/**
 * Navigation item for sidebar menu
 */
export interface NavItem {
  title: string
  url: string
  icon?: RemixiconComponentType
  isActive?: boolean
  items?: NavSubItem[]
}

/**
 * Navigation sub-item (nested under NavItem)
 */
export interface NavSubItem {
  title: string
  url: string
  isActive?: boolean
}

/**
 * User entity for mockup UI
 */
export interface User {
  name: string
  email: string
  image?: string | null
}

// ============================================================================
// MOCK DATA FOR SIDEBAR
// ============================================================================

export const MOCK_TEAMS: Team[] = [
  {
    id: '1',
    name: 'Acme Corp',
    image: null,
    plan: 'pro',
  },
  {
    id: '2',
    name: 'Design Studio',
    image: null,
    plan: 'free',
  },
  {
    id: '3',
    name: 'Tech Startup',
    image: null,
    plan: 'enterprise',
  },
]

export const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    name: 'Website Redesign',
    url: '#',
    icon: 'RiLayoutLine',
  },
  {
    id: '2',
    name: 'Mobile App',
    url: '#',
    icon: 'RiSmartphoneLine',
  },
  {
    id: '3',
    name: 'Marketing Campaign',
    url: '#',
    icon: 'RiBarChartBoxLine',
  },
]



// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get plan display name for UI
 */
/**
 * Get plan display name for UI
 */
export function getPlanDisplayName(plan: string): string {
  const planNames: Record<string, string> = {
    free: 'Free',
    pro: 'Pro',
    enterprise: 'Enterprise',
  }
  return planNames[plan] || plan || 'Free'
}
