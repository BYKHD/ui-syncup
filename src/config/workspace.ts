// src/config/workspace.ts

/**
 * Workspace Mode Configuration
 * 
 * Determines whether the instance operates in single-workspace or multi-workspace mode.
 * This is configured via the MULTI_WORKSPACE_MODE environment variable.
 * 
 * - Single-workspace mode (default): Simplified UI, no workspace switcher, auto-join
 * - Multi-workspace mode: Full workspace management, switcher visible, create/join options
 */

export type WorkspaceMode = "single" | "multi";

/**
 * Workspace configuration read from environment variables.
 * This is evaluated at startup and remains constant for the application lifecycle.
 */
export const WORKSPACE_CONFIG = {
  /**
   * Whether multi-workspace mode is enabled.
   * Defaults to false (single-workspace mode).
   */
  multiWorkspaceMode: process.env.MULTI_WORKSPACE_MODE === "true",
} as const;

/**
 * Check if the instance is operating in multi-workspace mode.
 * 
 * Multi-workspace mode enables:
 * - Workspace switcher in sidebar
 * - Create new workspace option
 * - Multiple workspace memberships per user
 * - Workspace selection during onboarding
 * 
 * @returns true if MULTI_WORKSPACE_MODE=true, false otherwise
 */
export function isMultiWorkspaceMode(): boolean {
  return WORKSPACE_CONFIG.multiWorkspaceMode;
}

/**
 * Check if the instance is operating in single-workspace mode.
 * 
 * Single-workspace mode enables:
 * - Hidden workspace switcher
 * - Auto-join default workspace for new users
 * - Simplified settings navigation
 * - No "Create workspace" buttons
 * 
 * @returns true if MULTI_WORKSPACE_MODE is not set or is false
 */
export function isSingleWorkspaceMode(): boolean {
  return !WORKSPACE_CONFIG.multiWorkspaceMode;
}

/**
 * Get the current workspace mode.
 * 
 * @returns "single" or "multi"
 */
export function getWorkspaceMode(): WorkspaceMode {
  return WORKSPACE_CONFIG.multiWorkspaceMode ? "multi" : "single";
}
