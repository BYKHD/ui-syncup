/**
 * Integration tests for the `init` command workflow.
 *
 * Validates project initialization for both local and production modes,
 * rollback on failure, and documentation-critical outputs.
 *
 * @vitest-environment node
 * @module cli/commands/__tests__/init.test
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — created before any module loading
// ---------------------------------------------------------------------------

const mockFindProjectRoot = vi.hoisted(() => vi.fn());
const mockDetectEnvironment = vi.hoisted(() => vi.fn());
const mockIsNonInteractive = vi.hoisted(() => vi.fn());
const mockFileExists = vi.hoisted(() => vi.fn());
const mockEnsureDirectory = vi.hoisted(() => vi.fn());
const mockCopyTemplate = vi.hoisted(() => vi.fn());
const mockGenerateRandomSecret = vi.hoisted(() => vi.fn());
const mockSaveProjectConfig = vi.hoisted(() => vi.fn());
const mockCreateDefaultConfig = vi.hoisted(() => vi.fn());
const mockConfirm = vi.hoisted(() => vi.fn());
const mockSelect = vi.hoisted(() => vi.fn());
const mockInput = vi.hoisted(() => vi.fn());
const mockCreateBackup = vi.hoisted(() => vi.fn());
const mockDeleteFile = vi.hoisted(() => vi.fn());
const mockDeleteDirectory = vi.hoisted(() => vi.fn());
const mockReadFile = vi.hoisted(() => vi.fn());
const mockWriteFile = vi.hoisted(() => vi.fn());

// UI mocks
const mockSuccess = vi.hoisted(() => vi.fn());
const mockWarning = vi.hoisted(() => vi.fn());
const mockError = vi.hoisted(() => vi.fn());
const mockInfo = vi.hoisted(() => vi.fn());
const mockLog = vi.hoisted(() => vi.fn());
const mockBox = vi.hoisted(() => vi.fn());
const mockNewLine = vi.hoisted(() => vi.fn());
const mockDebug = vi.hoisted(() => vi.fn());
const mockCreateSpinner = vi.hoisted(() => vi.fn());

vi.mock("../../lib/index", () => ({
  // Config
  findProjectRoot: mockFindProjectRoot,
  detectEnvironment: mockDetectEnvironment,
  // Filesystem
  fileExists: mockFileExists,
  ensureDirectory: mockEnsureDirectory,
  copyTemplate: mockCopyTemplate,
  generateRandomSecret: mockGenerateRandomSecret,
  deleteFile: mockDeleteFile,
  deleteDirectory: mockDeleteDirectory,
  createBackup: mockCreateBackup,
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  // UI
  success: mockSuccess,
  warning: mockWarning,
  error: mockError,
  info: mockInfo,
  log: mockLog,
  box: mockBox,
  newLine: mockNewLine,
  debug: mockDebug,
  createSpinner: mockCreateSpinner,
  // Prompts
  confirm: mockConfirm,
  select: mockSelect,
  input: mockInput,
  isNonInteractive: mockIsNonInteractive,
  // Project Config
  saveProjectConfig: mockSaveProjectConfig,
  createDefaultConfig: mockCreateDefaultConfig,
  // Constants
  ENV_FILES: { local: ".env.local", production: ".env.production" },
  STORAGE_DIRS: { uploads: "storage/uploads", avatars: "storage/avatars", root: "storage" },
  DOCKER_COMPOSE_OVERRIDE: "docker-compose.override.yml",
  CONFIG_FILENAME: "ui-syncup.config.json",
  DEFAULT_PORTS: { app: 3000, db: 54322, studio: 54323, api: 54321 },
  DOCKERFILE_NAME: "Dockerfile",
  DOCKERIGNORE_NAME: ".dockerignore",
  STORAGE_PROVIDERS: [
    { name: "Cloudflare R2 (S3-compatible)", value: "r2" },
    { name: "AWS S3", value: "s3" },
    { name: "MinIO (self-hosted S3-compatible)", value: "minio" },
  ],
  EMAIL_PROVIDERS: [
    { name: "Resend (cloud email API)", value: "resend" },
    { name: "SMTP (self-hosted mail server)", value: "smtp" },
    { name: "Skip (console logging fallback)", value: "skip" },
  ],
  ExitCode: { Success: 0, UserAbort: 1, ValidationError: 2, ExternalError: 3, InternalError: 4 },
}));

vi.mock("dotenv", () => ({
  parse: vi.fn(() => ({})),
}));

vi.mock("fs", () => ({
  copyFileSync: vi.fn(),
  existsSync: vi.fn(() => false),
  chmodSync: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sentinel error thrown by our process.exit mock */
