/**
 * Shared constants for the UI SyncUp CLI
 *
 * Central location for all static configuration values used across CLI commands.
 * @module cli/lib/constants
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ============================================================================
// Version Information
// ============================================================================

/**
 * Read version from package.json at runtime
 * Falls back to "0.0.0" if package.json cannot be read
 */
function getVersion(): string {
  try {
    // Get the directory of the current module
    const currentDir = dirname(fileURLToPath(import.meta.url));
    // Navigate up to project root (cli/lib -> cli -> project root)
    const packagePath = join(currentDir, "..", "..", "package.json");
    const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
    return packageJson.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/** CLI version from package.json */
export const VERSION = getVersion();

// ============================================================================
// Directory Paths
// ============================================================================

/** Storage directory paths relative to project root */
export const STORAGE_DIRS = {
  /** Root storage directory */
  root: "storage",
  /** Upload files storage */
  uploads: "storage/uploads",
  /** User avatar storage */
  avatars: "storage/avatars",
} as const;

// ============================================================================
// Configuration Files
// ============================================================================

/** Environment file names */
export const ENV_FILES = {
  /** Local development environment */
  local: ".env.local",
  /** Production environment */
  production: ".env.production",
  /** Example environment file */
  example: ".env.example",
} as const;

/** Project configuration filename */
export const CONFIG_FILENAME = "ui-syncup.config.json";

/** Current configuration schema version */
export const CURRENT_SCHEMA_VERSION = "1.0.0";

/** Docker Compose override file */
export const DOCKER_COMPOSE_OVERRIDE = "docker-compose.override.yml";

/** Docker Compose file for MinIO storage service */
export const DOCKER_COMPOSE_MINIO = "docker-compose.minio.yml";

// ============================================================================
// Default Ports
// ============================================================================

/** Default port configuration for services */
export const DEFAULT_PORTS = {
  /** Next.js application port */
  app: 3000,
  /** Supabase API Gateway port */
  api: 54321,
  /** Supabase PostgreSQL database port */
  db: 54322,
  /** Supabase Studio UI port */
  studio: 54323,
  /** MinIO S3-compatible API port */
  minioApi: 9000,
  /** MinIO web console port */
  minioConsole: 9001,
} as const;

/** All ports that need to be available for the local stack */
export const REQUIRED_PORTS = [
  DEFAULT_PORTS.app,
  DEFAULT_PORTS.api,
  DEFAULT_PORTS.db,
  DEFAULT_PORTS.studio,
  DEFAULT_PORTS.minioApi,
  DEFAULT_PORTS.minioConsole,
] as const;

// ============================================================================
// Storage Configuration
// ============================================================================

/** MinIO local storage service configuration */
export const MINIO_CONFIG = {
  /** Docker container name */
  containerName: "ui-syncup-minio",
  /** Docker Compose project name */
  projectName: "ui-syncup-minio",
  /** Default root user */
  rootUser: "minioadmin",
  /** Default root password */
  rootPassword: "minioadmin",
  /** Default bucket names */
  buckets: {
    attachments: "ui-syncup-attachments",
    media: "ui-syncup-media",
  },
} as const;

/** Timeout for storage readiness check (ms) */
export const STORAGE_TIMEOUT_MS = 30_000;

// ============================================================================
// Timeouts and Retries
// ============================================================================

/** Default timeout for database readiness check (ms) */
export const DATABASE_TIMEOUT_MS = 60_000;

/** Default retry configuration for network operations */
export const NETWORK_RETRY = {
  /** Maximum number of retry attempts */
  maxAttempts: 3,
  /** Base delay between retries (ms) */
  baseDelayMs: 1_000,
  /** Maximum delay between retries (ms) */
  maxDelayMs: 4_000,
} as const;

// ============================================================================
// CLI Metadata
// ============================================================================

/** CLI program name */
export const PROGRAM_NAME = "ui-syncup";

/** CLI program description */
export const PROGRAM_DESCRIPTION =
  "CLI for managing UI SyncUp self-hosted instances";

/** Confirmation phrase required for purge command */
export const PURGE_CONFIRMATION_PHRASE = "purge ui-syncup";
