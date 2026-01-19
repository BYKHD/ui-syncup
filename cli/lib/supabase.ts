/**
 * Supabase CLI Service
 *
 * Provides Supabase local development stack management.
 *
 * @module cli/lib/supabase
 * @see Requirements: 2.3-2.9 (database operations)
 */

import { spawnSync, spawn } from "child_process";
import postgres from "postgres";
import * as dotenv from "dotenv";
import { join } from "path";

import type { CommandResult, ServiceStatus } from "./types";
import { DATABASE_TIMEOUT_MS } from "./constants";
import { findProjectRoot } from "./config";
import { debug, warning, error as logError } from "./ui";
import { generateSecurePassword } from "./filesystem";

const PROJECT_ROOT_ERROR =
  "Not in a UI SyncUp project. Run from project root or a subdirectory.";

// ============================================================================
// Supabase CLI Detection
// ============================================================================

/**
 * Check if Supabase CLI is installed
 */
export async function isSupabaseInstalled(): Promise<boolean> {
  const result = spawnSync("supabase", ["--version"], {
    encoding: "utf-8",
    timeout: 5000,
    stdio: ["pipe", "pipe", "pipe"],
  });
  return result.status === 0;
}

/**
 * Get Supabase CLI version
 */
export async function getSupabaseVersion(): Promise<string | null> {
  const result = spawnSync("supabase", ["--version"], {
    encoding: "utf-8",
    timeout: 5000,
  });

  if (result.status !== 0 || !result.stdout) {
    return null;
  }

  // Parse "supabase version 1.x.x"
  const match = result.stdout.match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : result.stdout.trim();
}

// ============================================================================
// Supabase Service Management
// ============================================================================

/**
 * Start Supabase local development stack
 */
export async function startSupabase(): Promise<CommandResult> {
  return runSupabaseCommand(["start"], "Starting Supabase...");
}

/**
 * Stop Supabase local development stack
 */
export async function stopSupabase(): Promise<CommandResult> {
  return runSupabaseCommand(["stop"], "Stopping Supabase...");
}

/**
 * Stop Supabase and remove all data
 */
export async function resetSupabase(): Promise<CommandResult> {
  return runSupabaseCommand(["stop", "--no-backup"], "Resetting Supabase...");
}

/**
 * Get Supabase local stack status
 */
export interface SupabaseStatusResult {
  ok: boolean;
  services: ServiceStatus[];
  error?: string;
}

export async function getSupabaseStatus(): Promise<SupabaseStatusResult> {
  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    const message = PROJECT_ROOT_ERROR;
    logError(message);
    return { ok: false, services: [], error: message };
  }

  const result = spawnSync("supabase", ["status", "--output", "json"], {
    encoding: "utf-8",
    timeout: 10000,
    cwd: projectRoot,
  });

  if (result.status !== 0 || !result.stdout) {
    const message =
      result.stderr?.trim() ||
      result.error?.message ||
      "Failed to read Supabase status";
    return { ok: false, services: [], error: message };
  }

  try {
    const status = JSON.parse(result.stdout);
    const services: ServiceStatus[] = [];

    // Map Supabase status JSON to ServiceStatus
    if (status.DB_URL) {
      services.push({
        name: "postgres",
        status: "running",
        url: status.DB_URL,
      });
    }

    if (status.API_URL) {
      services.push({
        name: "api",
        status: "running",
        url: status.API_URL,
      });
    }

    if (status.STUDIO_URL) {
      services.push({
        name: "studio",
        status: "running",
        url: status.STUDIO_URL,
      });
    }

    return { ok: true, services };
  } catch {
    return { ok: false, services: [], error: "Failed to parse Supabase status output" };
  }
}

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Wait for database to be ready with timeout
 *
 * @param timeoutMs - Maximum time to wait (default: 60000ms)
 * @param pollIntervalMs - Interval between checks (default: 2000ms)
 * @returns true if database is ready, false if timeout
 */