class ExitError extends Error {
  constructor(public code: number | undefined) {
    super(`process.exit(${code})`);
  }
}

function normalizeExitCode(code?: string | number | null): number {
  if (typeof code === "number") return code;
  if (typeof code === "string") {
    const parsed = Number.parseInt(code, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

const mockSpinner = {
  start: vi.fn(),
  stop: vi.fn(),
  succeed: vi.fn(),
  fail: vi.fn(),
};

function setupDefaultMocks() {
  mockCreateSpinner.mockReturnValue(mockSpinner);
  mockFindProjectRoot.mockReturnValue("/mock/project");
  mockDetectEnvironment.mockResolvedValue({
    bunInstalled: true,
    bunVersion: "1.0.0",
    dockerInstalled: true,
    dockerRunning: true,
    dockerVersion: "24.0.0",
    supabaseInstalled: true,
    supabaseVersion: "1.0.0",
    portsAvailable: true,
    unavailablePorts: [],
  });
  mockIsNonInteractive.mockReturnValue(true);
  mockFileExists.mockReturnValue(false);
  mockGenerateRandomSecret.mockReturnValue("mock-secret-32-chars-long-minimum");
  mockCopyTemplate.mockResolvedValue({ success: true, path: "/mock/project/.env.local", action: "created" });
  mockEnsureDirectory.mockResolvedValue({ success: true, path: "/mock/project/storage/uploads", action: "created" });
  mockSaveProjectConfig.mockResolvedValue({ success: true, path: "/mock/project/ui-syncup.config.json", action: "created" });
  mockCreateDefaultConfig.mockReturnValue({ version: "1.0.0", defaults: { mode: "local" } });
  mockReadFile.mockReturnValue("");
  mockWriteFile.mockResolvedValue({ success: true, path: "/mock/project/.env.production", action: "created" });
  // Production wizard mocks — input returns sensible defaults in sequence
  mockInput.mockResolvedValue("https://app.example.com");
  mockConfirm.mockResolvedValue(true);
}

// ---------------------------------------------------------------------------
// Import AFTER mocks
// ---------------------------------------------------------------------------

import { initCommand } from "../init";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("init command", () => {
  let exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
    throw new ExitError(normalizeExitCode(code));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    exitSpy.mockRestore();
    exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new ExitError(normalizeExitCode(code));
    });
    setupDefaultMocks();
    // Reset Commander options to prevent state leaking between tests
    initCommand.setOptionValue("mode", undefined);
    initCommand.setOptionValue("skipDockerfile", false);
  });

  // =========================================================================
  // Happy Paths
  // =========================================================================

  describe("happy path", () => {
    it("initializes a local project successfully", async () => {
      await initCommand.parseAsync([], { from: "user" });

      // Should NOT have called process.exit
      expect(exitSpy).not.toHaveBeenCalled();

      // Should have checked project root
      expect(mockFindProjectRoot).toHaveBeenCalled();

      // Should have detected environment
      expect(mockDetectEnvironment).toHaveBeenCalled();

      // Should have generated env file via copyTemplate
      expect(mockCopyTemplate).toHaveBeenCalled();

      // Should have created storage directories
      expect(mockEnsureDirectory).toHaveBeenCalled();

      // Should have saved project config
      expect(mockSaveProjectConfig).toHaveBeenCalled();

      // Should display completion box
      expect(mockBox).toHaveBeenCalledWith(
        expect.stringContaining("Initialization Complete"),
        expect.any(String)
      );
    });

    it("defaults to local mode in non-interactive environments", async () => {
      mockIsNonInteractive.mockReturnValue(true);

      await initCommand.parseAsync([], { from: "user" });

      // Should report non-interactive mode
      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining("non-interactive")
      );
    });

    it("supports explicit --mode production flag", async () => {
      mockCopyTemplate.mockResolvedValue({
        success: true,
        path: "/mock/project/.env.production",
        action: "created",
      });
      // Mock production wizard inputs
      mockInput
        .mockResolvedValueOnce("https://app.example.com")   // appUrl
        .mockResolvedValueOnce("postgresql://user:pass@host:5432/db") // databaseUrl
        .mockResolvedValueOnce("postgresql://user:pass@host:5432/db") // directUrl
        .mockResolvedValueOnce("https://s3.amazonaws.com")  // storageEndpoint
        .mockResolvedValueOnce("us-east-1")                 // storageRegion
        .mockResolvedValueOnce("AKID")                      // storageAccessKeyId
        .mockResolvedValueOnce("secret")                    // storageSecretAccessKey
        .mockResolvedValueOnce("re_test_key")               // resendApiKey
        .mockResolvedValueOnce("test@example.com");          // resendFromEmail
      mockSelect
        .mockResolvedValueOnce("s3")         // storageProvider
        .mockResolvedValueOnce("resend");    // emailProvider
      mockConfirm.mockResolvedValue(true);   // generateDockerfile

      await initCommand.parseAsync(["--mode", "production"], { from: "user" });

      expect(exitSpy).not.toHaveBeenCalled();
      expect(mockBox).toHaveBeenCalledWith(
        expect.stringContaining("Initialization Complete"),
        expect.stringContaining("Production")
      );
    });

    it("displays next-steps guidance after successful local init", async () => {
      await initCommand.parseAsync([], { from: "user" });

      // The box call contains the summary with next steps embedded
      expect(mockBox).toHaveBeenCalledWith(
        expect.stringContaining("Initialization Complete"),
        expect.stringContaining("Next steps")
      );
    });
  });

  // =========================================================================
  // Failure Paths
  // =========================================================================

  describe("failure paths", () => {
    it("exits with code 2 when not in a project directory", async () => {
      mockFindProjectRoot.mockReturnValue(null);

      await expect(
        initCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(2);
      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining("Not in a UI SyncUp project")
      );
    });

    it("exits with code 2 when Bun is not installed", async () => {
      mockDetectEnvironment.mockResolvedValue({
        bunInstalled: false,
        dockerInstalled: true,
        dockerRunning: true,
        supabaseInstalled: true,
        portsAvailable: true,
      });

      await expect(
        initCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(2);
      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining("Bun runtime is required")
      );
    });

    it("exits with code 1 when template generation fails", async () => {
      mockCopyTemplate.mockResolvedValue({
        success: false,
        path: "",
        action: "skipped",
        error: "Template not found",
      });

      await expect(
        initCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("displays warning when Docker is not installed", async () => {
      mockDetectEnvironment.mockResolvedValue({
        bunInstalled: true,
        bunVersion: "1.0.0",
        dockerInstalled: false,
        dockerRunning: false,
        supabaseInstalled: true,
        portsAvailable: true,
      });

      await initCommand.parseAsync([], { from: "user" });

      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining("Docker is not installed")
      );
    });

    it("rejects invalid --mode values", async () => {
      await expect(
        initCommand.parseAsync(["--mode", "staging"], { from: "user" })
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // Overwrite / Backup Flow
  // =========================================================================

  describe("existing file handling", () => {
    it("cancels gracefully when user declines overwrite", async () => {
      // fileExists returns true so existing file detection triggers
      mockFileExists.mockReturnValue(true);
      // User declines overwrite prompt
      mockConfirm.mockResolvedValue(false);

      await initCommand.parseAsync(["--mode", "local"], { from: "user" });

      expect(exitSpy).not.toHaveBeenCalled();
      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining("cancelled")
      );
      // Should NOT have generated any project files
      expect(mockCopyTemplate).not.toHaveBeenCalled();
    });
  });
});
