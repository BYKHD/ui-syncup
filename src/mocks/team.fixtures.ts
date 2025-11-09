// ============================================================================
// TEAM MOCK FIXTURES
// ============================================================================

export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer'

export interface Team {
  id: string
  name: string
  image: string | null
}

export const MOCK_TEAM_ID = 'team-mock-123'

export const MOCK_MEMBER_ROLE: MemberRole = 'member'

export const MOCK_TEAMS: Team[] = [
  {
    id: 'team-123',
    name: 'Acme Inc',
    image: null,
  },
  {
    id: 'team-456',
    name: 'TechCorp',
    image: 'https://api.dicebear.com/7.x/initials/svg?seed=TechCorp',
  },
  {
    id: 'team-789',
    name: 'Design Studio',
    image: null,
  },
]

export const MOCK_DEFAULT_TEAM = MOCK_TEAMS[0]
