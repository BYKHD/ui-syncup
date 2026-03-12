/**
 * Init Command
 *
 * Initializes a UI SyncUp project with environment files, storage directories,
 * and configuration. Supports both local and production setup modes.
 *
 * @module cli/commands/init
 * @see Requirements: 1.1-1.11 (Project Initialization)
 */

import { Command } from "commander";
import { join, basename } from "path";
import { copyFileSync, existsSync, chmodSync } from "fs";
import * as dotenv from "dotenv";

import {
  // Config
  detectEnvironment,
  findProjectRoot,
  // Filesystem
  fileExists,
  ensureDirectory,
  copyTemplate,
  generateRandomSecret,
  deleteFile,
  deleteDirectory,
  createBackup,
  readFile,
  writeFile,
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
  // Prompts
  confirm,
  select,
  input,
  isNonInteractive,
  // Project Config
  saveProjectConfig,
  createDefaultConfig,
  // Constants
  ENV_FILES,
  STORAGE_DIRS,
  DOCKER_COMPOSE_OVERRIDE,
  CONFIG_FILENAME,
  DEFAULT_PORTS,
  DOCKERFILE_NAME,
  DOCKERIGNORE_NAME,
  STORAGE_PROVIDERS,
  EMAIL_PROVIDERS,
  // Types
  type SetupMode,
  type FileOperationResult,
  type ProductionConfig,
  type StorageProvider,
  type EmailProvider,
} from "../lib/index";

// ============================================================================
// Types
// ============================================================================

interface InitOptions {
  verbose?: boolean;
  mode?: SetupMode;
  skipDockerfile?: boolean;
}

/** Tracks file state for safe rollback */
interface TrackedFile {
  path: string;
  isDirectory: boolean;
  /** Whether the file existed before init (true = restore backup, false = delete) */
  existedBefore: boolean;
  /** Path to backup file if one was created */
  backupPath?: string;
}

const SECURE_ENV_PERMISSIONS = 0o600;

// ============================================================================
// Command Definition
// ============================================================================

export const initCommand = new Command("init")
  .description("Initialize a new UI SyncUp project with environment files and configuration")
  .option("-m, --mode <mode>", "Setup mode (local or production)")
  .option("--skip-dockerfile", "Skip Dockerfile generation in production mode", false)
  .action(async (_options: InitOptions, command: Command) => {
    // Get global options from parent program
    const globalOpts = command.optsWithGlobals();
    const verbose = globalOpts.verbose ?? false;
    const mode = _options.mode;
    const skipDockerfile = _options.skipDockerfile ?? false;
    await runInit({ verbose, mode, skipDockerfile });
  });

// ============================================================================
// Main Init Logic
// ============================================================================

