// ============================================================================
// PROJECT DOMAIN TYPES
// ============================================================================

export type ProjectStatus = 'active' | 'archived'
export type ProjectVisibility = 'private' | 'public'
export type ProjectRole = 'owner' | 'editor' | 'member' | 'viewer'

export interface Project {
  id: string
  teamId: string
  name: string
  key: string
  slug: string
  description: string | null
  icon: string | null
  visibility: ProjectVisibility
  status: ProjectStatus
  createdAt: string
  updatedAt: string
}

export interface ProjectStats {
  totalTickets: number
  completedTickets: number
  progressPercent: number
  memberCount: number
}

export interface ProjectMember {
  userId: string
  userName: string
  userEmail: string
  userAvatar: string | null
  role: ProjectRole
  joinedAt: string
}

export interface ProjectWithStats extends Project {
  stats: ProjectStats
  userRole: ProjectRole | null
  canJoin: boolean
}

export interface ProjectSummary {
  id: string
  name: string
  key: string
  slug: string
  description: string | null
  icon: string | null
  visibility: ProjectVisibility
  status: ProjectStatus
  stats: ProjectStats
  userRole: ProjectRole | null
  canJoin: boolean
  updatedAt: string
}

