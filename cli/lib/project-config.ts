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

import type { ProjectConfig, FileOperationResult } from "./types";
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

// ============================================================================
// Load and Save
// ============================================================================

/**
 * Load project configuration from disk
 *
 * @param projectRoot - Path to project root directory
 * @returns Configuration if found and valid, null otherwise
 */
export function loadProjectConfig(projectRoot: string): ProjectConfig | null {
  const configPath = join(projectRoot, CONFIG_FILENAME);

  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(content);

    const validation = validateConfig(parsed);
    if (!validation.valid) {
      console.error(`Invalid configuration in ${CONFIG_FILENAME}:`);
      validation.errors?.forEach((err) => console.error(`  - ${err}`));
      return null;
    }

    // Block configs created by a newer CLI version
    if (compareVersions(parsed.version, CURRENT_SCHEMA_VERSION) > 0) {
      console.error(
        `Config schema ${parsed.version} is newer than this CLI (${CURRENT_SCHEMA_VERSION}).`
      );
      console.error("Please update the CLI to continue.");
      return null;
    }

    // Check if migration is needed
    if (parsed.version !== CURRENT_SCHEMA_VERSION) {
      return migrateConfig(parsed);
    }

    return validation.config!;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed to load ${CONFIG_FILENAME}: ${message}`);
    return null;
  }
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
    const content = JSON.stringify(config, null, 2);
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


