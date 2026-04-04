// src/config/team.ts

/**
 * Team Mode Configuration
 *
 * Determines whether the instance operates in single-team or multi-team mode.
 * This is configured via the MULTI_TEAM_MODE environment variable.
 *
 * - Single-team mode (default): Simplified UI, no team switcher, auto-join
 * - Multi-team mode: Full team management, switcher visible, create/join options
 */

export type TeamMode = "single" | "multi";

/**
 * Team configuration read from environment variables.
 * This is evaluated at startup and remains constant for the application lifecycle.
 */
export const TEAM_CONFIG = {
  /**
   * Whether multi-team mode is enabled.
   * Defaults to false (single-team mode).
   */
  multiTeamMode: process.env.MULTI_TEAM_MODE === "true",
} as const;

/**
 * Check if the instance is operating in multi-team mode.
 *
 * Multi-team mode enables:
 * - Team switcher in sidebar
 * - Create new team option
 * - Multiple team memberships per user
 * - Team selection during onboarding
 *
 * @returns true if MULTI_TEAM_MODE=true, false otherwise
 */
export function isMultiTeamMode(): boolean {
  return TEAM_CONFIG.multiTeamMode;
}

/**
 * Check if the instance is operating in single-team mode.
 *
 * Single-team mode enables:
 * - Hidden team switcher
 * - Auto-join default team for new users
 * - Simplified settings navigation
 * - No "Create team" buttons
 *
 * @returns true if MULTI_TEAM_MODE is not set or is false
 */
export function isSingleTeamMode(): boolean {
  return !TEAM_CONFIG.multiTeamMode;
}

/**
 * Get the current team mode.
 *
 * @returns "single" or "multi"
 */
export function getTeamMode(): TeamMode {
  return TEAM_CONFIG.multiTeamMode ? "multi" : "single";
}

// Backwards-compatible aliases (deprecated — use MULTI_TEAM_MODE env var and TEAM_* functions)
/** @deprecated Use TEAM_CONFIG */
export const WORKSPACE_CONFIG = TEAM_CONFIG;
/** @deprecated Use TeamMode */
export type WorkspaceMode = TeamMode;
/** @deprecated Use isMultiTeamMode */
export const isMultiWorkspaceMode = isMultiTeamMode;
/** @deprecated Use isSingleTeamMode */
export const isSingleWorkspaceMode = isSingleTeamMode;
/** @deprecated Use getTeamMode */
export const getWorkspaceMode = getTeamMode;
