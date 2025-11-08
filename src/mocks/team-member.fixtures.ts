// ============================================================================
// TEAM MEMBER MOCK FIXTURES
// ============================================================================

import type { UserRole } from './user.fixtures'

export type TeamRole = UserRole

export interface TeamMember {
  id: string
  teamId: string
  userId: string
  role: TeamRole
  joinedAt: Date
}

export interface TeamMemberWithUser extends TeamMember {
  user: {
    id: string
    name: string
    email: string
    image?: string
  }
}

export interface TeamInvitation {
  id: string
  teamId: string
  email: string
  role: Exclude<TeamRole, 'owner'>
  status: 'pending' | 'accepted' | 'expired'
  expiresAt: Date
  createdAt: Date
  invitedBy: string
}

// Mock team members with full user details
export const MOCK_TEAM_MEMBERS: TeamMemberWithUser[] = [
  {
    id: 'member-1',
    teamId: 'team-123',
    userId: 'user-1',
    role: 'owner',
    joinedAt: new Date('2024-01-15'),
    user: {
      id: 'user-1',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@acme.com',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    },
  },
  {
    id: 'member-2',
    teamId: 'team-123',
    userId: 'user-2',
    role: 'admin',
    joinedAt: new Date('2024-02-01'),
    user: {
      id: 'user-2',
      name: 'Michael Chen',
      email: 'michael.chen@acme.com',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
    },
  },
  {
    id: 'member-3',
    teamId: 'team-123',
    userId: 'user-3',
    role: 'member',
    joinedAt: new Date('2024-02-15'),
    user: {
      id: 'user-3',
      name: 'Emily Rodriguez',
      email: 'emily.rodriguez@acme.com',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
    },
  },
  {
    id: 'member-4',
    teamId: 'team-123',
    userId: 'user-4',
    role: 'member',
    joinedAt: new Date('2024-03-01'),
    user: {
      id: 'user-4',
      name: 'David Kim',
      email: 'david.kim@acme.com',
    },
  },
  {
    id: 'member-5',
    teamId: 'team-123',
    userId: 'user-5',
    role: 'viewer',
    joinedAt: new Date('2024-03-10'),
    user: {
      id: 'user-5',
      name: 'Anna Martinez',
      email: 'anna.martinez@acme.com',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anna',
    },
  },
]

// Mock pending invitations
export const MOCK_TEAM_INVITATIONS: TeamInvitation[] = [
  {
    id: 'invite-1',
    teamId: 'team-123',
    email: 'john.doe@example.com',
    role: 'member',
    status: 'pending',
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    invitedBy: 'user-1',
  },
  {
    id: 'invite-2',
    teamId: 'team-123',
    email: 'jane.smith@example.com',
    role: 'admin',
    status: 'pending',
    expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    invitedBy: 'user-1',
  },
  {
    id: 'invite-3',
    teamId: 'team-123',
    email: 'expired.user@example.com',
    role: 'viewer',
    status: 'pending',
    expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago (expired)
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
    invitedBy: 'user-2',
  },
]

// Helper to get members by team
export const getMockTeamMembers = (teamId: string): TeamMemberWithUser[] => {
  return MOCK_TEAM_MEMBERS.filter((member) => member.teamId === teamId)
}

// Helper to get invitations by team
export const getMockTeamInvitations = (teamId: string): TeamInvitation[] => {
  return MOCK_TEAM_INVITATIONS.filter((invitation) => invitation.teamId === teamId)
}
