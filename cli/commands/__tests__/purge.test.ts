/**
 * Integration tests for the `purge` command workflow.
 *
 * Validates factory-purge including typed confirmation, Docker cleanup,
 * file deletion, production blocking, and documentation-critical outputs.
 *
 * @vitest-environment node
 * @module cli/commands/__tests__/purge.test
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockFindProjectRoot = vi.hoisted(() => vi.fn());
const mockIsProductionEnvironment = vi.hoisted(() => vi.fn());
const mockIsDockerInstalled = vi.hoisted(() => vi.fn());
const mockIsDockerRunning = vi.hoisted(() => vi.fn());
const mockCleanupProjectContainers = vi.hoisted(() => vi.fn());
const mockCleanupProjectVolumes = vi.hoisted(() => vi.fn());
const mockCleanupProjectImages = vi.hoisted(() => vi.fn());
const mockResetSupabase = vi.hoisted(() => vi.fn());
const mockHasStorageComposeFile = vi.hoisted(() => vi.fn());
const mockPurgeStorageService = vi.hoisted(() => vi.fn());
const mockDeleteDirectory = vi.hoisted(() => vi.fn());
const mockDeleteFile = vi.hoisted(() => vi.fn());
const mockConfirmPhrase = vi.hoisted(() => vi.fn());
const mockLoadProjectConfigWithStatus = vi.hoisted(() => vi.fn());

// UI mocks
const mockSuccess = vi.hoisted(() => vi.fn());
const mockWarning = vi.hoisted(() => vi.fn());
const mockError = vi.hoisted(() => vi.fn());
const mockInfo = vi.hoisted(() => vi.fn());
const mockLog = vi.hoisted(() => vi.fn());
const mockNewLine = vi.hoisted(() => vi.fn());
const mockDebug = vi.hoisted(() => vi.fn());
const mockCreateSpinner = vi.hoisted(() => vi.fn());

vi.mock("../../lib/index", () => ({
  findProjectRoot: mockFindProjectRoot,
  isProductionEnvironment: mockIsProductionEnvironment,
  isDockerInstalled: mockIsDockerInstalled,
  isDockerRunning: mockIsDockerRunning,
  cleanupProjectContainers: mockCleanupProjectContainers,
  cleanupProjectVolumes: mockCleanupProjectVolumes,
  cleanupProjectImages: mockCleanupProjectImages,
  resetSupabase: mockResetSupabase,
  hasStorageComposeFile: mockHasStorageComposeFile,
  purgeStorageService: mockPurgeStorageService,
  deleteDirectory: mockDeleteDirectory,
  deleteFile: mockDeleteFile,
  confirmPhrase: mockConfirmPhrase,
  // Project Config
  loadProjectConfigWithStatus: mockLoadProjectConfigWithStatus,
  success: mockSuccess,
  warning: mockWarning,
  error: mockError,
  info: mockInfo,
  log: mockLog,
  newLine: mockNewLine,
  debug: mockDebug,
  createSpinner: mockCreateSpinner,
  ExitCode: { Success: 0, UserAbort: 1, ValidationError: 2, ExternalError: 3, InternalError: 4 },
  STORAGE_DIRS: { uploads: "storage/uploads", avatars: "storage/avatars", root: "storage" },
  ENV_FILES: { local: ".env.local", production: ".env.production" },
  DOCKER_COMPOSE_OVERRIDE: "docker-compose.override.yml",
  CONFIG_FILENAME: "ui-syncup.config.json",
  PURGE_CONFIRMATION_PHRASE: "delete everything",
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  mockIsProductionEnvironment.mockReturnValue(false);
  mockIsDockerInstalled.mockResolvedValue(true);
  mockIsDockerRunning.mockResolvedValue(true);
  mockConfirmPhrase.mockResolvedValue(true);
  mockResetSupabase.mockResolvedValue({ success: true });
  mockCleanupProjectContainers.mockResolvedValue({
    success: true,
    message: "Removed 3 container(s)",
  });
  mockCleanupProjectVolumes.mockResolvedValue({
    success: true,
    message: "Removed 2 volume(s)",
  });
  mockCleanupProjectImages.mockResolvedValue({
    success: true,
    message: "Removed 1 image(s)",
  });
  mockDeleteDirectory.mockResolvedValue({ success: true });
  mockDeleteFile.mockResolvedValue({ success: true });
  mockHasStorageComposeFile.mockReturnValue(false);
  mockLoadProjectConfigWithStatus.mockReturnValue({ status: "missing" });
}

// ---------------------------------------------------------------------------
// Import AFTER mocks
// ---------------------------------------------------------------------------

import { purgeCommand } from "../purge";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("purge command", () => {
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
  });

  // =========================================================================
  // Happy Paths
  // =========================================================================

  describe("happy path", () => {
    it("purges all resources successfully", async () => {
      await purgeCommand.parseAsync([], { from: "user" });

      expect(exitSpy).not.toHaveBeenCalled();

      // Docker cleanup
      expect(mockResetSupabase).toHaveBeenCalled();
      expect(mockCleanupProjectContainers).toHaveBeenCalled();
      expect(mockCleanupProjectVolumes).toHaveBeenCalled();
      expect(mockCleanupProjectImages).toHaveBeenCalled();

      // File cleanup
      expect(mockDeleteDirectory).toHaveBeenCalled();
      expect(mockDeleteFile).toHaveBeenCalled();

      expect(mockSuccess).toHaveBeenCalledWith(
        expect.stringContaining("Factory purge completed successfully")
      );
    });

    it("displays re-init guidance after purge", async () => {
      await purgeCommand.parseAsync([], { from: "user" });

      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining("ui-syncup init")
      );
    });

    it("purges MinIO storage when compose file exists", async () => {
      mockHasStorageComposeFile.mockReturnValue(true);
      mockPurgeStorageService.mockResolvedValue({ success: true });

      await purgeCommand.parseAsync([], { from: "user" });

      expect(mockPurgeStorageService).toHaveBeenCalled();
    });

    it("deletes env files, config, and compose override", async () => {
      await purgeCommand.parseAsync([], { from: "user" });

      // Should delete: .env.local, .env.production, docker-compose.override.yml, ui-syncup.config.json
      // That's 4 deleteFile calls (2 env + override + config)
      expect(mockDeleteFile).toHaveBeenCalledTimes(4);
    });

    it("skips Docker cleanup gracefully when Docker is not installed", async () => {
      mockIsDockerInstalled.mockResolvedValue(false);

      await purgeCommand.parseAsync([], { from: "user" });

      expect(exitSpy).not.toHaveBeenCalled();
      expect(mockCleanupProjectContainers).not.toHaveBeenCalled();
      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining("Skipping Docker cleanup")
      );
    });
  });

  // =========================================================================
  // Failure Paths
  // =========================================================================

  describe("failure paths", () => {
    it("exits with ValidationError when not in a project directory", async () => {
      mockFindProjectRoot.mockReturnValue(null);

      await expect(
        purgeCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(2);
    });

    it("exits with ValidationError in production environment", async () => {
      mockIsProductionEnvironment.mockReturnValue(true);

      await expect(
        purgeCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(2);
      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining("BLOCKED")
      );
    });

    it("exits with ValidationError when config schema is newer than CLI", async () => {
      mockLoadProjectConfigWithStatus.mockReturnValue({
        status: "newer_schema",
        error: "Config schema 2.0.0 is newer than this CLI (1.0.0).",
      });

      await expect(
        purgeCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(2);
      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining("newer than this CLI")
      );
    });

    it("exits with UserAbort when user declines typed confirmation", async () => {
      mockConfirmPhrase.mockResolvedValue(false);

      await expect(
        purgeCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining("cancelled")
      );
    });

    it("exits with ExternalError when purge completes with Docker errors", async () => {
      mockCleanupProjectContainers.mockResolvedValue({
        success: false,
        message: "Permission denied",
        error: new Error("Permission denied"),
      });

      await expect(
        purgeCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(3);
    });

    it("continues cleanup even when individual steps fail", async () => {
      // Supabase reset fails, but rest should still run
      mockResetSupabase.mockResolvedValue({
        success: false,
        message: "Not running",
      });

      // Container cleanup succeeds
      // Volume removal fails
      mockCleanupProjectVolumes.mockResolvedValue({
        success: false,
        message: "Volume in use",
      });

      await expect(
        purgeCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      // Should still attempt image cleanup and file deletion despite earlier failures
      expect(mockCleanupProjectImages).toHaveBeenCalled();
      expect(mockDeleteDirectory).toHaveBeenCalled();
      expect(mockDeleteFile).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Safety Guards
  // =========================================================================

  describe("safety guards", () => {
    it("displays irreversibility warning before confirmation", async () => {
      await purgeCommand.parseAsync([], { from: "user" });

      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining("IRREVERSIBLE")
      );
    });

    it("requires typed confirmation phrase, not just yes/no", async () => {
      await purgeCommand.parseAsync([], { from: "user" });

      expect(mockConfirmPhrase).toHaveBeenCalledWith(
        expect.any(String),
        "delete everything"
      );
    });
  });
});