async function runInit(options: InitOptions): Promise<void> {
  const verbose = options.verbose ?? false;
  const trackedFiles: TrackedFile[] = [];

  // ========================================================================
  // Step 0: Find Project Root
  // ========================================================================
  const projectRoot = findProjectRoot();

  if (!projectRoot) {
    error("Not in a UI SyncUp project directory.");
    error("Please run this command from the root of a UI SyncUp project.");
    error("(A valid project must have a package.json with name 'ui-syncup')");
    process.exit(2);
  }

  if (verbose) {
    debug(`Project root: ${projectRoot}`);
  }

  try {
    // ========================================================================
    // Step 1: Display Welcome
    // ========================================================================
    newLine();
    log("🚀 UI SyncUp Project Initialization");
    newLine();

    // ========================================================================
    // Step 2: Environment Detection
    // ========================================================================
    const spinner = createSpinner();
    spinner.start("Checking system requirements...");

    const envCheck = await detectEnvironment();

    spinner.stop();

    // Display environment status
    displayEnvironmentStatus(envCheck);

    // Check for critical missing dependencies
    if (!envCheck.bunInstalled) {
      error("Bun runtime is required but not installed.");
      error("Install Bun: https://bun.sh/docs/installation");
      process.exit(2);
    }

    if (!envCheck.dockerInstalled) {
      warning("Docker is not installed. You'll need Docker for local development.");
      warning("Install Docker: https://docs.docker.com/get-docker/");
    } else if (!envCheck.dockerRunning) {
      warning("Docker is installed but not running. Start Docker for local development.");
    }

    if (!envCheck.supabaseInstalled) {
      warning("Supabase CLI is not installed. You'll need it for local development.");
      warning("Install: https://supabase.com/docs/guides/cli/getting-started");
    }

    if (!envCheck.portsAvailable && envCheck.unavailablePorts?.length) {
      warning(`Some required ports are in use: ${envCheck.unavailablePorts.join(", ")}`);
      warning("These ports need to be available for local development.");
    }

    newLine();

    // ========================================================================
    // Step 3: Select Setup Mode
    // ========================================================================
    // ========================================================================
    // Step 3: Select Setup Mode
    // ========================================================================
    const mode = await selectSetupMode(options.mode);

    newLine();

    // ========================================================================
    // Step 4: Check for Existing Files and Confirm Overwrite
    // ========================================================================
    const envFile = mode === "local" ? ENV_FILES.local : ENV_FILES.production;
    const envPath = join(projectRoot, envFile);
    const configPath = join(projectRoot, CONFIG_FILENAME);
    const overridePath = join(projectRoot, DOCKER_COMPOSE_OVERRIDE);
    const dockerfilePath = join(projectRoot, DOCKERFILE_NAME);
    const dockerignorePath = join(projectRoot, DOCKERIGNORE_NAME);

    // ========================================================================
    // Step 3b: Production Wizard (collect config interactively)
    // ========================================================================
    let productionConfig: ProductionConfig | undefined;
    if (mode === "production") {
      productionConfig = await collectProductionConfig(options);
    }

    // ========================================================================
    // Step 4: Check for Existing Files and Confirm Overwrite
    // ========================================================================
    const filesToCheck = [
      { path: envPath, name: envFile },
      { path: configPath, name: CONFIG_FILENAME },
      { path: overridePath, name: DOCKER_COMPOSE_OVERRIDE },
    ];

    // Add Dockerfile to the check list for production mode
    if (mode === "production" && productionConfig?.generateDockerfile) {
      filesToCheck.push({ path: dockerfilePath, name: DOCKERFILE_NAME });
      filesToCheck.push({ path: dockerignorePath, name: DOCKERIGNORE_NAME });
    }

    const existingFiles = filesToCheck.filter((f) => fileExists(f.path));

    if (existingFiles.length > 0) {
      warning("The following files already exist:");
      existingFiles.forEach((f) => log(`  • ${f.name}`));
      newLine();

      const shouldOverwrite = await confirm(
        "Do you want to overwrite these files? (Backups will be created)",
        false
      );

      if (!shouldOverwrite) {
        info("Initialization cancelled. No files were modified.");
        return;
      }

      // Create backups for all existing files
      for (const file of existingFiles) {
        const backupResult = await createBackup(file.path);
        if (backupResult.success) {
          if (verbose) {
            debug(`Backed up: ${file.name} → ${basename(backupResult.path)}`);
          }
          // Track this file with its backup path
          trackedFiles.push({
            path: file.path,
            isDirectory: false,
            existedBefore: true,
            backupPath: backupResult.path,
          });
        } else {
          throw new Error(`Failed to backup ${file.name}: ${backupResult.error}`);
        }
      }
    }

    // ========================================================================
    // Step 5: Generate Files
    // ========================================================================
    const genSpinner = createSpinner();
    genSpinner.start("Generating project files...");

    try {
      // Generate environment file
      const envResult = mode === "production" && productionConfig
        ? await generateProductionEnvFile(productionConfig, envPath)
        : await generateEnvFile(mode, envPath);
      if (envResult.success) {
        // Only add to tracked if it wasn't already tracked (new file)
        if (!trackedFiles.some((f) => f.path === envPath)) {
          trackedFiles.push({ path: envResult.path, isDirectory: false, existedBefore: false });
        }
      } else {
        throw new Error(`Failed to create ${envFile}: ${envResult.error}`);
      }

      // Create storage directories
      for (const dir of [STORAGE_DIRS.uploads, STORAGE_DIRS.avatars]) {
        const dirPath = join(projectRoot, dir);
        const existed = existsSync(dirPath);
        const dirResult = await ensureDirectory(dirPath);
        if (dirResult.success && dirResult.action === "created") {
          trackedFiles.push({ path: dirResult.path, isDirectory: true, existedBefore: existed });
        } else if (!dirResult.success) {
          throw new Error(`Failed to create directory ${dir}: ${dirResult.error}`);
        }
      }

      // Create docker-compose.override.yml
      const overrideResult = await copyTemplate(
        "docker-compose.override.template.yml",
        overridePath,
        {},
        { backup: false }
      );
      if (overrideResult.success) {
        if (!trackedFiles.some((f) => f.path === overridePath)) {
          trackedFiles.push({ path: overrideResult.path, isDirectory: false, existedBefore: false });
        }
      } else if (!fileExists(overridePath)) {
        throw new Error(`Failed to create docker-compose.override.yml: ${overrideResult.error}`);
      }

      // Create ui-syncup.config.json
      const projectConfig = createDefaultConfig();
      if (projectConfig.defaults) {
        projectConfig.defaults.mode = mode;
      }
      const configResult = await saveProjectConfig(projectRoot, projectConfig);
      if (configResult.success) {
        if (!trackedFiles.some((f) => f.path === configPath)) {
          trackedFiles.push({ path: configResult.path, isDirectory: false, existedBefore: false });
        }
      } else {
        throw new Error(`Failed to create ${CONFIG_FILENAME}: ${configResult.error}`);
      }

      // Generate Dockerfile and .dockerignore (production mode only)
      if (mode === "production" && productionConfig?.generateDockerfile) {
        const dockerfileResult = await copyTemplate(
          "Dockerfile.template",
          dockerfilePath,
          {},
          { backup: false }
        );
        if (dockerfileResult.success) {
          if (!trackedFiles.some((f) => f.path === dockerfilePath)) {
            trackedFiles.push({ path: dockerfileResult.path, isDirectory: false, existedBefore: false });
          }
        } else {
          throw new Error(`Failed to create Dockerfile: ${dockerfileResult.error}`);
        }

        const dockerignoreResult = await copyTemplate(
          "dockerignore.template",
          dockerignorePath,
          {},
          { backup: false }
        );
        if (dockerignoreResult.success) {
          if (!trackedFiles.some((f) => f.path === dockerignorePath)) {
            trackedFiles.push({ path: dockerignoreResult.path, isDirectory: false, existedBefore: false });
          }
        } else {
          throw new Error(`Failed to create .dockerignore: ${dockerignoreResult.error}`);
        }
      }

      genSpinner.succeed("Project files generated successfully!");
    } catch (err) {
      genSpinner.fail("Failed to generate project files");
      throw err;
    }

    // ========================================================================
    // Step 6: Display Summary
    // ========================================================================
    newLine();
    displaySummary(mode, trackedFiles, projectRoot);
    displayOptionalServiceWarnings(getOptionalServiceWarnings(mode, envPath));

  } catch (err) {
    await rollbackInit(trackedFiles, verbose);

    error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

interface EnvironmentCheckResult {
  bunInstalled: boolean;
  bunVersion?: string;
  dockerInstalled: boolean;
  dockerRunning: boolean;
  dockerVersion?: string;
  supabaseInstalled: boolean;
  supabaseVersion?: string;
  portsAvailable: boolean;
  unavailablePorts?: number[];
}

function displayEnvironmentStatus(env: EnvironmentCheckResult): void {
  log("System Requirements:");
  newLine();

  // Bun
  if (env.bunInstalled) {
    success(`Bun ${env.bunVersion || "installed"}`);
  } else {
    error("Bun not installed");
  }

  // Docker
  if (env.dockerInstalled) {
    if (env.dockerRunning) {
      success(`Docker ${env.dockerVersion || "installed"} (running)`);
    } else {
      warning(`Docker ${env.dockerVersion || "installed"} (not running)`);
    }
  } else {
    warning("Docker not installed");
  }

  // Supabase CLI
  if (env.supabaseInstalled) {
    success(`Supabase CLI ${env.supabaseVersion || "installed"}`);
  } else {
    warning("Supabase CLI not installed");
  }

  // Ports
  if (env.portsAvailable) {
    success("Required ports available");
  } else {
    warning(`Ports in use: ${env.unavailablePorts?.join(", ") || "unknown"}`);
  }
}

async function selectSetupMode(explicitMode?: SetupMode): Promise<SetupMode> {
  // 1. Explicit CLI flag wins (interactive or not)
  if (explicitMode) {
    if (explicitMode !== "local" && explicitMode !== "production") {
      throw new Error(`Invalid mode: ${explicitMode}. Must be 'local' or 'production'.`);
    }
    return explicitMode;
  }

  // 2. Non-interactive defaults to local (safe default)
  if (isNonInteractive()) {
    info("[Non-interactive] Using default mode: local");
    info("To create a production build non-interactively, use: ui-syncup init --mode production");
    return "local";
  }

  // 3. Interactive prompt
  return select<SetupMode>("Select setup mode:", [
    {
      name: "Local Development (Supabase CLI + Docker)",
      value: "local",
    },
    {
      name: "Production (External services)",
      value: "production",
    },
  ]);
}

async function generateEnvFile(
  mode: SetupMode,
  destPath: string
): Promise<FileOperationResult> {
  const templateName =
    mode === "local" ? "env.local.template" : "env.production.template";

  // Generate secure random secrets
  const authSecret = generateRandomSecret(32);
  // Generate unique MinIO credentials per install (avoids shared default credentials)
  const minioPassword = generateRandomSecret(16);

  const variables: Record<string, string> = {
    BETTER_AUTH_SECRET: authSecret,
    MINIO_ROOT_USER: "minioadmin",
    MINIO_ROOT_PASSWORD: minioPassword,
  };

  return copyTemplate(templateName, destPath, variables, { backup: false });
}

/**
 * Generate a production .env file from wizard-collected config
 */
async function generateProductionEnvFile(
  config: ProductionConfig,
  destPath: string
): Promise<FileOperationResult> {
  const variables: Record<string, string> = {
    APP_URL: config.appUrl,
    DATABASE_URL: config.databaseUrl,
    DIRECT_URL: config.directUrl,
    BETTER_AUTH_SECRET: config.authSecret,
    STORAGE_ENDPOINT: config.storageEndpoint,
    STORAGE_REGION: config.storageRegion,
    STORAGE_ACCESS_KEY_ID: config.storageAccessKeyId,
    STORAGE_SECRET_ACCESS_KEY: config.storageSecretAccessKey,
  };

  // Add email config
  if (config.emailProvider === "resend" && config.resendApiKey && config.resendFromEmail) {
    variables.RESEND_API_KEY = config.resendApiKey;
    variables.RESEND_FROM_EMAIL = config.resendFromEmail;
  } else if (config.emailProvider === "smtp") {
    if (config.smtpHost) variables.SMTP_HOST = config.smtpHost;
    if (config.smtpPort) variables.SMTP_PORT = config.smtpPort;
    if (config.smtpUser) variables.SMTP_USER = config.smtpUser;
    if (config.smtpPassword) variables.SMTP_PASSWORD = config.smtpPassword;
    if (config.smtpFromEmail) variables.SMTP_FROM_EMAIL = config.smtpFromEmail;
  }

  return copyTemplate("env.production.template", destPath, variables, { backup: false });
}

// ============================================================================
// Production Wizard
// ============================================================================

/**
 * Collect production configuration via an interactive step-by-step wizard.
 * In non-interactive mode, uses defaults where possible and throws for required fields.
 */
async function collectProductionConfig(options: InitOptions): Promise<ProductionConfig> {
  const skipDockerfile = options.skipDockerfile ?? false;
  const authSecret = generateRandomSecret(32);

  log("📋 Production Configuration Wizard");
  log("   Fill in your production service details below.");
  newLine();

  // --- Step 1: App URL ---
  info("Step 1/5: Application URL");
  const appUrl = await input(
    "Public application URL",
    "https://app.example.com",
    {
      validate: (v) =>
        v.startsWith("http://") || v.startsWith("https://")
          ? true
          : "URL must start with http:// or https://",
    }
  );
  newLine();

  // --- Step 2: Database ---
  info("Step 2/5: Database (PostgreSQL)");
  const databaseUrl = await input(
    "Database connection URL (pooled)",
    undefined,
    {
      validate: (v) =>
        v.startsWith("postgresql://") || v.startsWith("postgres://")
          ? true
          : "Must be a PostgreSQL connection string (postgresql://...)",
    }
  );
  const directUrl = await input(
    "Direct database URL (bypasses pooler, often same)",
    databaseUrl
  );
  newLine();

  // --- Step 3: Storage ---
  info("Step 3/5: Object Storage (S3-compatible)");
  const storageProvider = await select<StorageProvider>(
    "Storage provider:",
    STORAGE_PROVIDERS
  );

  const storageDefaults = getStorageDefaults(storageProvider);
  const storageEndpoint = await input("Storage endpoint URL", storageDefaults.endpoint);
  const storageRegion = await input("Storage region", storageDefaults.region);
  const storageAccessKeyId = await input("Access key ID", undefined, {
    validate: (v) => v.length > 0 ? true : "Access key ID is required",
  });
  const storageSecretAccessKey = await input("Secret access key", undefined, {
    validate: (v) => v.length > 0 ? true : "Secret access key is required",
  });
  newLine();

  // --- Step 4: Email ---
  info("Step 4/5: Email Service");
  const emailProvider = await select<EmailProvider>(
    "Email provider:",
    EMAIL_PROVIDERS
  );

  let resendApiKey: string | undefined;
  let resendFromEmail: string | undefined;
  let smtpHost: string | undefined;
  let smtpPort: string | undefined;
  let smtpUser: string | undefined;
  let smtpPassword: string | undefined;
  let smtpFromEmail: string | undefined;

  if (emailProvider === "resend") {
    resendApiKey = await input("Resend API key", undefined, {
      validate: (v) => v.startsWith("re_") ? true : "Resend API key should start with 're_'",
    });
    resendFromEmail = await input("From email address", undefined, {
      validate: (v) => v.includes("@") ? true : "Must be a valid email address",
    });
  } else if (emailProvider === "smtp") {
    smtpHost = await input("SMTP host", undefined, {
      validate: (v) => v.length > 0 ? true : "SMTP host is required",
    });
    smtpPort = await input("SMTP port", "587");
    smtpUser = await input("SMTP username");
    smtpPassword = await input("SMTP password");
    smtpFromEmail = await input("From email address", undefined, {
      validate: (v) => v.includes("@") ? true : "Must be a valid email address",
    });
  } else {
    info("Skipping email — emails will be logged to console.");
  }
  newLine();

  // --- Step 5: Dockerfile ---
  info("Step 5/5: Deployment");
  let generateDockerfile = !skipDockerfile;
  if (!skipDockerfile && !isNonInteractive()) {
    generateDockerfile = await confirm(
      "Generate a Dockerfile for self-hosted deployment?",
      true
    );
  }
  newLine();

  // --- Show auth secret ---
  success(`Auth secret generated: ${authSecret.substring(0, 8)}...`);

  return {
    appUrl,
    databaseUrl,
    directUrl,
    authSecret,
    storageProvider,
    storageEndpoint,
    storageRegion,
    storageAccessKeyId,
    storageSecretAccessKey,
    emailProvider,
    resendApiKey,
    resendFromEmail,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPassword,
    smtpFromEmail,
    generateDockerfile,
  };
}

function getStorageDefaults(provider: StorageProvider): { endpoint: string; region: string } {
  switch (provider) {
    case "r2":
      return {
        endpoint: "https://<ACCOUNT_ID>.r2.cloudflarestorage.com",
        region: "auto",
      };
    case "s3":
      return {
        endpoint: "https://s3.amazonaws.com",
        region: "us-east-1",
      };
    case "minio":
      return {
        endpoint: "https://minio.example.com",
        region: "us-east-1",
      };
  }
}

function getOptionalServiceWarnings(mode: SetupMode, envPath: string): string[] {
  if (mode !== "local") {
    return [];
  }

  const envFile = readFile(envPath);
  if (!envFile) {
    return [
      "Unable to read .env.local to check optional services. Confirm the file exists.",
    ];
  }

  const env = dotenv.parse(envFile)
  const warnings: string[] = []

  // Email: consider configured if Resend OR SMTP_HOST is set
  const hasResendFullyConfigured = Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL)
  const hasResendPartiallyConfigured = Boolean(env.RESEND_API_KEY || env.RESEND_FROM_EMAIL)
  const hasSmtp = Boolean(env.SMTP_HOST)

  if (!hasResendFullyConfigured && !hasSmtp) {
    warnings.push(
      "Email not configured (console fallback active). Set RESEND_API_KEY + RESEND_FROM_EMAIL, or set SMTP_* variables to send emails."
    )
  } else if (hasResendPartiallyConfigured && !hasResendFullyConfigured) {
    warnings.push(
      "Email is partially configured. Set both RESEND_API_KEY and RESEND_FROM_EMAIL."
    )
  }

  const hasGoogle = Boolean(env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_SECRET);
  if (!hasGoogle) {
    warnings.push(
      "Google OAuth disabled. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI to enable."
    );
  } else if (
    !env.GOOGLE_CLIENT_ID ||
    !env.GOOGLE_CLIENT_SECRET ||
    !env.GOOGLE_REDIRECT_URI
  ) {
    warnings.push(
      "Google OAuth is partially configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI."
    );
  }

  const hasMicrosoft = Boolean(
    env.MICROSOFT_CLIENT_ID || env.MICROSOFT_CLIENT_SECRET
  );
  if (!hasMicrosoft) {
    warnings.push(
      "Microsoft OAuth disabled. Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET to enable."
    );
  } else if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET) {
    warnings.push(
      "Microsoft OAuth is partially configured. Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET."
    );
  }

  return warnings;
}

