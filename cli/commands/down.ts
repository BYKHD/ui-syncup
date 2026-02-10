/**
 * Down Command
 *
 * Stops all local development stack services while preserving data volumes.
 *
 * @module cli/commands/down
 * @see Requirements: 3.1-3.5 (Stack Shutdown)
 */

import { Command } from "commander";

import {
  // Config
  findProjectRoot,
  isProductionEnvironment,
  // Supabase
  stopSupabase,
  getSupabaseStatus,
  // Storage
  hasStorageComposeFile,
  stopStorageService,
  isStorageServiceRunning,
  // Project Config
  loadProjectConfig,
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
} from "../lib/index";

// ============================================================================
// Types
// ============================================================================

interface DownOptions {
  verbose?: boolean;
}

// ============================================================================
// Command Definition
// ============================================================================

export const downCommand = new Command("down")
  .description("Stop all local development services")
  .action(async (_options: DownOptions, command: Command) => {
    // Get global options from parent program
    const globalOpts = command.optsWithGlobals();
    const verbose = globalOpts.verbose ?? false;
    await runDown({ verbose });
  });

// ============================================================================
// Main Down Logic
// ============================================================================

async function runDown(options: DownOptions): Promise<void> {
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

  // Load project configuration
  const projectConfig = loadProjectConfig(projectRoot);
  if (verbose) {
    if (projectConfig) {
      debug(`Config loaded: mode=${projectConfig.defaults?.mode ?? "not set"}, version=${projectConfig.version}`);
    } else {
      debug("No project config found. Run 'ui-syncup init' to create one.");
    }
  }

  // ========================================================================
  // Step 1: Safety Check - Block in Production
  // ========================================================================
  if (isProductionEnvironment()) {
    error("Cannot run 'down' command in production environment.");
    error("This command is only for local development.");
    process.exit(ExitCode.ValidationError);
  }

  // ========================================================================
  // Step 2: Check if Services Are Running
  // ========================================================================
  newLine();
  log("🛑 Stopping UI SyncUp development stack");
  newLine();

  const spinner = createSpinner();

  spinner.start("Checking service status...");

  const status = await getSupabaseStatus();

  if (!status.ok && verbose) {
    warning(`Failed to read Supabase status: ${status.error}`);
  }

  const servicesRunning = status.services.length > 0;
  const storageRunning = hasStorageComposeFile() && isStorageServiceRunning();

  if (!servicesRunning && !storageRunning && status.ok) {
    spinner.succeed("No services are currently running");
    newLine();
    info("Nothing to stop. Run 'ui-syncup up' to start the development stack.");
    return;
  }

  if (verbose) {
    debug(`Found ${status.services.length} running service(s)`);
    status.services.forEach((s) => debug(`  - ${s.name}: ${s.status}`));
    debug(`MinIO storage running: ${storageRunning}`);
  }

  const runningServiceCount = status.services.length + (storageRunning ? 1 : 0);
  spinner.succeed(`Found ${runningServiceCount} running service(s)`);

  // ========================================================================
  // Step 3: Stop Supabase Services
  // ========================================================================
  let stopFailed = false;

  if (servicesRunning || !status.ok) {
    spinner.start("Stopping Supabase services...");

    const stopResult = await stopSupabase();

    if (!stopResult.success) {
      stopFailed = true;
      spinner.fail("Failed to stop Supabase services");
      error(stopResult.message || "Unknown error stopping Supabase");

      if (stopResult.error && verbose) {
        debug(stopResult.error.message);
      }

      // Continue even if there's an error - try to stop remaining services
      warning("Some services may still be running.");
      warning("Try running 'supabase stop' manually to clean up.");
    } else {
      spinner.succeed("Supabase services stopped");
    }
  } else if (verbose) {
    info("Supabase services already stopped.");
  }

  // ========================================================================
  // Step 4: Stop Storage Service (MinIO)
  // ========================================================================
  let storageStopFailed = false;

  if (storageRunning) {
    spinner.start("Stopping MinIO storage service...");

    const storageResult = await stopStorageService();

    if (!storageResult.success) {
      storageStopFailed = true;
      spinner.fail("Failed to stop storage service");
      warning(storageResult.message || "Unknown error stopping storage");

      if (storageResult.error && verbose) {
        debug(storageResult.error.message);
      }
    } else {
      spinner.succeed("Storage service stopped");
    }
  }

  // ========================================================================
  // Step 5: Display Confirmation
  // ========================================================================
  if (stopFailed || storageStopFailed) {
    newLine();
    warning("Development stack stop completed with errors.");
    if (stopFailed) {
      info("Run 'supabase stop' manually and verify with 'supabase status'.");
    }
    if (storageStopFailed) {
      info("Run 'docker compose -f docker-compose.minio.yml down' to stop storage manually.");
    }
    process.exit(ExitCode.ExternalError);
  }

  newLine();
  success("Development stack stopped successfully!");
  newLine();
  info("Data volumes have been preserved.");
  info("Run 'ui-syncup up' to restart the development stack.");
}
