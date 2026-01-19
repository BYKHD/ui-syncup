/**
 * Up Command
 *
 * Starts the local development stack including Supabase, runs database
 * migrations, and seeds an admin user if needed.
 *
 * @module cli/commands/up
 * @see Requirements: 2.1-2.11 (Stack Startup)
 */

import { Command } from "commander";

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
  waitForDatabase,
  runMigrations,
  seedAdminUser,
  adminExists,
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
  ExitCode,
} from "../lib/index";

// ============================================================================
// Types
// ============================================================================

interface UpOptions {
  verbose?: boolean;
  skipMigrations?: boolean;
  skipSeed?: boolean;
}

const DEFAULT_ADMIN_EMAIL = "admin@ui-syncup.local";

// ============================================================================
// Command Definition
// ============================================================================

export const upCommand = new Command("up")
  .description("Start the local development stack")
  .option("--skip-migrations", "Skip running database migrations", false)
  .option("--skip-seed", "Skip seeding admin user", false)
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
  const skipSeed = options.skipSeed ?? false;

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
    error("Install: npm install -g supabase");
    process.exit(ExitCode.ValidationError);
  }
  
  spinner.succeed("Supabase CLI available");

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
  // Step 6: Seed Admin User
  // ========================================================================
  let adminCredentials: { email: string; password: string } | null = null;

  if (!skipSeed) {
    spinner.start("Checking for admin user...");

    const adminCheck = await adminExists();

    if (!adminCheck.ok) {
      spinner.fail("Failed to check for admin user");
      error(adminCheck.error || "Unknown error checking admin user");
      process.exit(ExitCode.ExternalError);
    }

    if (adminCheck.exists) {
      spinner.succeed("Admin user already exists");
    } else {
      spinner.update("Creating admin user...");

      const adminResult = await seedAdminUser(DEFAULT_ADMIN_EMAIL);

      if (adminResult) {
        adminCredentials = {
          email: adminResult.email,
          password: adminResult.password,
        };
        spinner.succeed("Admin user created");
      } else {
        spinner.fail("Failed to create admin user");
        warning("You may need to create an admin user manually.");
      }
    }
  } else {
    info("Skipping admin seed (--skip-seed)");
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

  // Display admin credentials if created
  if (adminCredentials) {
    displayAdminCredentials(adminCredentials);
    newLine();
  }

  // Display service URLs
  displayServiceUrls(appUrl, studioUrl, apiUrl);

  newLine();
  success("Development stack is ready!");
  newLine();
  info("Next step: Run 'bun dev' to start the development server");
  info(`Then open: ${appUrl}`);
}

// ============================================================================
// Helper Functions
// ============================================================================

function displayAdminCredentials(credentials: { email: string; password: string }): void {
  const content = `Email:    ${credentials.email}
Password: ${credentials.password}

⚠️  Save these credentials - they won't be shown again!`;

  box("🔐 Admin Credentials", content);
}

function displayServiceUrls(appUrl: string, studioUrl: string, apiUrl: string): void {
  const content = `App:      ${appUrl}
Studio:   ${studioUrl}
API:      ${apiUrl}`;

  box("🌐 Service URLs", content);
}
