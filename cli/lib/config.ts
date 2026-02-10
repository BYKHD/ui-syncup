/**
 * Config Service for environment detection
 *
 * Detects system requirements, runtime environment, and port availability.
 *
 * @module cli/lib/config
 * @see Requirements: 1.1, 1.2 (environment detection), 5.4 (production check), 6.10 (CI mode)
 */

import { spawnSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { createServer } from "net";
import { join } from "path";
import * as dotenv from "dotenv";

import type { EnvironmentCheck } from "./types";
import { REQUIRED_PORTS, STORAGE_DIRS } from "./constants";

// ============================================================================
// Runtime Configuration
// ============================================================================

/** Runtime configuration interface */
export interface Config {
  /** Detected environment (development, production, test) */
  environment: string;
  /** Whether running in CI environment */
  isCI: boolean;
  /** Project root directory */
  projectRoot: string;
  /** Supabase project directory */
  supabaseDir: string;
  /** Storage directories */
  storageDirs: {
    uploads: string;
    avatars: string;
  };
}

/**
 * Get runtime configuration
 */
export function getConfig(): Config {
  const projectRoot = process.cwd();

  return {
    environment: process.env.NODE_ENV || "development",
    isCI: isCI(),
    projectRoot,
    supabaseDir: join(projectRoot, "supabase"),
    storageDirs: {
      uploads: join(projectRoot, STORAGE_DIRS.uploads),
      avatars: join(projectRoot, STORAGE_DIRS.avatars),
    },
  };
}

// ============================================================================
// Environment Detection
// ============================================================================

/**
 * Check if running in CI environment
 */
export function isCI(): boolean {
  return (
    process.env.CI === "true" ||
    process.env.CI === "1" ||
    process.env.GITHUB_ACTIONS === "true" ||
    process.env.GITLAB_CI === "true" ||
    process.env.CIRCLECI === "true" ||
    process.env.JENKINS_URL !== undefined ||
    process.env.BUILDKITE === "true"
  );
}

/**
 * Check if running in production environment
 * Used to block destructive operations like purge
 */
export function isProductionEnvironment(): boolean {
  // 1. Explicit CLI flag to force production detection (highest precedence)
  if (process.argv.includes("--i-am-in-production")) {
    return true;
  }

  // 2. Check loaded process.env
  if (
    process.env.UI_SYNCUP_PRODUCTION === "true" ||
    process.env.UI_SYNCUP_PRODUCTION === "1" ||
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  ) {
    return true;
  }

  // 3. Inspect project .env files directly
  // This catches cases where env vars aren't loaded into the shell yet
  const projectRoot = process.cwd();
  const envFiles = [".env.production", ".env.local"];

  for (const file of envFiles) {
    const filePath = join(projectRoot, file);
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, "utf-8");
        const parsed = dotenv.parse(content);

        if (
          parsed.UI_SYNCUP_PRODUCTION === "true" ||
          parsed.UI_SYNCUP_PRODUCTION === "1" ||
          parsed.NODE_ENV === "production"
        ) {
          return true;
        }

        // Check for production database URL patterns
        const dbUrl = parsed.DATABASE_URL || "";
        if (isProductionDatabaseUrl(dbUrl)) {
          return true;
        }
      } catch {
        // Ignore parsing errors, proceed to next check
      }
    }
  }

  // 4. Check loaded DATABASE_URL from process.env
  if (isProductionDatabaseUrl(process.env.DATABASE_URL || "")) {
    return true;
  }

  return false;
}

/**
 * Check if a database URL looks like a production hosted instance
 */
function isProductionDatabaseUrl(url: string): boolean {
  if (!url) return false;
  return (
    url.includes("supabase.co") ||
    url.includes("neon.tech") ||
    url.includes("railway.app") ||
    url.includes("aws.") ||
    url.includes(".rds.")
  );
}

/**
 * Detect system requirements and availability
 */
