/**
 * Purge Command
 *
 * Completely removes all traces of the local installation, returning
 * the project to a state as if `init` was never run. This is a destructive
 * operation that requires typed confirmation.
 *
 * @module cli/commands/purge
 * @see Requirements: 5.1-5.12 (Factory Purge)
 */

import { Command } from "commander";
import { join } from "path";

import {
  // Config
  findProjectRoot,
  isProductionEnvironment,
  // Docker
  isDockerInstalled,
  isDockerRunning,
  cleanupProjectContainers,
  cleanupProjectVolumes,
  cleanupProjectImages,
  // Supabase
  resetSupabase,
  // Storage
  hasStorageComposeFile,
  purgeStorageService,
  // Filesystem
  deleteDirectory,
  deleteFile,
  // Prompts
  confirmPhrase,
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
  ENV_FILES,
  DOCKER_COMPOSE_OVERRIDE,
  PURGE_CONFIRMATION_PHRASE,
  CONFIG_FILENAME,
} from "../lib/index";

// ============================================================================
// Types
// ============================================================================

interface PurgeOptions {
  verbose?: boolean;
}

// ============================================================================
// Command Definition
// ============================================================================

export const purgeCommand = new Command("purge")
  .description("Completely remove all local data, volumes, and configuration")
  .action(async (_options: PurgeOptions, command: Command) => {
    // Get global options from parent program
    const globalOpts = command.optsWithGlobals();
    const verbose = globalOpts.verbose ?? false;
    await runPurge({ verbose });
  });

// ============================================================================
// Main Purge Logic
// ============================================================================

