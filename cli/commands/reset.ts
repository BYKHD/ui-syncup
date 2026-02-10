/**
 * Reset Command
 *
 * Resets the local development environment to a clean state while
 * preserving configuration files (.env.local, .env.production, docker-compose.override.yml).
 *
 * @module cli/commands/reset
 * @see Requirements: 4.1-4.11 (Environment Reset)
 */

import { Command } from "commander";
import { join } from "path";

import {
  // Config
  findProjectRoot,
  isProductionEnvironment,
  // Supabase
  stopSupabase,
  getSupabaseStatus,
  resetSupabase,
  isSupabaseInstalled,
  // Docker
  cleanupProjectContainers,
  isDockerInstalled,
  isDockerRunning,
  // Storage
  hasStorageComposeFile,
  isStorageServiceRunning,
  stopStorageService,
  // Filesystem
  clearDirectory,
  ensureDirectory,
  // Prompts
  confirm,
  // UI
  success,
  warning,
  error,
  info,
  log,
  createSpinner,
  newLine,
  debug,
  // Constants
  ExitCode,
  STORAGE_DIRS,
} from "../lib/index";

// ============================================================================
// Types
// ============================================================================

interface ResetOptions {
  verbose?: boolean;
}

// ============================================================================
// Command Definition
// ============================================================================

export const resetCommand = new Command("reset")
  .description("Reset local environment to a clean state (preserves config files)")
  .action(async (_options: ResetOptions, command: Command) => {
    // Get global options from parent program
    const globalOpts = command.optsWithGlobals();
    const verbose = globalOpts.verbose ?? false;
    await runReset({ verbose });
  });

// ============================================================================
// Main Reset Logic
// ============================================================================

