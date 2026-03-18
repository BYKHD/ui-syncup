/**
 * Update Command
 *
 * Pulls the latest Docker image and restarts the production stack.
 * For local development mode, prints an informational message instead.
 *
 * @module cli/commands/update
 */

import { Command } from "commander";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { handleProjectConfigLoadResult } from "../lib/project-config";

import {
  // Config
  findConfigFile,
  // Docker
  isDockerInstalled,
  isDockerRunning,
  pullImages,
  startServices,
  // Project Config
  loadProjectConfigWithStatus,
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
  DOCKER_COMPOSE_PRODUCTION,
} from "../lib/index";

// ============================================================================
// Types
// ============================================================================

interface UpdateOptions {
  verbose?: boolean;
  noRestart?: boolean;
}

// ============================================================================
// Command Definition
// ============================================================================

export const updateCommand = new Command("update")
  .description("Pull the latest Docker image and restart the production stack")
  .argument("[version]", "Target version tag (e.g. v0.3.0, defaults to latest)")
  .option("--no-restart", "Pull image without restarting the stack")
  .action(async (version: string | undefined, options: UpdateOptions, command: Command) => {
    const globalOpts = command.optsWithGlobals();
    const verbose = globalOpts.verbose ?? false;
    await runUpdate({ ...options, verbose }, version);
  });

// ============================================================================
// Main Update Logic
// ============================================================================

async function runUpdate(options: UpdateOptions, version?: string): Promise<void> {
  const verbose = options.verbose ?? false;
  const noRestart = options.noRestart ?? false;

  // ========================================================================
  // Step 0: Find Project Config
  // ========================================================================
  const projectRoot = findConfigFile();

  if (!projectRoot) {
    error("No ui-syncup.config.json found in current directory.");
    error("Run 'bunx ui-syncup init' first to initialize a project here.");
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

  const projectMode = configLoadResult.config?.defaults?.mode ?? "local";

  // ========================================================================
  // Local mode: informational only
  // ========================================================================
  if (projectMode === "local") {
    newLine();
    info("Update is not available for local development mode.");
    newLine();
    log("To update your contributor environment, run:");
    log("  git pull");
    log("  bun install");
    log("  bunx ui-syncup down && bunx ui-syncup up");
    return;
  }

  // ========================================================================
  // Production mode: docker compose pull + up
  // ========================================================================
  newLine();
  log("🔄 Updating UI SyncUp production stack");
  newLine();

  const spinner = createSpinner();

  // Check Docker
  spinner.start("Checking Docker...");
  const dockerInstalled = await isDockerInstalled();
  if (!dockerInstalled) {
    spinner.fail("Docker is not installed");
    error("Docker is required. Install Docker: https://docs.docker.com/get-docker/");
    process.exit(ExitCode.ValidationError);
  }
  const dockerRunning = await isDockerRunning();
  if (!dockerRunning) {
    spinner.fail("Docker is not running");
    error("Please start Docker and try again.");
    process.exit(ExitCode.ExternalError);
  }
  spinner.succeed("Docker is running");

  // Optionally pin to a specific version
  if (version) {
    const composePath = join(projectRoot, DOCKER_COMPOSE_PRODUCTION);
    if (existsSync(composePath)) {
      spinner.start(`Pinning to version ${version}...`);
      try {
        const content = readFileSync(composePath, "utf-8");
        const updated = content.replace(
          /ghcr\.io\/bykhd\/ui-syncup:[^\s"']*/g,
          `ghcr.io/bykhd/ui-syncup:${version}`
        );
        writeFileSync(composePath, updated, "utf-8");
        spinner.succeed(`Pinned to ${version}`);
      } catch (err) {
        spinner.fail("Failed to update version in docker-compose.yml");
        error(err instanceof Error ? err.message : String(err));
        process.exit(ExitCode.InternalError);
      }
    } else {
      warning(`No ${DOCKER_COMPOSE_PRODUCTION} found — version pin skipped.`);
    }
  }

  // Pull images
  spinner.start("Pulling latest images...");
  const pullResult = await pullImages();
  if (!pullResult.success) {
    spinner.fail("Failed to pull images");
    error(pullResult.message || "Unknown error pulling images");
    if (pullResult.error && verbose) {
      debug(pullResult.error.message);
    }
    process.exit(ExitCode.ExternalError);
  }
  spinner.succeed("Images pulled");

  if (noRestart) {
    newLine();
    success("Images updated. Stack not restarted (--no-restart).");
    info("Run 'bunx ui-syncup up' to apply the update.");
    return;
  }

  // Restart services
  spinner.start("Restarting services...");
  const startResult = await startServices();
  if (!startResult.success) {
    spinner.fail("Failed to restart services");
    error(startResult.message || "Unknown error restarting services");
    if (startResult.error && verbose) {
      debug(startResult.error.message);
    }
    process.exit(ExitCode.ExternalError);
  }
  spinner.succeed("Services restarted");

  newLine();
  success("UI SyncUp updated and running!");
  newLine();
  info("To stop: bunx ui-syncup down");
}
