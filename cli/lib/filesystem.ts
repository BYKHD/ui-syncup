/**
 * File System Service
 *
 * Provides file operations with backup support, secure permissions,
 * and template copying with variable interpolation.
 *
 * @module cli/lib/filesystem
 * @see Requirements: 1.6-1.8 (file operations), NF-Security.3 (permissions)
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  rmSync,
  statSync,
  chmodSync,
  copyFileSync,
} from "fs";
import { dirname, join, basename } from "path";
import { randomBytes } from "crypto";

import type { FileOperationResult } from "./types";

// ============================================================================
// Constants
// ============================================================================

/** Secure file permissions for .env files (owner read/write only) */
const SECURE_PERMISSIONS = 0o600;

/** Template variable pattern: {{VARIABLE}} */
const TEMPLATE_VAR_PATTERN = /\{\{([A-Z_][A-Z0-9_]*)\}\}/g;

/** Default random secret length in bytes */
const DEFAULT_SECRET_LENGTH = 32;

// ============================================================================
// File Existence
// ============================================================================

/**
 * Check if a file or directory exists
 *
 * @param path - Path to check
 * @returns true if exists, false otherwise
 */
export function fileExists(path: string): boolean {
  return existsSync(path);
}

/**
 * Check if path is a directory
 */
export function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if path is a file
 */
export function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

// ============================================================================
// Directory Operations
// ============================================================================

/**
 * Ensure a directory exists, creating it if necessary
 *
 * @param path - Directory path to ensure exists
 * @returns Operation result
 */
