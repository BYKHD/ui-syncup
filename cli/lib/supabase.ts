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
