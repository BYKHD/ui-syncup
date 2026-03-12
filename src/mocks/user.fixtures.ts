// ============================================================================
// USER MOCK FIXTURES
// ============================================================================

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer'

export const MOCK_USER_ROLES: Record<string, UserRole> = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
}

export const MOCK_DEFAULT_USER_ROLE: UserRole = MOCK_USER_ROLES.OWNER

export const MOCK_USER = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  image: null,
}

