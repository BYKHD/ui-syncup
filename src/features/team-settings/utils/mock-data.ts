/**
 * Settings Feature Utils
 * Constants and helper functions (mock data moved to @/mocks)
 */

import type { Team, NotificationPreference, UserRole } from "../types";
import {
  MOCK_TEAMS,
  MOCK_NOTIFICATION_PREFERENCES,
  MOCK_NOTIFICATION_PREFERENCES_RESPONSE,
  NOTIFICATION_TYPES,
  MOCK_USER_ROLES,
  MOCK_DEFAULT_USER_ROLE,
  MOCK_DEFAULT_TEAM,
} from "@/mocks";

// Re-export mock data for backward compatibility
export {
  MOCK_TEAMS,
  MOCK_DEFAULT_TEAM,
  MOCK_USER_ROLES,
  MOCK_DEFAULT_USER_ROLE,
  NOTIFICATION_TYPES,
  MOCK_NOTIFICATION_PREFERENCES,
  MOCK_NOTIFICATION_PREFERENCES_RESPONSE,
};

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
// HELPER FUNCTIONS
// ============================================================================

/**
 * Simulate API delay for realistic loading states
 * @param ms - Delay in milliseconds (default: 1500ms)
 */
export const simulateApiDelay = (ms: number = 1500): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

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