export async function ensureDirectory(path: string): Promise<FileOperationResult> {
  try {
    if (existsSync(path)) {
      if (!isDirectory(path)) {
        return {
          path,
          action: "skipped",
          success: false,
          error: `Path exists but is not a directory: ${path}`,
        };
      }
      return {
        path,
        action: "skipped",
        success: true,
      };
    }

    mkdirSync(path, { recursive: true });

    return {
      path,
      action: "created",
      success: true,
    };
  } catch (err) {
    return {
      path,
      action: "skipped",
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Delete a directory
 *
 * @param path - Directory path to delete
 * @param recursive - Whether to delete contents recursively (default: false)
 * @returns Operation result
 */
export async function deleteDirectory(
  path: string,
  recursive: boolean = false
): Promise<FileOperationResult> {
  try {
    if (!existsSync(path)) {
      return {
        path,
        action: "skipped",
        success: true,
      };
    }

    if (!isDirectory(path)) {
      return {
        path,
        action: "skipped",
        success: false,
        error: `Path is not a directory: ${path}`,
      };
    }

    rmSync(path, { recursive, force: recursive });

    return {
      path,
      action: "deleted",
      success: true,
    };
  } catch (err) {
    return {
      path,
      action: "skipped",
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ============================================================================
// Backup Operations
// ============================================================================

/**
 * Generate a backup filename with timestamp suffix
 *
 * @param originalPath - Original file path
 * @returns Backup file path with timestamp
 */
export function generateBackupPath(originalPath: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = dirname(originalPath);
  const name = basename(originalPath);
  return join(dir, `${name}.backup.${timestamp}`);
}

/**
 * Create a backup of a file
 *
 * @param path - Path to file to backup
 * @returns Operation result with backup path
 */
export async function createBackup(path: string): Promise<FileOperationResult> {
  try {
    if (!existsSync(path)) {
      return {
        path,
        action: "skipped",
        success: false,
        error: `File does not exist: ${path}`,
      };
    }

    if (!isFile(path)) {
      return {
        path,
        action: "skipped",
        success: false,
        error: `Path is not a file: ${path}`,
      };
    }

    const backupPath = generateBackupPath(path);
    copyFileSync(path, backupPath);

    // Preserve secure permissions on backup
    if (isEnvFile(path)) {
      chmodSync(backupPath, SECURE_PERMISSIONS);
    }

    return {
      path: backupPath,
      action: "backed_up",
      success: true,
    };
  } catch (err) {
    return {
      path,
      action: "skipped",
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ============================================================================
// File Write Operations
// ============================================================================

/** Options for writeFile */
export interface WriteFileOptions {
  /** Create backup before overwriting existing file */
  backup?: boolean;
  /** File permissions (default: 0o644, or 0o600 for .env files) */
  permissions?: number;
  /** Allow overwriting existing files (default: true) */
  overwrite?: boolean;
}

/**
 * Write content to a file with optional backup and permissions
 *
 * @param path - File path to write
 * @param content - Content to write
 * @param options - Write options
 * @returns Operation result
 */
export async function writeFile(
  path: string,
  content: string,
  options: WriteFileOptions = {}
): Promise<FileOperationResult> {
  const { backup = false, permissions, overwrite = true } = options;

  try {
    const exists = existsSync(path);

    // Check if overwrite is allowed
    if (exists && !overwrite) {
      return {
        path,
        action: "skipped",
        success: false,
        error: `File already exists: ${path}`,
      };
    }

    // Create backup if requested and file exists
    if (exists && backup) {
      const backupResult = await createBackup(path);
      if (!backupResult.success) {
        return {
          path,
          action: "skipped",
          success: false,
          error: `Failed to create backup: ${backupResult.error}`,
        };
      }
    }

    // Ensure parent directory exists
    const dir = dirname(path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Write file
    writeFileSync(path, content, "utf-8");

    // Set permissions
    const filePermissions = permissions ?? (isEnvFile(path) ? SECURE_PERMISSIONS : 0o644);
    chmodSync(path, filePermissions);

    return {
      path,
      action: exists ? "modified" : "created",
      success: true,
    };
  } catch (err) {
    return {
      path,
      action: "skipped",
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Delete a file
 *
 * @param path - File path to delete
 * @returns Operation result
 */
export async function deleteFile(path: string): Promise<FileOperationResult> {
  try {
    if (!existsSync(path)) {
      return {
        path,
        action: "skipped",
        success: true,
      };
    }

    if (!isFile(path)) {
      return {
        path,
        action: "skipped",
        success: false,
        error: `Path is not a file: ${path}`,
      };
    }

    unlinkSync(path);

    return {
      path,
      action: "deleted",
      success: true,
    };
  } catch (err) {
    return {
      path,
      action: "skipped",
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ============================================================================
// Template Operations
// ============================================================================

/**
 * Copy a template file with variable interpolation
 *
 * @param templateName - Name of template file in cli/templates/
 * @param destPath - Destination path
 * @param variables - Variables to interpolate ({{VAR}} -> value)
 * @returns Operation result
 */
export async function copyTemplate(
  templateName: string,
  destPath: string,
  variables: Record<string, string> = {},
  options: WriteFileOptions = {}
): Promise<FileOperationResult> {
  try {
    // Find template path relative to this module
    const templatePath = findTemplatePath(templateName);

    if (!templatePath || !existsSync(templatePath)) {
      return {
        path: destPath,
        action: "skipped",
        success: false,
        error: `Template not found: ${templateName}`,
      };
    }

    // Read template content
    let content = readFileSync(templatePath, "utf-8");

    // Interpolate variables
    content = interpolateVariables(content, variables);

    // Write to destination
    const shouldBackup = options.backup ?? existsSync(destPath);
    return writeFile(destPath, content, {
      ...options,
      backup: shouldBackup,
      overwrite: options.overwrite ?? true,
    });
  } catch (err) {
    return {
      path: destPath,
      action: "skipped",
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Find the path to a template file
 */
function findTemplatePath(templateName: string): string | null {
  // Templates are in cli/templates/ relative to project root.
  // We try multiple paths because __dirname differs between environments:
  //   - Dev (source):  __dirname = .../cli/lib/  → up 2 → root/cli/templates/
  //   - Bundled (npm): __dirname = .../dist/      → up 1 → root/templates/
  const possiblePaths = [
    join(__dirname, "..", "templates", templateName),               // bundled: dist/ → ../templates/
    join(process.cwd(), "cli", "templates", templateName),         // cwd fallback
    join(dirname(dirname(__dirname)), "cli", "templates", templateName), // dev source layout
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

/**
 * Interpolate {{VARIABLE}} placeholders in content
 *
 * @param content - Template content
 * @param variables - Variable map
 * @returns Interpolated content
 */
export function interpolateVariables(
  content: string,
  variables: Record<string, string>
): string {
  return content.replace(TEMPLATE_VAR_PATTERN, (match, varName) => {
    if (varName in variables) {
      return variables[varName];
    }

    // Handle special built-in variables
    if (varName === "RANDOM_SECRET") {
      return generateRandomSecret();
    }

    if (varName === "RANDOM_SECRET_32") {
      return generateRandomSecret(32);
    }

    if (varName === "RANDOM_SECRET_64") {
      return generateRandomSecret(64);
    }

    // Leave unmatched variables as-is
    return match;
  });
}

// ============================================================================
// Secret Generation
// ============================================================================

/**
 * Generate a cryptographically secure random secret
 *
 * @param length - Length in bytes (default: 32)
 * @returns Hex-encoded random string
 */
export function generateRandomSecret(length: number = DEFAULT_SECRET_LENGTH): string {
  return randomBytes(length).toString("hex");
}

/**
 * Generate a secure password suitable for admin accounts
 *
 * @param length - Character length (default: 16)
 * @returns Random password with mixed characters
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  const bytes = randomBytes(length);
  let password = "";

  for (let i = 0; i < length; i++) {
    password += charset[bytes[i] % charset.length];
  }

  return password;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if a path is an environment file that needs secure permissions
 */
function isEnvFile(path: string): boolean {
  const name = basename(path);
  return name.startsWith(".env") || name.endsWith(".env");
}

/**
 * Read a file's contents as a string
 */
export function readFile(path: string): string | null {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Clear directory contents but keep the directory itself
 *
 * @param path - Directory path
 * @returns Operation result
 */
export async function clearDirectory(path: string): Promise<FileOperationResult> {
  try {
    if (!existsSync(path)) {
      return {
        path,
        action: "skipped",
        success: true,
      };
    }

    if (!isDirectory(path)) {
      return {
        path,
        action: "skipped",
        success: false,
        error: `Path is not a directory: ${path}`,
      };
    }

    // Delete and recreate
    rmSync(path, { recursive: true, force: true });
    mkdirSync(path, { recursive: true });

    return {
      path,
      action: "modified",
      success: true,
    };
  } catch (err) {
    return {
      path,
      action: "skipped",
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
