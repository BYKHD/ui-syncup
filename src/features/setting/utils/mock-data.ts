/**
 * Mock Data for Settings Feature
 * All mock constants and sample data for UI development
 */

import type { Team, NotificationPreference, UserRole } from "../types";

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Allowed image types for team avatars
 */
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Maximum image size in bytes (5MB)
 */
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Email notifications feature flag
 * In real implementation, this would come from environment variables
 */
export const EMAIL_GATE_ENABLED =
  process.env.NEXT_PUBLIC_EMAIL_NOTIFICATIONS_ENABLED?.toLowerCase() === 'true';

// ============================================================================
// MOCK TEAMS
// ============================================================================

/**
 * Mock team data for UI development
 */
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
];

/**
 * Default mock team (first team)
 */
export const MOCK_DEFAULT_TEAM = MOCK_TEAMS[0];

// ============================================================================
// MOCK USER ROLES
// ============================================================================

/**
 * Mock user roles for testing different permission states
 */
export const MOCK_USER_ROLES: Record<string, UserRole> = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
};

/**
 * Default mock user role
 */
export const MOCK_DEFAULT_USER_ROLE: UserRole = MOCK_USER_ROLES.OWNER;

// ============================================================================
// MOCK NOTIFICATION PREFERENCES
// ============================================================================

/**
 * Mock notification preference types
 */
export const NOTIFICATION_TYPES = [
  'issue_assigned',
  'issue_commented',
  'issue_status_changed',
  'mention',
  'team_invite',
  'project_update',
] as const;

/**
 * Mock notification preferences data
 */
export const MOCK_NOTIFICATION_PREFERENCES: NotificationPreference[] = [
  {
    type: 'issue_assigned',
    enabled: true,
    emailEnabled: true,
  },
  {
    type: 'issue_commented',
    enabled: true,
    emailEnabled: false,
  },
  {
    type: 'issue_status_changed',
    enabled: true,
    emailEnabled: true,
  },
  {
    type: 'mention',
    enabled: true,
    emailEnabled: true,
  },
  {
    type: 'team_invite',
    enabled: true,
    emailEnabled: true,
  },
  {
    type: 'project_update',
    enabled: false,
    emailEnabled: false,
  },
];

// ============================================================================
// MOCK API RESPONSES
// ============================================================================

/**
 * Mock API response for notification preferences
 */
export const MOCK_NOTIFICATION_PREFERENCES_RESPONSE = {
  success: true,
  preferences: MOCK_NOTIFICATION_PREFERENCES,
};

/**
 * Simulate API delay for realistic loading states
 * @param ms - Delay in milliseconds (default: 1500ms)
 */
export const simulateApiDelay = (ms: number = 1500): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a mock team by ID
 * @param teamId - The team ID to find
 * @returns The mock team or undefined
 */
export const getMockTeamById = (teamId: string): Team | undefined => {
  return MOCK_TEAMS.find(team => team.id === teamId);
};

/**
 * Get mock notification preference by type
 * @param type - The notification type
 * @returns The mock preference or undefined
 */
export const getMockNotificationPreference = (
  type: string
): NotificationPreference | undefined => {
  return MOCK_NOTIFICATION_PREFERENCES.find(pref => pref.type === type);
};

/**
 * Check if a role has permission (mock implementation)
 * @param role - The user role
 * @param permission - The permission to check
 * @returns Whether the role has the permission
 */
export const mockHasPermission = (
  role: UserRole,
  permission: string
): boolean => {
  const roleHierarchy: Record<UserRole, number> = {
    owner: 4,
    admin: 3,
    member: 2,
    viewer: 1,
  };

  const permissionRequirements: Record<string, number> = {
    'team.edit': 4, // Only owner
    'team.delete': 4, // Only owner
    'settings.edit': 3, // Admin and above
    'settings.view': 1, // All roles
    'members.invite': 3, // Admin and above
    'members.remove': 3, // Admin and above
  };

  const requiredLevel = permissionRequirements[permission] ?? 1;
  const userLevel = roleHierarchy[role] ?? 0;

  return userLevel >= requiredLevel;
};