function displaySummary(mode: SetupMode, trackedFiles: TrackedFile[], projectRoot: string): void {
  const filesList = trackedFiles
    .filter((f) => !f.isDirectory) // Only show files, not directories
    .map((f) => `  • ${f.path.replace(projectRoot + "/", "")}`)
    .join("\n");

  const dirsList = trackedFiles
    .filter((f) => f.isDirectory)
    .map((f) => `  • ${f.path.replace(projectRoot + "/", "")}`)
    .join("\n");

  const nextSteps = mode === "local"
    ? `Next steps:
  1. Start Docker Desktop (if not running)
  2. Run: bunx ui-syncup up
  3. Run: bun dev
  4. Open http://localhost:${DEFAULT_PORTS.app}`
    : `Next steps:
  1. Review ${ENV_FILES.production} — confirm all values are correct
  2. Build: docker build -t ui-syncup .
  3. Run:   docker run -p 3000:3000 --env-file .env.production ui-syncup
  4. Or deploy to your hosting provider (Dokploy, Coolify, AWS, etc.)`;

  let summaryContent = `Mode: ${mode === "local" ? "Local Development" : "Production"}

Files:
${filesList}`;

  if (dirsList) {
    summaryContent += `\n\nDirectories:\n${dirsList}`;
  }

  summaryContent += `\n\n${nextSteps}`;

  box("✅ Initialization Complete", summaryContent);
}

