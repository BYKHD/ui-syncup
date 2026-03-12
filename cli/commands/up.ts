/**
 * Up Command
 *
 * Starts the local development stack including Supabase, runs database
 * migrations.
 *
 * @module cli/commands/up
 * @see Requirements: 2.1-2.11 (Stack Startup)
 */

import { Command } from "commander";
import { handleProjectConfigLoadResult } from "../lib/project-config";

import {
  // Config
  findProjectRoot,
  isProductionEnvironment,
  // Docker
  isDockerInstalled,
  isDockerRunning,
  // Supabase
  isSupabaseInstalled,
  startSupabase,
  getSupabaseStatus,
  resolveLocalDirectUrl,
  waitForDatabase,
  runMigrations,
  // Storage
  hasStorageComposeFile,
  startStorageService,
  waitForStorage,
  getStorageStatus,
  // Project Config
  loadProjectConfigWithStatus,
  // UI
  success,
  warning,
  error,
  info,
  log,
  box,
  createSpinner,
  newLine,
  debug,
  // Constants
  DEFAULT_PORTS,
  DATABASE_TIMEOUT_MS,
  STORAGE_TIMEOUT_MS,
  ExitCode,
} from "../lib/index";

// ============================================================================
// Types
// ============================================================================

interface UpOptions {
  verbose?: boolean;
  skipMigrations?: boolean;
}

// ============================================================================
// Command Definition
// ============================================================================

export const upCommand = new Command("up")
  .description("Start the local development stack")
  .option("--skip-migrations", "Skip running database migrations", false)
  .action(async (options: UpOptions, command: Command) => {
    // Get global options from parent program
    const globalOpts = command.optsWithGlobals();
    const verbose = globalOpts.verbose ?? false;
    await runUp({ ...options, verbose });
  });

// ============================================================================
// Main Up Logic
// ============================================================================

