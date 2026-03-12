// ============================================================================
// TEAM MOCK FIXTURES
// ============================================================================

export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer'

export interface Team {
  id: string
  name: string
  image: string | null
}

export const MOCK_TEAM_ID = '550e8400-e29b-41d4-a716-446655440000'

export const MOCK_MEMBER_ROLE: MemberRole = 'member'

export const MOCK_TEAMS: Team[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Acme Inc',
    image: null,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'TechCorp',
    image: 'https://api.dicebear.com/7.x/initials/svg?seed=TechCorp',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Design Studio',
    image: null,
  },
]

export const MOCK_DEFAULT_TEAM = MOCK_TEAMS[0]