export async function waitForDatabase(
  timeoutMs: number = DATABASE_TIMEOUT_MS,
  pollIntervalMs: number = 2000
): Promise<boolean> {
  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    logError(PROJECT_ROOT_ERROR);
    return false;
  }

  const startTime = Date.now();
  let lastError: Error | null = null;

  // Load environment for database URL
  dotenv.config({ path: join(projectRoot, ".env.local") });
  const dbUrl = process.env.DIRECT_URL;

  if (!dbUrl) {
    warning("DIRECT_URL not set, cannot check database readiness");
    return false;
  }

  debug(`Waiting for database (timeout: ${timeoutMs}ms)...`);

  while (Date.now() - startTime < timeoutMs) {
    const client = postgres(dbUrl, {
      max: 1,
      connect_timeout: 5,
      idle_timeout: 2,
    });

    try {
      await client`SELECT 1 as test`;
      debug("Database is ready");
      return true;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      debug(`Database not ready: ${lastError.message}`);
    } finally {
      try {
        await client.end({ timeout: 5 });
      } catch {
        // Ignore cleanup errors after failed connection attempts.
      }
    }

    // Wait before next attempt
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  warning(`Database not ready after ${timeoutMs}ms: ${lastError?.message}`);
  return false;
}

/**
 * Run database migrations using the existing migrate script
 */
export async function runMigrations(): Promise<CommandResult> {
  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    logError(PROJECT_ROOT_ERROR);
    return {
      success: false,
      message: PROJECT_ROOT_ERROR,
      error: new Error(PROJECT_ROOT_ERROR),
    };
  }

  return new Promise((resolve) => {
    const child = spawn("bun", ["run", "scripts/migrate.ts"], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: projectRoot,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({
          success: true,
          message: "Migrations completed successfully",
        });
      } else {
        resolve({
          success: false,
          message: stderr.trim() || `Migration failed with code ${code}`,
          error: new Error(stderr.trim() || `Exit code: ${code}`),
        });
      }
    });

    child.on("error", (err) => {
      resolve({
        success: false,
        message: `Failed to run migrations: ${err.message}`,
        error: err,
      });
    });
  });
}

/**
 * Seed database with demo data
 */
export async function seedDatabase(): Promise<CommandResult> {
  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    logError(PROJECT_ROOT_ERROR);
    return {
      success: false,
      message: PROJECT_ROOT_ERROR,
      error: new Error(PROJECT_ROOT_ERROR),
    };
  }

  return new Promise((resolve) => {
    const child = spawn("bun", ["run", "scripts/seed.ts"], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: projectRoot,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({
          success: true,
          message: "Database seeded successfully",
        });
      } else {
        resolve({
          success: false,
          message: stderr.trim() || `Seed failed with code ${code}`,
          error: new Error(stderr.trim() || `Exit code: ${code}`),
        });
      }
    });

    child.on("error", (err) => {
      resolve({
        success: false,
        message: `Failed to run seed: ${err.message}`,
        error: err,
      });
    });
  });
}

// ============================================================================
// Admin User Detection
// ============================================================================

export interface AdminExistsResult {
  ok: boolean;
  exists: boolean;
  error?: string;
}

/**
 * Check if the instance admin exists (authoritative: instance_settings.admin_user_id)
 */
export async function adminExists(): Promise<AdminExistsResult> {
  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    const message = "Not in a UI SyncUp project";
    debug(`Cannot check admin: ${message}`);
    return { ok: false, exists: false, error: message };
  }

  // Load environment
  dotenv.config({ path: join(projectRoot, ".env.local") });
  const dbUrl = process.env.DIRECT_URL;

  if (!dbUrl) {
    const message = "DIRECT_URL not set, cannot check for admin user";
    debug(message);
    return { ok: false, exists: false, error: message };
  }

  const client = postgres(dbUrl, {
    max: 1,
    connect_timeout: 5,
    idle_timeout: 2,
  });

  try {
    const result = await client`
      SELECT admin_user_id
      FROM instance_settings
      WHERE admin_user_id IS NOT NULL
      LIMIT 1
    `;
    const exists = result.length > 0 && Boolean(result[0]?.admin_user_id);
    debug(`Instance admin ${exists ? "found" : "not found"}`);
    return { ok: true, exists };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    debug(`Failed to check for admin user: ${message}`);
    return { ok: false, exists: false, error: message };
  } finally {
    try {
      await client.end({ timeout: 5 });
    } catch {
      // Ignore cleanup errors.
    }
  }
}

