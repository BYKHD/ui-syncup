/**
 * Shared type definitions for the UI SyncUp CLI
 *
 * These types define the contracts used across CLI commands and library services.
 * @module cli/lib/types
 */

// ============================================================================
// Command Result Types
// ============================================================================

/** Result of a CLI operation */
export interface CommandResult {
  success: boolean;
  message?: string;
  error?: Error;
}

/** Setup mode selection for init command */
export type SetupMode = "local" | "production";

/** Deployment method for production init */
export type DeploymentMethod = "allinone" | "external" | "dockerfile";

/** Storage provider selection for production wizard */
export type StorageProvider = "r2" | "s3" | "minio";

/** Email provider selection for production wizard */
export type EmailProvider = "resend" | "smtp" | "skip";

/** Production configuration collected from interactive wizard */
export interface ProductionConfig {
  /** How the user wants to deploy */
  deploymentMethod: DeploymentMethod;
  /** Public-facing application URL (e.g. https://app.example.com) */
  appUrl: string;
  /** Auto-generated auth secret */
  authSecret: string;
  /** Email provider choice */
  emailProvider: EmailProvider;

  // ── External / Dockerfile fields (not required for all-in-one) ──

  /** PostgreSQL connection string (external/dockerfile only) */
  databaseUrl?: string;
  /** Direct database connection string (external/dockerfile only) */
  directUrl?: string;
  /** Storage provider choice (external/dockerfile only) */
  storageProvider?: StorageProvider;
  /** S3-compatible endpoint URL (external/dockerfile only) */
  storageEndpoint?: string;
  /** Storage region (external/dockerfile only) */
  storageRegion?: string;
  /** Storage access key ID (external/dockerfile only) */
  storageAccessKeyId?: string;
  /** Storage secret access key (external/dockerfile only) */
  storageSecretAccessKey?: string;

  // ── All-in-one auto-generated credentials ──

  /** Auto-generated PostgreSQL password (all-in-one only) */
  postgresPassword?: string;
  /** Auto-generated MinIO root user (all-in-one only) */
  minioRootUser?: string;
  /** Auto-generated MinIO root password (all-in-one only) */
  minioRootPassword?: string;

  // ── Email credentials ──

  /** Resend API key (when emailProvider is 'resend') */
  resendApiKey?: string;
  /** Resend from email (when emailProvider is 'resend') */
  resendFromEmail?: string;
  /** SMTP host (when emailProvider is 'smtp') */
  smtpHost?: string;
  /** SMTP port (when emailProvider is 'smtp') */
  smtpPort?: string;
  /** SMTP user (when emailProvider is 'smtp') */
  smtpUser?: string;
  /** SMTP password (when emailProvider is 'smtp') */
  smtpPassword?: string;
  /** SMTP from email (when emailProvider is 'smtp') */
  smtpFromEmail?: string;
}

// ============================================================================
// Environment Detection Types
// ============================================================================

/** Environment detection result from system checks */
export interface EnvironmentCheck {
  /** Bun runtime is installed */
  bunInstalled: boolean;
  /** Bun version string if detected */
  bunVersion?: string;
  /** Docker is installed on the system */
  dockerInstalled: boolean;
  /** Docker daemon is currently running */
  dockerRunning: boolean;
  /** Docker version string if detected */
  dockerVersion?: string;
  /** Supabase CLI is installed */
  supabaseInstalled: boolean;
  /** Supabase CLI version if detected */
  supabaseVersion?: string;
  /** Required ports are available */
  portsAvailable: boolean;
  /** List of ports that are in use */
  unavailablePorts?: number[];
}

// ============================================================================
// File System Types
// ============================================================================

/** File operation result for tracking changes */
export interface FileOperationResult {
  /** Path to the file operated on */
  path: string;
  /** Action performed on the file */
  action: "created" | "modified" | "deleted" | "skipped" | "backed_up";
  /** Whether the operation succeeded */
  success: boolean;
  /** Error message if operation failed */
  error?: string;
}

// ============================================================================
// Service Types
// ============================================================================

/** Docker/Supabase service status */
export interface ServiceStatus {
  /** Service identifier */
  name: string;
  /** Current status of the service */
  status: "running" | "stopped" | "starting" | "error";
  /** URL where the service is accessible (if running) */
  url?: string;
  /** Error message if service is in error state */
  error?: string;
}

// ============================================================================
// CLI Options Types
// ============================================================================

/** Global CLI options available to all commands */
export interface GlobalOptions {
  /** Enable verbose/debug output */
  verbose: boolean;
  /** Colored output enabled (disabled with --no-color) */
  color: boolean;
  /** Run in non-interactive mode (auto-detected in CI) */
  nonInteractive: boolean;
}

// ============================================================================
// Configuration Types
// ============================================================================

/** Project configuration file schema (ui-syncup.config.json)
 *
 * V1 scope: Only `version` and `defaults.mode` are active.
 * Additional config keys (ports, verbose) are reserved for future versions.
 */
export interface ProjectConfig {
  /** Schema version for migration support */
  version: string;
  /** Default settings that can be overridden by CLI flags */
  defaults?: {
    /** Default setup mode */
    mode?: SetupMode;
  };
}

/** Status returned when loading project configuration from disk */
export type ProjectConfigLoadStatus =
  | "ok"
  | "missing"
  | "invalid"
  | "newer_schema"
  | "io_error";

/** Structured result for project config loading */
export interface ProjectConfigLoadResult {
  status: ProjectConfigLoadStatus;
  config?: ProjectConfig;
  error?: string;
  foundVersion?: string;
  currentVersion?: string;
}

// ============================================================================
// Error Types
// ============================================================================

/** Exit codes for CLI operations */
export enum ExitCode {
  /** Command completed successfully */
  Success = 0,
  /** User cancelled the operation */
  UserAbort = 1,
  /** Validation error (missing dependency, invalid config) */
  ValidationError = 2,
  /** External command failed (Docker, Supabase CLI) */
  ExternalError = 3,
  /** Unexpected internal error */
  InternalError = 4,
}
