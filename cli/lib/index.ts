/**
 * CLI Library Barrel Export
 *
 * Re-exports all shared types, constants, and services for convenient imports.
 * @module cli/lib
 */

// Types
export type {
  CommandResult,
  SetupMode,
  EnvironmentCheck,
  FileOperationResult,
  ServiceStatus,
  GlobalOptions,
  ProjectConfig,
} from "./types";

export { ExitCode } from "./types";

// Error Handling
export {
  CLIError,
  ValidationError,
  ExternalError,
  UserAbortError,
  formatError,
  getRecoverySuggestion,
  getExitCode,
  formatPartialFailure,
  levenshteinDistance,
  findClosestCommand,
  type FormatErrorOptions,
  type OperationStatus,
} from "./errors";

// Constants
export {
  VERSION,
  STORAGE_DIRS,
  ENV_FILES,
  CONFIG_FILENAME,
  CURRENT_SCHEMA_VERSION,
  DOCKER_COMPOSE_OVERRIDE,
  DOCKER_COMPOSE_MINIO,
  DEFAULT_PORTS,
  REQUIRED_PORTS,
  DATABASE_TIMEOUT_MS,
  STORAGE_TIMEOUT_MS,
  MINIO_CONFIG,
  NETWORK_RETRY,
  PROGRAM_NAME,
  PROGRAM_DESCRIPTION,
  PURGE_CONFIRMATION_PHRASE,
} from "./constants";

// UI Service
export {
  success,
  warning,
  error,
  info,
  log,
  debug,
  table,
  box,
  newLine,
  separator,
  createSpinner,
  type Spinner,
} from "./ui";

// Prompts Service
export {
  confirm,
  select,
  input,
  password,
  confirmPhrase,
  isNonInteractive,
  type SelectOption,
} from "./prompts";

// Config Service
export {
  getConfig,
  isCI,
  isProductionEnvironment,
  detectEnvironment,
  isPortAvailable,
  isUISyncUpProject,
  findProjectRoot,
  type Config,
} from "./config";

// Network Service
export {
  withRetry,
  withNetworkRetry,
  withTimeout,
  checkConnectivity,
  isOffline,
  DEFAULT_RETRY_OPTIONS,
  type RetryOptions,
} from "./network";

// Project Config Service
export {
  loadProjectConfig,
  saveProjectConfig,
  createDefaultConfig,
  validateConfig,
  migrateConfig,
  mergeConfigs,
  type ValidationResult,
} from "./project-config";

// Filesystem Service
export {
  fileExists,
  isDirectory,
  isFile,
  ensureDirectory,
  deleteDirectory,
  generateBackupPath,
  createBackup,
  writeFile,
  deleteFile,
  copyTemplate,
  interpolateVariables,
  generateRandomSecret,
  generateSecurePassword,
  readFile,
  clearDirectory,
  type WriteFileOptions,
} from "./filesystem";

// Docker Service
export {
  isDockerInstalled,
  isDockerRunning,
  getDockerVersion,
  startServices,
  stopServices,
  removeContainers,
  removeVolumes,
  removeImages,
  fullCleanup,
  cleanupProjectContainers,
  cleanupProjectVolumes,
  cleanupProjectImages,
  getServiceStatus,
  pullImages,
  buildImages,
  runDockerCommandStream,
} from "./docker";

// Supabase Service
export {
  isSupabaseInstalled,
  getSupabaseVersion,
  startSupabase,
  stopSupabase,
  resetSupabase,
  getSupabaseStatus,
  resolveLocalDirectUrl,
  type SupabaseStatusResult,
  waitForDatabase,
  runMigrations,
  seedDatabase,
  getLocalDatabaseUrl,
} from "./supabase";

// Storage Service
export {
  hasStorageComposeFile,
  isStorageServiceRunning,
  getStorageStatus,
  startStorageService,
  stopStorageService,
  purgeStorageService,
  waitForStorage,
  type StorageStatusResult,
} from "./storage";