// ============================================================================
// Admin User Seeding
// ============================================================================

/** Result of admin user creation */
export interface AdminUserResult {
  id: string;
  email: string;
  password: string;
}

/**
 * Seed an admin user with a generated secure password
 *
 * @param email - Admin email address
 * @returns Admin credentials or null if failed
 */
export async function seedAdminUser(
  email: string
): Promise<AdminUserResult | null> {
  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    logError(PROJECT_ROOT_ERROR);
    return null;
  }

  // Load environment
  dotenv.config({ path: join(projectRoot, ".env.local") });
  const dbUrl = process.env.DIRECT_URL;

  if (!dbUrl) {
    warning("DIRECT_URL not set, cannot seed admin user");
    return null;
  }

  const password = generateSecurePassword(16);
  const normalizedEmail = email.toLowerCase().trim();

  const client = postgres(dbUrl, { max: 1 });

  try {
    // Import password hashing dynamically to avoid bundling issues
    const { hashPassword } = await import("@/server/auth/password");
    const passwordHash = await hashPassword(password);

    // Check if user exists
    const existing = await client`
      SELECT id FROM users WHERE email = ${normalizedEmail}
    `;

    let userId: string | undefined;

    if (existing.length > 0) {
      userId = existing[0]?.id as string | undefined;
      // Update existing user's password
      await client`
        UPDATE users 
        SET password_hash = ${passwordHash}, email_verified = true, updated_at = NOW()
        WHERE email = ${normalizedEmail}
      `;
      debug(`Updated password for existing admin user: ${normalizedEmail}`);
    } else {
      // Create new admin user
      const inserted = await client`
        INSERT INTO users (email, name, email_verified, password_hash)
        VALUES (${normalizedEmail}, 'Admin', true, ${passwordHash})
        RETURNING id
      `;
      userId = inserted[0]?.id as string | undefined;
      debug(`Created new admin user: ${normalizedEmail}`);
    }

    if (!userId) {
      throw new Error("Failed to resolve admin user id");
    }

    const existingAccount = await client`
      SELECT id
      FROM account
      WHERE user_id = ${userId} AND provider_id = 'credential'
      LIMIT 1
    `;

    if (existingAccount.length > 0) {
      await client`
        UPDATE account
        SET password = ${passwordHash}, updated_at = NOW()
        WHERE id = ${existingAccount[0]?.id}
      `;
    } else {
      await client`
        INSERT INTO account (user_id, account_id, provider_id, password)
        VALUES (${userId}, ${userId}, 'credential', ${passwordHash})
      `;
    }

    return { id: userId, email: normalizedEmail, password };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    warning(`Failed to seed admin user: ${message}`);
    return null;
  } finally {
    try {
      await client.end({ timeout: 5 });
    } catch {
      // Ignore cleanup errors.
    }
  }
}

// ============================================================================
// Command Execution
// ============================================================================

/**
 * Run a Supabase CLI command
 */
async function runSupabaseCommand(
  args: string[],
  description: string
): Promise<CommandResult> {
  debug(`${description} (supabase ${args.join(" ")})`);

  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    logError(PROJECT_ROOT_ERROR);
    return {
      success: false,
      message: PROJECT_ROOT_ERROR,
      error: new Error(PROJECT_ROOT_ERROR),
    };
  }

  return new Promise((resolve) => {
    const child = spawn("supabase", args, {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: projectRoot,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({
          success: true,
          message: stdout.trim() || description,
        });
      } else {
        resolve({
          success: false,
          message: stderr.trim() || `Command failed with code ${code}`,
          error: new Error(stderr.trim() || `Exit code: ${code}`),
        });
      }
    });

    child.on("error", (err) => {
      resolve({
        success: false,
        message: `Failed to run supabase: ${err.message}`,
        error: err,
      });
    });
  });
}

/**
 * Get database connection URL from Supabase local stack
 */
export async function getLocalDatabaseUrl(): Promise<string | null> {
  const status = await getSupabaseStatus();
  if (!status.ok) {
    return null;
  }
  const postgres = status.services.find((s) => s.name === "postgres");
  return postgres?.url || null;
}
