// src/server/setup/types.ts

/**
 * Types for the setup module
 */

import type { InstanceSettings } from "@/server/db/schema/instance-settings";

/**
 * Service status for health checks
 */
export type ServiceStatus = "connected" | "not_configured" | "error";

/**
 * Individual service health status
 */
export interface ServiceHealthStatus {
  status: ServiceStatus;
  message: string;
  degradedBehavior?: string;
}

/**
 * Complete health check result for all services
 */
export interface ServiceHealth {
  database: ServiceHealthStatus;
  email: ServiceHealthStatus;
  storage: ServiceHealthStatus;
  redis: ServiceHealthStatus;
}

/**
 * Instance status returned by getInstanceStatus
 */
export interface InstanceStatus {
  /** Whether initial setup has been completed */
  isSetupComplete: boolean;
  /** Instance display name */
  instanceName: string | null;
  /** Admin user email */
  adminEmail: string | null;
  /** Default workspace ID for single-workspace mode */
  defaultWorkspaceId: string | null;
  /** Default role for new users in single-team mode */
  defaultMemberRole: "TEAM_VIEWER" | "TEAM_MEMBER" | "TEAM_EDITOR";
  /** Whether multi-team mode is enabled */
  isMultiTeamMode: boolean;
  /** Whether email verification is skipped */
  skipEmailVerification: boolean;
}

/**
 * Admin creation input
 */
export interface CreateAdminInput {
  email: string;
  password: string;
  displayName: string;
}

/**
 * Instance configuration input
 */
export interface InstanceConfigInput {
  instanceName: string;
  defaultMemberRole?: "TEAM_VIEWER" | "TEAM_MEMBER" | "TEAM_EDITOR";
}

/**
 * Setup completion input
 */
export interface CompleteSetupInput {
  teamName: string;
  teamSlug?: string;
  createSampleData?: boolean;
}

/**
 * Setup wizard step
 */
export type SetupWizardStep =
  | "health-check"
  | "admin-account"
  | "instance-config"
  | "first-team"
  | "sample-data"
  | "complete";

/**
 * Mapped instance settings for external use
 */
export type MappedInstanceSettings = Omit<InstanceSettings, "adminUserId" | "defaultWorkspaceId"> & {
  adminUserId: string | null;
  defaultWorkspaceId: string | null;
};