async function runPurge(options: PurgeOptions): Promise<void> {
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
  // Step 1: Safety Check - Block in Production (Requirement 5.4)
  // ========================================================================
  if (isProductionEnvironment()) {
    newLine();
    error("🚫 Factory purge is BLOCKED in production environments.");
    newLine();
    error("This command is only for local development.");
    error("Detected production environment via:");
    error("  • NODE_ENV=production, or");
    error("  • VERCEL_ENV=production, or");
    error("  • UI_SYNCUP_PRODUCTION=true, or");
    error("  • Production database URL detected");
    newLine();
    info("If this is a false positive, check your environment variables.");
    process.exit(ExitCode.ValidationError);
  }

  // ========================================================================
  // Step 2: Check Docker Prerequisites
  // ========================================================================
  const dockerInstalled = await isDockerInstalled();
  if (!dockerInstalled) {
    warning("Docker is not installed.");
    warning("Container and volume cleanup will be skipped.");
    warning("Only local files will be purged.");
    newLine();
  }

  const dockerRunning = dockerInstalled ? await isDockerRunning() : false;
  if (dockerInstalled && !dockerRunning) {
    warning("Docker is not running.");
    warning("Container and volume cleanup will be skipped.");
    warning("Only local files will be purged.");
    newLine();
  }

  // ========================================================================
  // Step 3: Display Irreversibility Warning (Requirement 5.1)
  // ========================================================================
  newLine();
  log("🗑️  Factory Purge - Complete Removal");
  newLine();
  error("⚠️  WARNING: This operation is IRREVERSIBLE!");
  newLine();
  warning("This will PERMANENTLY DELETE:");
  log("  • All Docker containers for this project");
  log("  • All Docker volumes (database data)");
  log("  • All Docker images (local builds)");
  log("  • All storage directories (uploads, avatars)");
  log("  • Environment files (.env.local, .env.production)");
  log("  • Docker Compose override file");
  log("  • Project configuration file (ui-syncup.config.json)");
  newLine();
  info("After purge, run 'ui-syncup init' to start fresh.");
  newLine();

  // ========================================================================
  // Step 4: Require Typed Confirmation Phrase (Requirement 5.2, 5.3)
  // ========================================================================
  const confirmed = await confirmPhrase(
    "To confirm this destructive operation, type the following phrase:",
    PURGE_CONFIRMATION_PHRASE
  );

  if (!confirmed) {
    newLine();
    info("Purge cancelled. No changes were made.");
    process.exit(ExitCode.UserAbort);
  }

  newLine();
  const spinner = createSpinner();
  const errors: string[] = [];
  const warnings: string[] = [];

  // ========================================================================
  // Step 5: Stop Supabase and Delete All Data (--no-backup)
  // ========================================================================
  if (dockerRunning) {
    spinner.start("Stopping Supabase and deleting all data...");

    const supabaseResetResult = await resetSupabase();

    if (supabaseResetResult.success) {
      spinner.succeed("Supabase stopped and data deleted");
    } else {
      spinner.fail("Failed to reset Supabase (may not be running)");
      // Continue anyway - containers will be removed next
      if (supabaseResetResult.error && verbose) {
        debug(supabaseResetResult.error.message);
      }
    }

    // ======================================================================
    // Step 6: Clean Up Orphaned Docker Containers
    // ======================================================================
    spinner.start("Cleaning up Docker containers...");

    const stopResult = await cleanupProjectContainers();

    if (!stopResult.success) {
      spinner.fail("Failed to clean up containers");
      errors.push(stopResult.message || "Unknown error cleaning up containers");

      if (stopResult.error && verbose) {
        debug(stopResult.error.message);
      }
    } else {
      if (stopResult.message?.includes("No project containers found")) {
        spinner.succeed("No orphaned Docker containers found");
      } else {
        spinner.succeed("Docker containers removed");
      }
    }

    // ======================================================================
    // Step 6b: Remove Docker Volumes
    // ======================================================================
    spinner.start("Removing Docker volumes...");

    const volumeResult = await cleanupProjectVolumes();

    if (!volumeResult.success) {
      spinner.fail("Failed to remove volumes");
      errors.push(volumeResult.message || "Unknown error removing volumes");

      if (volumeResult.error && verbose) {
        debug(volumeResult.error.message);
      }
    } else {
      if (volumeResult.message?.includes("No project volumes found")) {
        spinner.succeed("No orphaned Docker volumes found");
      } else {
        spinner.succeed("Docker volumes removed");
      }
    }

    // ======================================================================
    // Step 7: Remove Docker Images
    // ======================================================================
    spinner.start("Removing Docker images...");

    const imageResult = await cleanupProjectImages();

    if (!imageResult.success) {
      spinner.fail("Failed to remove images");
      errors.push(imageResult.message || "Unknown error removing images");

      if (imageResult.error && verbose) {
        debug(imageResult.error.message);
      }
    } else {
      if (imageResult.message?.includes("No project images found")) {
        spinner.succeed("No orphaned Docker images found");
      } else {
        spinner.succeed("Docker images removed");
      }
    }
  } else {
    if (!dockerInstalled) {
      info("Skipping Docker cleanup (Docker not installed)");
      warnings.push("Docker cleanup skipped - Docker not installed");
    } else {
      info("Skipping Docker cleanup (Docker not running)");
      warnings.push("Docker cleanup skipped - Docker not running");
    }
  }

  // ========================================================================
  // Step 7.5: Purge MinIO Storage Service
  // ========================================================================
  if (hasStorageComposeFile() && dockerRunning) {
    spinner.start("Purging MinIO storage service...");

    const storagePurgeResult = await purgeStorageService();

    if (!storagePurgeResult.success) {
      spinner.fail("Failed to purge storage service");
      errors.push(storagePurgeResult.message || "Unknown error purging storage");

      if (storagePurgeResult.error && verbose) {
        debug(storagePurgeResult.error.message);
      }
    } else {
      spinner.succeed("Storage service purged (containers, volumes, images)");
    }
  }

  // ========================================================================
  // Step 8: Delete Storage Directories (Requirement 5.8)
  // ========================================================================
  spinner.start("Deleting storage directories...");

  const storageRoot = join(projectRoot, STORAGE_DIRS.root);
  const storageResult = await deleteDirectory(storageRoot, true);

  if (!storageResult.success && storageResult.error) {
    spinner.fail("Failed to delete storage directories");
    errors.push(`Storage: ${storageResult.error}`);

    if (verbose) {
      debug(`Storage deletion error: ${storageResult.error}`);
    }
  } else {
    spinner.succeed("Storage directories deleted");
  }

  // ========================================================================
  // Step 9: Delete Environment Files (Requirement 5.9)
  // ========================================================================
  spinner.start("Deleting environment files...");

  const envFilesToDelete = [
    join(projectRoot, ENV_FILES.local),
    join(projectRoot, ENV_FILES.production),
  ];

  let envDeleted = true;
  for (const envPath of envFilesToDelete) {
    const envResult = await deleteFile(envPath);

    if (!envResult.success && envResult.error) {
      envDeleted = false;
      errors.push(`Env file ${envPath}: ${envResult.error}`);

      if (verbose) {
        debug(`Env deletion error: ${envResult.error}`);
      }
    }
  }

  if (envDeleted) {
    spinner.succeed("Environment files deleted");
  } else {
    spinner.fail("Some environment files could not be deleted");
  }

  // ========================================================================
  // Step 10: Delete docker-compose.override.yml (Requirement 5.10)
  // ========================================================================
  spinner.start("Deleting Docker Compose override...");

  const overridePath = join(projectRoot, DOCKER_COMPOSE_OVERRIDE);
  const overrideResult = await deleteFile(overridePath);

  if (!overrideResult.success && overrideResult.error) {
    spinner.fail("Failed to delete Docker Compose override");
    errors.push(`Docker override: ${overrideResult.error}`);

    if (verbose) {
      debug(`Override deletion error: ${overrideResult.error}`);
    }
  } else {
    spinner.succeed("Docker Compose override deleted");
  }

  // ========================================================================
  // Step 11: Delete Project Configuration File
  // ========================================================================
  spinner.start("Deleting project configuration...");

  const configPath = join(projectRoot, CONFIG_FILENAME);
  const configResult = await deleteFile(configPath);

  if (!configResult.success && configResult.error) {
    spinner.fail("Failed to delete project configuration");
    errors.push(`Config file: ${configResult.error}`);

    if (verbose) {
      debug(`Config deletion error: ${configResult.error}`);
    }
  } else {
    spinner.succeed("Project configuration deleted");
  }

  // ========================================================================
  // Step 12: Display Completion Message (Requirement 5.11, 5.12)
  // ========================================================================
  newLine();

  if (errors.length > 0 || warnings.length > 0) {
    // Requirement 5.12: Continue on errors, report all at end
    if (errors.length > 0) {
      warning("Factory purge completed with some errors:");
      errors.forEach((err) => log(`  • ${err}`));
    }
    if (warnings.length > 0) {
      warning("Factory purge completed with warnings:");
      warnings.forEach((item) => log(`  • ${item}`));
    }
    newLine();
    info("Most resources have been cleaned up.");
    info("Run 'ui-syncup init' to start fresh.");
    if (errors.length > 0) {
      process.exit(ExitCode.ExternalError);
    }
  } else {
    success("🎉 Factory purge completed successfully!");
    newLine();
    info("All local data, containers, volumes, and configuration have been removed.");
    info("The project is now in a clean state.");
    newLine();
    log("To start fresh, run:");
    log("  ui-syncup init");
  }
}
