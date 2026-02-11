/**
 * Project Config Service
 *
 * Manages ui-syncup.config.json configuration file with
 * validation, migration, and default creation.
 *
 * @module cli/lib/project-config
 * @see Requirements: 8.4-8.6 (versioning), 9.1-9.6 (config file)
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { z } from "zod";

import type {
  ProjectConfig,
  FileOperationResult,
  ProjectConfigLoadResult,
} from "./types";
import { CONFIG_FILENAME, CURRENT_SCHEMA_VERSION } from "./constants";

// ============================================================================
// Zod Schema for Configuration
// ============================================================================

/**
 * Schema for defaults configuration.
 * V1 scope: only `mode` is active. Additional keys reserved for future versions.
 */
const DefaultsSchema = z.object({
  mode: z.enum(["local", "production"]).optional(),
});

/** Full configuration schema */
const ProjectConfigSchema = z.object({
  version: z.string(),
  defaults: DefaultsSchema.optional(),
});

// ============================================================================
// Validation
// ============================================================================

/** Validation result interface */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  config?: ProjectConfig;
}

/** Logging hooks for project config load handling */
export interface ProjectConfigLoadLogger {
  verbose?: boolean;
  debug: (message: string) => void;
  error: (message: string) => void;
}

/**
 * Validate a configuration object
 *
 * @param config - Raw configuration object to validate
 * @returns Validation result with errors if invalid
 */
export function validateConfig(config: unknown): ValidationResult {
  const result = ProjectConfigSchema.safeParse(config);

  if (result.success) {
    return {
      valid: true,
      config: result.data as ProjectConfig,
    };
  }

  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join(".");
    return `${path}: ${issue.message}`;
  });

  return {
    valid: false,
    errors,
  };
}

/**
 * Handle a project-config load result with consistent logging semantics.
 *
 * @param configLoadResult - Structured project config load result
 * @param logger - Logging handlers used by command modules
 * @returns True when command execution can continue; false when caller should exit
 */
export function handleProjectConfigLoadResult(
  configLoadResult: ProjectConfigLoadResult,
  logger: ProjectConfigLoadLogger
): boolean {
  const verbose = logger.verbose ?? false;

  if (configLoadResult.status === "ok") {
    if (verbose) {
      const projectConfig = configLoadResult.config;
      logger.debug(
        `Config loaded: mode=${projectConfig?.defaults?.mode ?? "not set"}, version=${projectConfig?.version ?? "unknown"}`
      );
    }
    return true;
  }

  if (configLoadResult.status === "missing") {
    if (verbose) {
      logger.debug("No project config found. Run 'ui-syncup init' to create one.");
    }
    return true;
  }

  if (configLoadResult.error) {
    logger.error(configLoadResult.error);
  } else {
    logger.error(
      `Failed to load project configuration (status: ${configLoadResult.status}).`
    );
  }

  if (configLoadResult.status === "newer_schema") {
    logger.error("Please update the CLI to continue.");
  }

  return false;
}

// ============================================================================
// Load and Save
// ============================================================================

/**
 * Load project configuration from disk
 *
 * @param projectRoot - Path to project root directory
 * @returns Structured load result with status and optional config
 */
export function loadProjectConfigWithStatus(projectRoot: string): ProjectConfigLoadResult {
  const configPath = join(projectRoot, CONFIG_FILENAME);

  if (!existsSync(configPath)) {
    return { status: "missing" };
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(content);

    const validation = validateConfig(parsed);
    if (!validation.valid) {
      return {
        status: "invalid",
        error: `Invalid configuration in ${CONFIG_FILENAME}: ${validation.errors?.join(
          ", "
        )}`,
      };
    }

    // Block configs created by a newer CLI version
    const config = validation.config!;
    if (compareVersions(config.version, CURRENT_SCHEMA_VERSION) > 0) {
      return {
        status: "newer_schema",
        error: `Config schema ${config.version} is newer than this CLI (${CURRENT_SCHEMA_VERSION}).`,
        foundVersion: config.version,
        currentVersion: CURRENT_SCHEMA_VERSION,
      };
    }

    // Check if migration is needed
    if (config.version !== CURRENT_SCHEMA_VERSION) {
      const migrated = migrateConfig(config);
      const migratedValidation = validateConfig(migrated);

      if (!migratedValidation.valid) {
        return {
          status: "invalid",
          error: `Migrated configuration is invalid: ${migratedValidation.errors?.join(
            ", "
          )}`,
        };
      }

      return {
        status: "ok",
        config: migratedValidation.config!,
      };
    }

    return {
      status: "ok",
      config,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: "io_error",
      error: `Failed to load ${CONFIG_FILENAME}: ${message}`,
    };
  }
}

/**
 * Backward-compatible helper that returns only parsed config.
 * For runtime-safe handling, prefer `loadProjectConfigWithStatus`.
 */
export function loadProjectConfig(projectRoot: string): ProjectConfig | null {
  const result = loadProjectConfigWithStatus(projectRoot);

  if (result.status === "ok") {
    return result.config ?? null;
  }

  if (result.status !== "missing" && result.error) {
    console.error(result.error);
  }

  return null;
}

/**
 * Save project configuration to disk
 *
 * @param projectRoot - Path to project root directory
 * @param config - Configuration to save
 * @returns Operation result
 */
export async function saveProjectConfig(
  projectRoot: string,
  config: ProjectConfig
): Promise<FileOperationResult> {
  const configPath = join(projectRoot, CONFIG_FILENAME);

  // Validate before saving
  const validation = validateConfig(config);
  if (!validation.valid) {
    return {
      path: configPath,
      action: "skipped",
      success: false,
      error: `Invalid configuration: ${validation.errors?.join(", ")}`,
    };
  }

  try {
    const sanitizedConfig = validation.config!;
    const content = JSON.stringify(sanitizedConfig, null, 2);
    const exists = existsSync(configPath);

    writeFileSync(configPath, content + "\n", "utf-8");

    return {
      path: configPath,
      action: exists ? "modified" : "created",
      success: true,
    };
  } catch (err) {
    return {
      path: configPath,
      action: "skipped",
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ============================================================================
// Create Default Config
// ============================================================================

/**
 * Create a default configuration object
 *
 * @returns Default configuration with current schema version
 */
export function createDefaultConfig(): ProjectConfig {
  return {
    version: CURRENT_SCHEMA_VERSION,
    defaults: {
      mode: "local",
    },
  };
}

// ============================================================================
// Migration
// ============================================================================

/**
 * Migrate an older configuration to current schema version
 *
 * @param oldConfig - Configuration with older schema version
 * @returns Migrated configuration
 */
export function migrateConfig(oldConfig: ProjectConfig): ProjectConfig {
  // Currently we only have version 1.0.0
  // Future migrations will be added here

  const currentVersion = oldConfig.version || "0.0.0";

  // Migration from pre-1.0 (hypothetical)
  if (compareVersions(currentVersion, "1.0.0") < 0) {
    // Migrate from older format
    return {
      version: CURRENT_SCHEMA_VERSION,
      defaults: oldConfig.defaults || {},
    };
  }

  // Already current version
  return oldConfig;
}

/**
 * Compare two semantic version strings
 *
 * @returns -1 if a < b, 0 if equal, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map((n) => parseInt(n, 10) || 0);
  const partsB = b.split(".").map((n) => parseInt(n, 10) || 0);

  for (let i = 0; i < 3; i++) {
    const partA = partsA[i] || 0;
    const partB = partsB[i] || 0;

    if (partA < partB) return -1;
    if (partA > partB) return 1;
  }

  return 0;
}
