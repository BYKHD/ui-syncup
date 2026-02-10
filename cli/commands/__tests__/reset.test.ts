/**
 * Integration tests for the `reset` command workflow.
 *
 * Validates environment reset including service shutdown, database reset,
 * storage clearing, container cleanup, and documentation-critical outputs.
 *
 * @vitest-environment node
 * @module cli/commands/__tests__/reset.test
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockFindProjectRoot = vi.hoisted(() => vi.fn());
const mockIsProductionEnvironment = vi.hoisted(() => vi.fn());
const mockIsSupabaseInstalled = vi.hoisted(() => vi.fn());
const mockIsDockerInstalled = vi.hoisted(() => vi.fn());
const mockIsDockerRunning = vi.hoisted(() => vi.fn());
const mockStopSupabase = vi.hoisted(() => vi.fn());
const mockGetSupabaseStatus = vi.hoisted(() => vi.fn());
const mockResetSupabase = vi.hoisted(() => vi.fn());
const mockCleanupProjectContainers = vi.hoisted(() => vi.fn());
const mockHasStorageComposeFile = vi.hoisted(() => vi.fn());
const mockIsStorageServiceRunning = vi.hoisted(() => vi.fn());
const mockStopStorageService = vi.hoisted(() => vi.fn());
const mockClearDirectory = vi.hoisted(() => vi.fn());
const mockEnsureDirectory = vi.hoisted(() => vi.fn());
const mockConfirm = vi.hoisted(() => vi.fn());
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
  isSupabaseInstalled: mockIsSupabaseInstalled,
  isDockerInstalled: mockIsDockerInstalled,
  isDockerRunning: mockIsDockerRunning,
  stopSupabase: mockStopSupabase,
  getSupabaseStatus: mockGetSupabaseStatus,
  resetSupabase: mockResetSupabase,
  cleanupProjectContainers: mockCleanupProjectContainers,
  hasStorageComposeFile: mockHasStorageComposeFile,
  isStorageServiceRunning: mockIsStorageServiceRunning,
  stopStorageService: mockStopStorageService,
  clearDirectory: mockClearDirectory,
  ensureDirectory: mockEnsureDirectory,
  confirm: mockConfirm,
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
  mockIsSupabaseInstalled.mockResolvedValue(true);
  mockIsDockerInstalled.mockResolvedValue(true);
  mockIsDockerRunning.mockResolvedValue(true);
  mockConfirm.mockResolvedValue(true);
  mockGetSupabaseStatus.mockResolvedValue({
    ok: true,
    services: [{ name: "api", status: "running" }],
  });
  mockStopSupabase.mockResolvedValue({ success: true });
  mockResetSupabase.mockResolvedValue({ success: true });
  mockEnsureDirectory.mockResolvedValue({ success: true });
  mockClearDirectory.mockResolvedValue({ success: true });
  mockCleanupProjectContainers.mockResolvedValue({
    success: true,
    message: "No project containers found.",
  });
  mockHasStorageComposeFile.mockReturnValue(false);
  mockIsStorageServiceRunning.mockReturnValue(false);
  mockLoadProjectConfigWithStatus.mockReturnValue({ status: "missing" });
}

// ---------------------------------------------------------------------------
// Import AFTER mocks
// ---------------------------------------------------------------------------

import { resetCommand } from "../reset";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("reset command", () => {
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
    it("resets the development environment successfully", async () => {
      await resetCommand.parseAsync([], { from: "user" });

      expect(exitSpy).not.toHaveBeenCalled();
      expect(mockStopSupabase).toHaveBeenCalled();
      expect(mockResetSupabase).toHaveBeenCalled();
      expect(mockClearDirectory).toHaveBeenCalled();
      expect(mockCleanupProjectContainers).toHaveBeenCalled();
      expect(mockSuccess).toHaveBeenCalledWith(
        expect.stringContaining("reset successfully")
      );
    });

    it("preserves configuration files", async () => {
      await resetCommand.parseAsync([], { from: "user" });

      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining("Configuration files have been preserved")
      );
    });

    it("displays restart guidance after reset", async () => {
      await resetCommand.parseAsync([], { from: "user" });

      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining("ui-syncup up")
      );
    });

    it("stops MinIO storage when it is running", async () => {
      mockHasStorageComposeFile.mockReturnValue(true);
      mockIsStorageServiceRunning.mockReturnValue(true);
      mockStopStorageService.mockResolvedValue({ success: true });

      await resetCommand.parseAsync([], { from: "user" });

      expect(mockStopStorageService).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Failure Paths
  // =========================================================================

  describe("failure paths", () => {
    it("exits with ValidationError when not in a project directory", async () => {
      mockFindProjectRoot.mockReturnValue(null);

      await expect(
        resetCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(2);
    });

    it("exits with ValidationError in production environment", async () => {
      mockIsProductionEnvironment.mockReturnValue(true);

      await expect(
        resetCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(2);
      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining("production environment")
      );
    });

    it("exits with ValidationError when project config is invalid", async () => {
      mockLoadProjectConfigWithStatus.mockReturnValue({
        status: "invalid",
        error: "Invalid configuration in ui-syncup.config.json: version: Required",
      });

      await expect(
        resetCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(2);
      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining("Invalid configuration")
      );
    });

    it("exits with ValidationError when Supabase CLI is missing", async () => {
      mockIsSupabaseInstalled.mockResolvedValue(false);

      await expect(
        resetCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(2);
    });

    it("exits with ValidationError when Docker is not installed", async () => {
      mockIsDockerInstalled.mockResolvedValue(false);

      await expect(
        resetCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(2);
    });

    it("exits with ExternalError when Docker is not running", async () => {
      mockIsDockerRunning.mockResolvedValue(false);

      await expect(
        resetCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(3);
    });

    it("cancels gracefully when user declines confirmation", async () => {
      mockConfirm.mockResolvedValue(false);

      await resetCommand.parseAsync([], { from: "user" });

      expect(exitSpy).not.toHaveBeenCalled();
      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining("cancelled")
      );
      expect(mockResetSupabase).not.toHaveBeenCalled();
    });

    it("exits with ExternalError when reset completes with errors", async () => {
      mockResetSupabase.mockResolvedValue({
        success: false,
        message: "Database reset failed",
      });

      await expect(
        resetCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(3);
      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining("completed with some errors")
      );
    });
  });
});