async function runUp(options: UpOptions): Promise<void> {
  const verbose = options.verbose ?? false;
  const skipMigrations = options.skipMigrations ?? false;

  // ========================================================================
  // Step 0: Find Project Root
  // ========================================================================
  const projectRoot = findProjectRoot();

  if (!projectRoot) {
    error("Not in a UI SyncUp project directory.");
    error("Please run this command from the root of a UI SyncUp project.");
    error("(A valid project must have a package.json with name 'ui-syncup')");
    process.exit(ExitCode.ValidationError);
  }

  if (verbose) {
    debug(`Project root: ${projectRoot}`);
  }

  // Load project configuration
  const configLoadResult = loadProjectConfigWithStatus(projectRoot);
  if (!handleProjectConfigLoadResult(configLoadResult, { verbose, debug, error })) {
    process.exit(ExitCode.ValidationError);
  }

  // ========================================================================
  // Step 1: Safety Check - Block in Production
  // ========================================================================
  if (isProductionEnvironment(projectRoot)) {
    error("Cannot run 'up' command in production environment.");
    error("This command is only for local development.");
    process.exit(ExitCode.ValidationError);
  }

  // ========================================================================
  // Step 2: Check Prerequisites
  // ========================================================================
  newLine();
  log("🚀 Starting UI SyncUp development stack");
  newLine();

  const spinner = createSpinner();

  // Check Docker
  spinner.start("Checking Docker...");
  
  const dockerInstalled = await isDockerInstalled();
  if (!dockerInstalled) {
    spinner.fail("Docker is not installed");
    error("Docker is required for local development.");
    error("Install Docker: https://docs.docker.com/get-docker/");
    process.exit(ExitCode.ValidationError);
  }

  const dockerRunning = await isDockerRunning();
  if (!dockerRunning) {
    spinner.fail("Docker is not running");
    error("Please start Docker Desktop and try again.");
    process.exit(ExitCode.ExternalError);
  }
  
  spinner.succeed("Docker is running");

  // Check Supabase CLI
  spinner.start("Checking Supabase CLI...");
  
  const supabaseInstalled = await isSupabaseInstalled();
  if (!supabaseInstalled) {
    spinner.fail("Supabase CLI is not installed");
    error("Supabase CLI is required for local development.");
    error("Install: https://supabase.com/docs/guides/cli/getting-started");
    process.exit(ExitCode.ValidationError);
  }
  
  spinner.succeed("Supabase CLI available");

  const directUrl = resolveLocalDirectUrl(projectRoot);
  if (!directUrl) {
    error("DIRECT_URL is not configured for local development.");
    error("Run 'ui-syncup init' to generate .env.local, then retry.");
    process.exit(ExitCode.ValidationError);
  }

  // ========================================================================
  // Step 3: Start Supabase
  // ========================================================================
  newLine();
  spinner.start("Starting Supabase services...");

  const startResult = await startSupabase();

  if (!startResult.success) {
    spinner.fail("Failed to start Supabase");
    error(startResult.message || "Unknown error starting Supabase");
    if (startResult.error && verbose) {
      debug(startResult.error.message);
    }
    process.exit(ExitCode.ExternalError);
  }

  spinner.succeed("Supabase services started");

  // ========================================================================
  // Step 4: Wait for Database
  // ========================================================================
  spinner.start("Waiting for database to be ready...");

  const dbReady = await waitForDatabase(DATABASE_TIMEOUT_MS);

  if (!dbReady) {
    spinner.fail("Database did not become ready");
    error(`Timed out after ${DATABASE_TIMEOUT_MS / 1000} seconds.`);
    error("Troubleshooting steps:");
    error("  1. Check Docker has enough resources allocated");
    error("  2. Run 'supabase status' to check service status");
    error("  3. Check logs with 'supabase db logs'");
    process.exit(ExitCode.ExternalError);
  }

  spinner.succeed("Database is ready");

  // ========================================================================
  // Step 5: Run Migrations
  // ========================================================================
  if (!skipMigrations) {
    spinner.start("Running database migrations...");

    const migrateResult = await runMigrations();

    if (!migrateResult.success) {
      spinner.fail("Migration failed");
      error(migrateResult.message || "Unknown migration error");
      if (migrateResult.error && verbose) {
        debug(migrateResult.error.message);
      }
      process.exit(ExitCode.ExternalError);
    }

    spinner.succeed("Migrations completed");
  } else {
    info("Skipping migrations (--skip-migrations)");
  }

  // ========================================================================
  // Step 6: Start Storage Service (MinIO)
  // ========================================================================
  let storageStarted = false;

  if (hasStorageComposeFile()) {
    spinner.start("Starting MinIO storage service...");

    const storageResult = await startStorageService();

    if (!storageResult.success) {
      spinner.fail("Failed to start storage service");
      warning(storageResult.message || "Unknown error starting storage");
      if (storageResult.error && verbose) {
        debug(storageResult.error.message);
      }
      warning("Storage-dependent features (uploads, media) will be unavailable.");
    } else {
      // Wait for storage to be healthy
      spinner.start("Waiting for storage service to be ready...");

      const storageReady = await waitForStorage(STORAGE_TIMEOUT_MS);

      if (!storageReady) {
        spinner.fail("Storage service did not become ready");
        warning(`Timed out after ${STORAGE_TIMEOUT_MS / 1000} seconds.`);
        warning("Storage-dependent features (uploads, media) may be unavailable.");
      } else {
        storageStarted = true;
        spinner.succeed("Storage service is ready");
      }
    }
  } else {
    info("No storage compose file found. Skipping MinIO startup.");
    info("To enable local storage, ensure docker-compose.minio.yml exists.");
  }

  // ========================================================================
  // Step 7: Display Status
  // ========================================================================
  newLine();

  // Get service URLs
  const status = await getSupabaseStatus();

  if (!status.ok && verbose) {
    warning(`Failed to read Supabase status: ${status.error}`);
  }

  const appUrl = `http://localhost:${DEFAULT_PORTS.app}`;
  const studioUrl =
    status.services.find((s) => s.name === "studio")?.url ||
    `http://localhost:${DEFAULT_PORTS.studio}`;
  const apiUrl =
    status.services.find((s) => s.name === "api")?.url ||
    `http://localhost:${DEFAULT_PORTS.api}`;

  const storageStatus = getStorageStatus();

  // Display service URLs
  displayServiceUrls(appUrl, studioUrl, apiUrl, storageStatus.running ? storageStatus : undefined);

  newLine();
  if (storageStarted) {
    success("Development stack is ready! (core + storage)");
  } else {
    success("Development stack is ready! (core services only)");
    if (!hasStorageComposeFile()) {
      info("Storage service not configured — uploads/media features unavailable.");
    }
  }
  newLine();
  info("Next step: Run 'bun dev' to start the development server");
  info(`Then open: ${appUrl}`);
}

// ============================================================================
// Helper Functions
// ============================================================================

import type { StorageStatusResult } from "../lib/index";

function displayServiceUrls(
  appUrl: string,
  studioUrl: string,
  apiUrl: string,
  storage?: StorageStatusResult
): void {
  let content = `App:      ${appUrl}
Studio:   ${studioUrl}
API:      ${apiUrl}`;

  if (storage) {
    content += `\nStorage:  ${storage.apiUrl}
Console:  ${storage.consoleUrl}`;
  }

  box("🌐 Service URLs", content);
}
