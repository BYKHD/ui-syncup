// ============================================================================
// PROJECT INVITATION MOCK FIXTURES
// ============================================================================

import type { ProjectRole } from '@features/projects/types'

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired'

export interface ProjectInvitation {
  id: string
  projectId: string
  invitedUserId: string
  role: Exclude<ProjectRole, 'owner'>
  status: InvitationStatus
  createdAt: Date
  expiresAt: Date
  invitedUser: {
    id: string
    name: string
    email: string
    image?: string | null
  }
  invitedByUser: {
    id: string
    name: string
    email: string
    image?: string | null
  }
}

export const MOCK_PROJECT_INVITATIONS: ProjectInvitation[] = [
  {
    id: 'inv_1',
    projectId: 'proj_1',
    invitedUserId: 'user_6',
    role: 'editor',
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    invitedUser: {
      id: 'user_6',
      name: 'Alex Thompson',
      email: 'alex.thompson@example.com',
      image: null,
    },
    invitedByUser: {
      id: 'user_1',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@example.com',
      image: null,
    },
  },
  {
    id: 'inv_2',
    projectId: 'proj_1',
    invitedUserId: 'user_7',
    role: 'member',
    status: 'pending',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
    invitedUser: {
      id: 'user_7',
      name: 'Rachel Lee',
      email: 'rachel.lee@example.com',
      image: null,
    },
    invitedByUser: {
      id: 'user_2',
      name: 'Michael Chen',
      email: 'michael.chen@example.com',
      image: null,
    },
  },
  {
    id: 'inv_3',
    projectId: 'proj_1',
    invitedUserId: 'user_8',
    role: 'viewer',
    status: 'declined',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    expiresAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    invitedUser: {
      id: 'user_8',
      name: 'Tom Anderson',
      email: 'tom.anderson@example.com',
      image: null,
    },
    invitedByUser: {
      id: 'user_1',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@example.com',
      image: null,
    },
  },
]
