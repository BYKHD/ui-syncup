// src/config/auth.ts

/**
 * Authentication Configuration
 * 
 * Configures authentication behavior for self-hosted instances.
 * These settings are read from environment variables at startup.
 */

/**
 * Auth configuration read from environment variables.
 */
export const AUTH_CONFIG = {
  /**
   * Whether to skip email verification for new user accounts.
   * Useful for internal deployments where email is not configured.
   * 
   * WARNING: Disabling email verification reduces security.
   * Only use in trusted internal networks.
   */
  skipEmailVerification: process.env.SKIP_EMAIL_VERIFICATION === "true",
} as const;

/**
 * Check if email verification is required for new accounts.
 * 
 * Email verification is required by default unless:
 * - SKIP_EMAIL_VERIFICATION=true is set in environment
 * 
 * When email verification is skipped:
 * - New accounts are marked as verified immediately
 * - Password reset still works via CLI: `bun run admin:reset-password <email>`
 * - A warning is logged at startup
 * 
 * @returns true if email verification is required, false if it can be skipped
 */
export function isEmailVerificationRequired(): boolean {
  return !AUTH_CONFIG.skipEmailVerification;
}

/**
 * Check if email verification is disabled.
 * 
 * @returns true if SKIP_EMAIL_VERIFICATION=true
 */
export function isEmailVerificationSkipped(): boolean {
  return AUTH_CONFIG.skipEmailVerification;
}

/**
 * Log a warning if email verification is disabled.
 * This should be called at application startup.
 */
export function logEmailVerificationWarning(): void {
  if (AUTH_CONFIG.skipEmailVerification) {
    console.warn(
      "[AUTH WARNING] Email verification is disabled (SKIP_EMAIL_VERIFICATION=true). " +
      "New accounts will not require email verification. " +
      "This should only be used in trusted internal networks."
    );
  }
}
