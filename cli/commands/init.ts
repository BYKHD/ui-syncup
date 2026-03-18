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
  VERSION,
  ENV_FILES,
  STORAGE_DIRS,
  DOCKER_COMPOSE_OVERRIDE,
  DOCKER_COMPOSE_PRODUCTION,
  DOCKERFILE_NAME,
  DOCKERIGNORE_NAME,
  CONFIG_FILENAME,
  DEFAULT_PORTS,
  STORAGE_PROVIDERS,
  EMAIL_PROVIDERS,
  // Types
  type SetupMode,
  type DeploymentMethod,
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
  .action(async (_options: InitOptions, command: Command) => {
    // Get global options from parent program
    const globalOpts = command.optsWithGlobals();
    const verbose = globalOpts.verbose ?? false;
    const mode = _options.mode;
    await runInit({ verbose, mode });
  });

// ============================================================================
// Main Init Logic
// ============================================================================

async function runInit(options: InitOptions): Promise<void> {
  const verbose = options.verbose ?? false;
  const trackedFiles: TrackedFile[] = [];

  // The project root is always the current working directory.
  // init does NOT require an existing config file — it creates one.
  const projectRoot = process.cwd();

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
      warning("Docker is not installed. You'll need Docker to run the stack.");
      warning("Install Docker: https://docs.docker.com/get-docker/");
    } else if (!envCheck.dockerRunning) {
      warning("Docker is installed but not running. Start Docker before running 'up'.");
    }

    if (!envCheck.supabaseInstalled) {
      warning("Supabase CLI is not installed (only needed for local dev mode).");
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
    const mode = await selectSetupMode(options.mode);

    newLine();

    // ========================================================================
    // Step 3b: Production Wizard (collect config interactively)
    // ========================================================================
    let productionConfig: ProductionConfig | undefined;
    if (mode === "production") {
      productionConfig = await collectProductionConfig();
    }

    // ========================================================================
    // Step 4: Check for Existing Files and Confirm Overwrite
    // ========================================================================
    const envFile = mode === "local" ? ENV_FILES.local : ENV_FILES.production;
    const envPath = join(projectRoot, envFile);
    const configPath = join(projectRoot, CONFIG_FILENAME);
    const overridePath = join(projectRoot, DOCKER_COMPOSE_OVERRIDE);
    const composePath = join(projectRoot, DOCKER_COMPOSE_PRODUCTION);
    const dockerfilePath = join(projectRoot, DOCKERFILE_NAME);
    const dockerignorePath = join(projectRoot, DOCKERIGNORE_NAME);

    const filesToCheck = [
      { path: envPath, name: envFile },
      { path: configPath, name: CONFIG_FILENAME },
    ];

    // Add mode-specific deployment files
    if (mode === "local") {
      filesToCheck.push({ path: overridePath, name: DOCKER_COMPOSE_OVERRIDE });
    } else if (productionConfig?.deploymentMethod === "dockerfile") {
      filesToCheck.push({ path: dockerfilePath, name: DOCKERFILE_NAME });
      filesToCheck.push({ path: dockerignorePath, name: DOCKERIGNORE_NAME });
    } else {
      // allinone or external → docker-compose.yml
      filesToCheck.push({ path: composePath, name: DOCKER_COMPOSE_PRODUCTION });
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
      let envResult: FileOperationResult;
      if (mode === "production" && productionConfig) {
        envResult = await generateProductionEnvFile(productionConfig, envPath);
      } else {
        envResult = await generateEnvFile(mode, envPath);
      }

      if (envResult.success) {
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

      if (mode === "local") {
        // Create docker-compose.override.yml (local mode only)
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
      } else if (productionConfig) {
        // Generate production deployment files
        const deployResult = await generateDeploymentFiles(
          productionConfig,
          composePath,
          dockerfilePath,
          dockerignorePath
        );
        for (const result of deployResult) {
          if (result.success && !trackedFiles.some((f) => f.path === result.path)) {
            trackedFiles.push({ path: result.path, isDirectory: false, existedBefore: false });
          }
        }
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

      genSpinner.succeed("Project files generated successfully!");
    } catch (err) {
      genSpinner.fail("Failed to generate project files");
      throw err;
    }

    // ========================================================================
    // Step 6: Display Summary
    // ========================================================================
    newLine();
    displaySummary(mode, productionConfig, trackedFiles, projectRoot);

    if (mode === "local") {
      displayOptionalServiceWarnings(getOptionalServiceWarnings(mode, envPath));
    }

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
      name: "Local Development (Supabase CLI + Docker — for contributors)",
      value: "local",
    },
    {
      name: "Production (self-host on a server)",
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
  if (config.deploymentMethod === "allinone") {
    return copyTemplate(
      "env.production.allinone.template",
      destPath,
      {
        APP_URL: config.appUrl,
        BETTER_AUTH_SECRET: config.authSecret,
        POSTGRES_PASSWORD: config.postgresPassword ?? generateRandomSecret(16),
        MINIO_ROOT_USER: config.minioRootUser ?? "minioadmin",
        MINIO_ROOT_PASSWORD: config.minioRootPassword ?? generateRandomSecret(16),
        ...(config.emailProvider === "resend" && config.resendApiKey
          ? { RESEND_API_KEY: config.resendApiKey, RESEND_FROM_EMAIL: config.resendFromEmail ?? "" }
          : {}),
        ...(config.emailProvider === "smtp" && config.smtpHost
          ? buildSmtpVariables(config)
          : {}),
      },
      { backup: false }
    );
  }

  // external or dockerfile: use standard production template
  const variables: Record<string, string> = {
    APP_URL: config.appUrl,
    DATABASE_URL: config.databaseUrl ?? "",
    DIRECT_URL: config.directUrl ?? "",
    BETTER_AUTH_SECRET: config.authSecret,
    STORAGE_ENDPOINT: config.storageEndpoint ?? "",
    STORAGE_REGION: config.storageRegion ?? "",
    STORAGE_ACCESS_KEY_ID: config.storageAccessKeyId ?? "",
    STORAGE_SECRET_ACCESS_KEY: config.storageSecretAccessKey ?? "",
  };

  if (config.emailProvider === "resend" && config.resendApiKey) {
    variables.RESEND_API_KEY = config.resendApiKey;
    variables.RESEND_FROM_EMAIL = config.resendFromEmail ?? "";
  } else if (config.emailProvider === "smtp" && config.smtpHost) {
    Object.assign(variables, buildSmtpVariables(config));
  }

  return copyTemplate("env.production.template", destPath, variables, { backup: false });
}

function buildSmtpVariables(config: ProductionConfig): Record<string, string> {
  const vars: Record<string, string> = {};
  if (config.smtpHost) vars.SMTP_HOST = config.smtpHost;
  if (config.smtpPort) vars.SMTP_PORT = config.smtpPort;
  if (config.smtpUser) vars.SMTP_USER = config.smtpUser;
  if (config.smtpPassword) vars.SMTP_PASSWORD = config.smtpPassword;
  if (config.smtpFromEmail) vars.SMTP_FROM_EMAIL = config.smtpFromEmail;
  return vars;
}

/**
 * Generate production deployment files (docker-compose.yml or Dockerfile)
 */
async function generateDeploymentFiles(
  config: ProductionConfig,
  composePath: string,
  dockerfilePath: string,
  dockerignorePath: string
): Promise<FileOperationResult[]> {
  const results: FileOperationResult[] = [];

  if (config.deploymentMethod === "allinone") {
    const postgresPassword = config.postgresPassword ?? generateRandomSecret(16);
    const minioUser = config.minioRootUser ?? "minioadmin";
    const minioPassword = config.minioRootPassword ?? generateRandomSecret(16);

    const result = await copyTemplate(
      "docker-compose.allinone.template.yml",
      composePath,
      {
        APP_VERSION: VERSION,
        POSTGRES_PASSWORD: postgresPassword,
        MINIO_ROOT_USER: minioUser,
        MINIO_ROOT_PASSWORD: minioPassword,
      },
      { backup: false }
    );
    results.push(result);
  } else if (config.deploymentMethod === "external") {
    const result = await copyTemplate(
      "docker-compose.external.template.yml",
      composePath,
      { APP_VERSION: VERSION },
      { backup: false }
    );
    results.push(result);
  } else {
    // dockerfile mode
    const dfResult = await copyTemplate(
      "Dockerfile.template",
      dockerfilePath,
      {},
      { backup: false }
    );
    results.push(dfResult);

    const diResult = await copyTemplate(
      "dockerignore.template",
      dockerignorePath,
      {},
      { backup: false }
    );
    results.push(diResult);
  }

  return results;
}

// ============================================================================
// Production Wizard
// ============================================================================

/**
 * Collect production configuration via an interactive step-by-step wizard.
 */
async function collectProductionConfig(): Promise<ProductionConfig> {
  const authSecret = generateRandomSecret(32);

  log("📋 Production Configuration Wizard");
  log("   Fill in your production service details below.");
  newLine();

  // --- Step 1: App URL ---
  info("Step 1: Application URL");
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

  // --- Step 2: Deployment Method ---
  info("Step 2: Deployment Method");
  const deploymentMethod = await select<DeploymentMethod>(
    "How do you want to deploy UI SyncUp?",
    [
      {
        name: "All-in-one  (PostgreSQL + MinIO bundled — recommended for most users)",
        value: "allinone",
      },
      {
        name: "External services  (your own DB + S3/R2/MinIO)",
        value: "external",
      },
      {
        name: "Dockerfile  (for Render, Railway, Fly.io, etc.)",
        value: "dockerfile",
      },
    ]
  );
  newLine();

  // All-in-one: only ask email
  if (deploymentMethod === "allinone") {
    const postgresPassword = generateRandomSecret(16);
    const minioRootUser = "minioadmin";
    const minioRootPassword = generateRandomSecret(16);

    // --- Step 3: Email ---
    info("Step 3: Email Service");
    const { emailProvider, resendApiKey, resendFromEmail, smtpHost, smtpPort, smtpUser, smtpPassword, smtpFromEmail } =
      await collectEmailConfig();
    newLine();

    success(`Auth secret generated: ${authSecret.substring(0, 8)}...`);

    return {
      deploymentMethod,
      appUrl,
      authSecret,
      emailProvider,
      postgresPassword,
      minioRootUser,
      minioRootPassword,
      resendApiKey,
      resendFromEmail,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
      smtpFromEmail,
    };
  }

  // External / Dockerfile: ask DB + storage + email

  // --- Step 3: Database ---
  info("Step 3: Database (PostgreSQL)");
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

  // --- Step 4: Storage ---
  info("Step 4: Object Storage (S3-compatible)");
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

  // --- Step 5: Email ---
  info("Step 5: Email Service");
  const { emailProvider, resendApiKey, resendFromEmail, smtpHost, smtpPort, smtpUser, smtpPassword, smtpFromEmail } =
    await collectEmailConfig();
  newLine();

  success(`Auth secret generated: ${authSecret.substring(0, 8)}...`);

  return {
    deploymentMethod,
    appUrl,
    authSecret,
    emailProvider,
    databaseUrl,
    directUrl,
    storageProvider,
    storageEndpoint,
    storageRegion,
    storageAccessKeyId,
    storageSecretAccessKey,
    resendApiKey,
    resendFromEmail,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPassword,
    smtpFromEmail,
  };
}

interface EmailConfig {
  emailProvider: EmailProvider;
  resendApiKey?: string;
  resendFromEmail?: string;
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFromEmail?: string;
}

async function collectEmailConfig(): Promise<EmailConfig> {
  const emailProvider = await select<EmailProvider>(
    "Email provider:",
    EMAIL_PROVIDERS
  );

  if (emailProvider === "resend") {
    const resendApiKey = await input("Resend API key", undefined, {
      validate: (v) => v.startsWith("re_") ? true : "Resend API key should start with 're_'",
    });
    const resendFromEmail = await input("From email address", undefined, {
      validate: (v) => v.includes("@") ? true : "Must be a valid email address",
    });
    return { emailProvider, resendApiKey, resendFromEmail };
  }

  if (emailProvider === "smtp") {
    const smtpHost = await input("SMTP host", undefined, {
      validate: (v) => v.length > 0 ? true : "SMTP host is required",
    });
    const smtpPort = await input("SMTP port", "587");
    const smtpUser = await input("SMTP username");
    const smtpPassword = await input("SMTP password");
    const smtpFromEmail = await input("From email address", undefined, {
      validate: (v) => v.includes("@") ? true : "Must be a valid email address",
    });
    return { emailProvider, smtpHost, smtpPort, smtpUser, smtpPassword, smtpFromEmail };
  }

  info("Skipping email — emails will be logged to console.");
  return { emailProvider };
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

function displaySummary(
  mode: SetupMode,
  productionConfig: ProductionConfig | undefined,
  trackedFiles: TrackedFile[],
  projectRoot: string
): void {
  const filesList = trackedFiles
    .filter((f) => !f.isDirectory)
    .map((f) => `  • ${f.path.replace(projectRoot + "/", "")}`)
    .join("\n");

  const dirsList = trackedFiles
    .filter((f) => f.isDirectory)
    .map((f) => `  • ${f.path.replace(projectRoot + "/", "")}`)
    .join("\n");

  let nextSteps: string;

  if (mode === "local") {
    nextSteps = `Next steps:
  1. Start Docker Desktop (if not running)
  2. Run: bunx ui-syncup up
  3. Run: bun dev
  4. Open http://localhost:${DEFAULT_PORTS.app}`;
  } else if (productionConfig?.deploymentMethod === "dockerfile") {
    nextSteps = `Next steps:
  1. Review ${ENV_FILES.production} — confirm all values are correct
  2. Push to your hosting platform (Render, Railway, Fly.io, etc.)
  3. The platform will build from the Dockerfile automatically`;
  } else {
    // allinone or external
    nextSteps = `Next steps:
  1. Review ${ENV_FILES.production} — confirm all values are correct
  2. Run: bunx ui-syncup up
  3. Open ${productionConfig?.appUrl ?? "your app URL"}`;
  }

  const deployLabel =
    mode === "local"
      ? "Local Development"
      : productionConfig?.deploymentMethod === "allinone"
        ? "Production (All-in-one)"
        : productionConfig?.deploymentMethod === "external"
          ? "Production (External services)"
          : "Production (Dockerfile)";

  let summaryContent = `Mode: ${deployLabel}

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