async function runReset(options: ResetOptions): Promise<void> {
  const verbose = options.verbose ?? false;

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

  // ========================================================================
  // Step 1: Safety Check - Block in Production
  // ========================================================================
  if (isProductionEnvironment()) {
    error("Cannot run 'reset' command in production environment.");
    error("This command is only for local development.");
    process.exit(ExitCode.ValidationError);
  }

  // ========================================================================
  // Step 2: Check Prerequisites
  // ========================================================================
  const supabaseInstalled = await isSupabaseInstalled();
  if (!supabaseInstalled) {
    error("Supabase CLI is required to reset the database.");
    error("Install: npm install -g supabase");
    process.exit(ExitCode.ValidationError);
  }

  const dockerInstalled = await isDockerInstalled();
  if (!dockerInstalled) {
    error("Docker is required to remove local containers.");
    error("Install Docker: https://docs.docker.com/get-docker/");
    process.exit(ExitCode.ValidationError);
  }

  const dockerRunning = await isDockerRunning();
  if (!dockerRunning) {
    error("Docker is not running.");
    error("Please start Docker Desktop and try again.");
    process.exit(ExitCode.ExternalError);
  }

  // ========================================================================
  // Step 3: Display Warning and Confirm
  // ========================================================================
  newLine();
  log("🔄 Reset UI SyncUp development environment");
  newLine();
  warning("This will delete:");
  log("  • Database data (all tables will be cleared)");
  log("  • Uploaded files in storage directories");
  log("  • Docker containers (volumes preserved)");
  newLine();
  info("Configuration files will be preserved:");
  log("  • .env.local, .env.production");
  log("  • docker-compose.override.yml");
  log("  • ui-syncup.config.json");
  newLine();

  // Requirement 4.1, 4.2: Always require confirmation, no --force flag
  const confirmed = await confirm("Are you sure you want to reset?", false);

  if (!confirmed) {
    info("Reset cancelled.");
    return;
  }

  newLine();
  const spinner = createSpinner();
  const errors: string[] = [];

  // ========================================================================
  // Step 4: Stop All Services
  // ========================================================================
  spinner.start("Checking service status...");

  const status = await getSupabaseStatus();

  if (!status.ok) {
    spinner.fail("Failed to read Supabase status");
    errors.push(status.error || "Failed to read Supabase status");
    if (verbose) {
      warning(`Supabase status error: ${status.error}`);
    }
  } else if (status.services.length > 0) {
    spinner.succeed(`Found ${status.services.length} running service(s)`);
  } else {
    spinner.succeed("No services currently running");
  }

  spinner.start("Stopping Supabase services...");
  const stopResult = await stopSupabase();

  if (!stopResult.success) {
    spinner.fail("Failed to stop Supabase services");
    errors.push(stopResult.message || "Unknown error stopping Supabase");

    if (stopResult.error && verbose) {
      debug(stopResult.error.message);
    }
  } else {
    spinner.succeed("Supabase services stopped");
  }

  // ========================================================================
  // Step 5: Delete Database Data (using supabase stop --no-backup)
  // ========================================================================
  spinner.start("Resetting database data...");

  const resetResult = await resetSupabase();

  if (!resetResult.success) {
    spinner.fail("Failed to reset database");
    errors.push(resetResult.message || "Unknown error resetting database");

    if (resetResult.error && verbose) {
      debug(resetResult.error.message);
    }
  } else {
    spinner.succeed("Database data deleted");
  }

  // ========================================================================
  // Step 6: Clear Storage Directories
  // ========================================================================
  spinner.start("Clearing storage directories...");

  const storagePaths = [
    join(projectRoot, STORAGE_DIRS.uploads),
    join(projectRoot, STORAGE_DIRS.avatars),
  ];

  let storageCleared = true;
  for (const storagePath of storagePaths) {
    const ensureResult = await ensureDirectory(storagePath);
    if (!ensureResult.success && ensureResult.error) {
      storageCleared = false;
      errors.push(`Failed to create ${storagePath}: ${ensureResult.error}`);

      if (verbose) {
        debug(`Storage ensure error: ${ensureResult.error}`);
      }
      continue;
    }

    const clearResult = await clearDirectory(storagePath);

    if (!clearResult.success && clearResult.error) {
      storageCleared = false;
      errors.push(`Failed to clear ${storagePath}: ${clearResult.error}`);

      if (verbose) {
        debug(`Storage clear error: ${clearResult.error}`);
      }
    }
  }

  if (storageCleared) {
    spinner.succeed("Storage directories cleared");
  } else {
    spinner.fail("Some storage directories could not be cleared");
  }

  // ========================================================================
  // Step 7: Stop MinIO Storage Service
  // ========================================================================
  if (hasStorageComposeFile() && isStorageServiceRunning()) {
    spinner.start("Stopping MinIO storage service...");

    const storageStopResult = await stopStorageService();

    if (!storageStopResult.success) {
      spinner.fail("Failed to stop storage service");
      errors.push(storageStopResult.message || "Unknown error stopping storage");

      if (storageStopResult.error && verbose) {
        debug(storageStopResult.error.message);
      }
    } else {
      spinner.succeed("Storage service stopped");
    }
  }

  // ========================================================================
  // Step 8: Clean Up Orphaned Docker Containers (Keep Volumes)
  // ========================================================================
  spinner.start("Cleaning up orphaned Docker containers...");

  const containerResult = await cleanupProjectContainers();

  if (!containerResult.success) {
    spinner.fail("Failed to clean up Docker containers");
    errors.push(containerResult.message || "Unknown error cleaning up containers");

    if (containerResult.error && verbose) {
      debug(containerResult.error.message);
    }
  } else {
    if (containerResult.message?.includes("No project containers found")) {
      spinner.succeed("No orphaned Docker containers found");
    } else {
      spinner.succeed("Docker containers cleaned up");
    }
  }

  // ========================================================================
  // Step 9: Display Completion Message
  // ========================================================================
  newLine();

  if (errors.length > 0) {
    warning("Reset completed with some errors:");
    errors.forEach((err) => log(`  • ${err}`));
    newLine();
    info("Configuration files have been preserved.");
    info("Run 'ui-syncup up' to start fresh with a clean database.");
    process.exit(ExitCode.ExternalError);
  } else {
    success("Development environment reset successfully!");
    newLine();
    info("Configuration files have been preserved.");
    info("Run 'ui-syncup up' to start fresh with a clean database.");
  }
}