export async function detectEnvironment(): Promise<EnvironmentCheck> {
  const [bunCheck, dockerCheck, supabaseCheck, portsCheck] = await Promise.all([
    checkBun(),
    checkDocker(),
    checkSupabase(),
    checkPorts(),
  ]);

  return {
    bunInstalled: bunCheck.installed,
    bunVersion: bunCheck.version,
    dockerInstalled: dockerCheck.installed,
    dockerRunning: dockerCheck.running,
    dockerVersion: dockerCheck.version,
    supabaseInstalled: supabaseCheck.installed,
    supabaseVersion: supabaseCheck.version,
    portsAvailable: portsCheck.allAvailable,
    unavailablePorts: portsCheck.unavailable,
  };
}

// ============================================================================
// Bun Detection
// ============================================================================

interface BunCheck {
  installed: boolean;
  version?: string;
}

async function checkBun(): Promise<BunCheck> {
  try {
    const result = spawnSync("bun", ["--version"], {
      encoding: "utf-8",
      timeout: 5000,
    });

    if (result.status === 0 && result.stdout) {
      return {
        installed: true,
        version: result.stdout.trim(),
      };
    }

    return { installed: false };
  } catch {
    return { installed: false };
  }
}

// ============================================================================
// Docker Detection
// ============================================================================

interface DockerCheck {
  installed: boolean;
  running: boolean;
  version?: string;
}

async function checkDocker(): Promise<DockerCheck> {
  // Check if Docker is installed
  let version: string | undefined;
  try {
    const result = spawnSync("docker", ["--version"], {
      encoding: "utf-8",
      timeout: 5000,
    });

    if (result.status !== 0) {
      return { installed: false, running: false };
    }

    // Parse version from "Docker version 24.0.0, build xxx"
    const match = result.stdout.match(/Docker version ([0-9.]+)/);
    version = match ? match[1] : result.stdout.trim();
  } catch {
    return { installed: false, running: false };
  }

  // Check if Docker daemon is running
  try {
    const pingResult = spawnSync("docker", ["info"], {
      encoding: "utf-8",
      timeout: 10000,
      stdio: ["pipe", "pipe", "pipe"],
    });

    return {
      installed: true,
      running: pingResult.status === 0,
      version,
    };
  } catch {
    return { installed: true, running: false, version };
  }
}

// ============================================================================
// Supabase CLI Detection
// ============================================================================

interface SupabaseCheck {
  installed: boolean;
  version?: string;
}

async function checkSupabase(): Promise<SupabaseCheck> {
  try {
    const result = spawnSync("supabase", ["--version"], {
      encoding: "utf-8",
      timeout: 5000,
    });

    if (result.status === 0 && result.stdout) {
      // Parse version from "supabase version 1.x.x"
      const versionMatch = result.stdout.match(/(\d+\.\d+\.\d+)/);
      return {
        installed: true,
        version: versionMatch ? versionMatch[1] : result.stdout.trim(),
      };
    }

    return { installed: false };
  } catch {
    return { installed: false };
  }
}

// ============================================================================
// Port Availability Check
// ============================================================================

interface PortsCheck {
  allAvailable: boolean;
  unavailable: number[];
}

async function checkPorts(): Promise<PortsCheck> {
  const unavailable: number[] = [];

  for (const port of REQUIRED_PORTS) {
    const available = await isPortAvailable(port);
    if (!available) {
      unavailable.push(port);
    }
  }

  return {
    allAvailable: unavailable.length === 0,
    unavailable,
  };
}

/**
 * Check if a port is available
 */
export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close();
      resolve(true);
    });

    server.listen(port, "127.0.0.1");
  });
}

// ============================================================================
// Project Detection
// ============================================================================

/**
 * Check if current directory is a UI SyncUp project
 */
export function isUISyncUpProject(): boolean {
  return findProjectRoot() !== null;
}

/**
 * Find project root by looking for package.json
 */
export function findProjectRoot(): string | null {
  let dir = process.cwd();

  while (dir !== "/") {
    if (existsSync(join(dir, "package.json"))) {
      // Check if it's a ui-syncup project
      try {
        const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8"));
        if (pkg.name === "ui-syncup") {
          return dir;
        }
      } catch {
        // Continue searching
      }
    }

    dir = join(dir, "..");
  }

  return null;
}
