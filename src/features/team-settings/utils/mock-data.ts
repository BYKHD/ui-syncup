/**
 * Settings Feature Utils
 * Constants and helper functions for team settings
 *
 * Note: Mock data lives in @/mocks following AGENTS.md guidelines.
 * Import mocks directly from @/mocks, not from this feature.
 */

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