function displayOptionalServiceWarnings(warningsList: string[]): void {
  if (warningsList.length === 0) {
    return;
  }

  newLine();
  warning("Optional services not configured:");
  warningsList.forEach((item) => log(`  • ${item}`));
}

async function rollbackInit(trackedFiles: TrackedFile[], verbose: boolean): Promise<void> {
  if (trackedFiles.length === 0) {
    return;
  }

  newLine();
  warning("Rolling back changes due to error...");

  for (const file of trackedFiles.reverse()) {
    try {
      if (file.existedBefore && file.backupPath) {
        copyFileSync(file.backupPath, file.path);
        if (isEnvPath(file.path)) {
          chmodSync(file.path, SECURE_ENV_PERMISSIONS);
        }
        if (verbose) {
          log(`  Restored: ${file.path}`);
        }
      } else if (!file.existedBefore) {
        if (file.isDirectory) {
          await deleteDirectory(file.path, true);
        } else {
          await deleteFile(file.path);
        }
        if (verbose) {
          log(`  Deleted: ${file.path}`);
        }
      }
    } catch (err) {
      if (verbose) {
        warning(`  Failed to rollback ${file.path}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }
}

function isEnvPath(path: string): boolean {
  const name = basename(path);
  return name.startsWith(".env") || name.endsWith(".env") || name.includes(".env.");
}
