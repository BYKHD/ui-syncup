// ============================================================================
// PROJECT MEMBER MOCK FIXTURES
// ============================================================================

import type { ProjectRole } from '@/features/projects/types'

export interface ProjectMember {
  id: string
  userId: string
  projectId: string
  role: ProjectRole
  invitedBy: string | null
  joinedAt: Date
  user: {
    id: string
    name: string
    email: string
    image?: string | null
  }
}

export const MOCK_PROJECT_MEMBERS: ProjectMember[] = [
  {
    id: 'pm_1',
    userId: 'user_1',
    projectId: 'proj_1',
    role: 'owner',
    invitedBy: null,
    joinedAt: new Date('2024-01-15T10:00:00Z'),
    user: {
      id: 'user_1',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@example.com',
      image: null,
    },
  },
  {
    id: 'pm_2',
    userId: 'user_2',
    projectId: 'proj_1',
    role: 'editor',
    invitedBy: 'user_1',
    joinedAt: new Date('2024-01-20T14:30:00Z'),
    user: {
      id: 'user_2',
      name: 'Michael Chen',
      email: 'michael.chen@example.com',
      image: null,
    },
  },
  {
    id: 'pm_3',
    userId: 'user_3',
    projectId: 'proj_1',
    role: 'member',
    invitedBy: 'user_1',
    joinedAt: new Date('2024-02-01T09:15:00Z'),
    user: {
      id: 'user_3',
      name: 'Emily Rodriguez',
      email: 'emily.rodriguez@example.com',
      image: null,
    },
  },
  {
    id: 'pm_4',
    userId: 'user_4',
    projectId: 'proj_1',
    role: 'viewer',
    invitedBy: 'user_2',
    joinedAt: new Date('2024-02-15T11:00:00Z'),
    user: {
      id: 'user_4',
      name: 'David Kim',
      email: 'david.kim@example.com',
      image: null,
    },
  },
  {
    id: 'pm_5',
    userId: 'user_5',
    projectId: 'proj_1',
    role: 'member',
    invitedBy: 'user_1',
    joinedAt: new Date('2024-03-01T13:45:00Z'),
    user: {
      id: 'user_5',
      name: 'Jessica Williams',
      email: 'jessica.williams@example.com',
      image: null,
    },
  },
]
