/**
 * Integration tests for the `up` command workflow.
 *
 * Validates stack startup including prerequisite checks, Supabase start,
 * database readiness, migrations, and storage service startup.
 *
 * @vitest-environment node
 * @module cli/commands/__tests__/up.test
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockFindProjectRoot = vi.hoisted(() => vi.fn());
const mockIsProductionEnvironment = vi.hoisted(() => vi.fn());
const mockIsDockerInstalled = vi.hoisted(() => vi.fn());
const mockIsDockerRunning = vi.hoisted(() => vi.fn());
const mockIsSupabaseInstalled = vi.hoisted(() => vi.fn());
const mockStartSupabase = vi.hoisted(() => vi.fn());
const mockGetSupabaseStatus = vi.hoisted(() => vi.fn());
const mockResolveLocalDirectUrl = vi.hoisted(() => vi.fn());
const mockWaitForDatabase = vi.hoisted(() => vi.fn());
const mockRunMigrations = vi.hoisted(() => vi.fn());
const mockHasStorageComposeFile = vi.hoisted(() => vi.fn());
const mockStartStorageService = vi.hoisted(() => vi.fn());
const mockWaitForStorage = vi.hoisted(() => vi.fn());
const mockGetStorageStatus = vi.hoisted(() => vi.fn());
const mockLoadProjectConfigWithStatus = vi.hoisted(() => vi.fn());

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
  isProductionEnvironment: mockIsProductionEnvironment,
  // Docker
  isDockerInstalled: mockIsDockerInstalled,
  isDockerRunning: mockIsDockerRunning,
  // Supabase
  isSupabaseInstalled: mockIsSupabaseInstalled,
  startSupabase: mockStartSupabase,
  getSupabaseStatus: mockGetSupabaseStatus,
  resolveLocalDirectUrl: mockResolveLocalDirectUrl,
  waitForDatabase: mockWaitForDatabase,
  runMigrations: mockRunMigrations,
  // Storage
  hasStorageComposeFile: mockHasStorageComposeFile,
  startStorageService: mockStartStorageService,
  waitForStorage: mockWaitForStorage,
  getStorageStatus: mockGetStorageStatus,
  // Project Config
  loadProjectConfigWithStatus: mockLoadProjectConfigWithStatus,
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
  // Constants
  DEFAULT_PORTS: { app: 3000, db: 54322, studio: 54323, api: 54321 },
  DATABASE_TIMEOUT_MS: 30_000,
  STORAGE_TIMEOUT_MS: 15_000,
  ExitCode: { Success: 0, UserAbort: 1, ValidationError: 2, ExternalError: 3, InternalError: 4 },
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
  mockIsSupabaseInstalled.mockResolvedValue(true);
  mockResolveLocalDirectUrl.mockReturnValue("postgresql://127.0.0.1:54322/postgres");
  mockStartSupabase.mockResolvedValue({ success: true });
  mockGetSupabaseStatus.mockResolvedValue({
    ok: true,
    services: [
      { name: "studio", status: "running", url: "http://localhost:54323" },
      { name: "api", status: "running", url: "http://localhost:54321" },
    ],
  });
  mockWaitForDatabase.mockResolvedValue(true);
  mockRunMigrations.mockResolvedValue({ success: true });
  mockHasStorageComposeFile.mockReturnValue(false);
  mockGetStorageStatus.mockReturnValue({ running: false });
  mockLoadProjectConfigWithStatus.mockReturnValue({ status: "missing" });
}

// ---------------------------------------------------------------------------
// Import AFTER mocks
// ---------------------------------------------------------------------------

import { upCommand } from "../up";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("up command", () => {
  let exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
    throw new ExitError(normalizeExitCode(code));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    exitSpy.mockRestore();
    exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new ExitError(normalizeExitCode(code));
    });
    // Reset Commander's stored option values to prevent state leaks between tests
    upCommand.setOptionValue("skipMigrations", false);
    setupDefaultMocks();
  });

  // =========================================================================
  // Happy Paths
  // =========================================================================

  describe("happy path", () => {
    it("starts the development stack successfully (core services only)", async () => {
      await upCommand.parseAsync([], { from: "user" });

      expect(exitSpy).not.toHaveBeenCalled();
      expect(mockStartSupabase).toHaveBeenCalled();
      expect(mockWaitForDatabase).toHaveBeenCalled();
      expect(mockRunMigrations).toHaveBeenCalled();
      expect(mockSuccess).toHaveBeenCalledWith(
        expect.stringContaining("core services only")
      );
    });

    it("starts with storage when compose file exists", async () => {
      mockHasStorageComposeFile.mockReturnValue(true);
      mockStartStorageService.mockResolvedValue({ success: true });
      mockWaitForStorage.mockResolvedValue(true);
      mockGetStorageStatus.mockReturnValue({
        running: true,
        apiUrl: "http://localhost:9000",
        consoleUrl: "http://localhost:9001",
      });

      await upCommand.parseAsync([], { from: "user" });

      expect(exitSpy).not.toHaveBeenCalled();
      expect(mockStartStorageService).toHaveBeenCalled();
      expect(mockSuccess).toHaveBeenCalledWith(
        expect.stringContaining("core + storage")
      );
    });

    it("skips migrations when --skip-migrations is passed", async () => {
      await upCommand.parseAsync(["--skip-migrations"], { from: "user" });

      expect(exitSpy).not.toHaveBeenCalled();
      expect(mockRunMigrations).not.toHaveBeenCalled();
      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining("Skipping migrations")
      );
    });

    it("displays service URLs in a box", async () => {
      await upCommand.parseAsync([], { from: "user" });

      expect(mockBox).toHaveBeenCalledWith(
        expect.stringContaining("Service URLs"),
        expect.stringContaining("localhost")
      );
    });

    it("displays next-step guidance after startup", async () => {
      await upCommand.parseAsync([], { from: "user" });

      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining("bun dev")
      );
    });

    it("continues when project config loads successfully without verbose mode", async () => {
      mockLoadProjectConfigWithStatus.mockReturnValue({
        status: "ok",
        config: { version: "1.0.0", defaults: { mode: "local" } },
      });

      await upCommand.parseAsync([], { from: "user" });

      expect(exitSpy).not.toHaveBeenCalled();
      expect(mockStartSupabase).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Failure Paths
  // =========================================================================

  describe("failure paths", () => {
    it("exits with ValidationError when not in a project directory", async () => {
      mockFindProjectRoot.mockReturnValue(null);

      await expect(
        upCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(2);
    });

    it("exits with ValidationError in production environment", async () => {
      mockIsProductionEnvironment.mockReturnValue(true);

      await expect(
        upCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(2);
      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining("production environment")
      );
    });

    it("exits with ValidationError when project config is newer than CLI schema", async () => {
      mockLoadProjectConfigWithStatus.mockReturnValue({
        status: "newer_schema",
        error: "Config schema 2.0.0 is newer than this CLI (1.0.0).",
      });

      await expect(
        upCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(2);
      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining("newer than this CLI")
      );
    });

    it("includes config load status when project config fails without an error message", async () => {
      mockLoadProjectConfigWithStatus.mockReturnValue({
        status: "io_error",
      });

      await expect(
        upCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(2);
      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining("status: io_error")
      );
    });

    it("exits with ValidationError when Docker is not installed", async () => {
      mockIsDockerInstalled.mockResolvedValue(false);

      await expect(
        upCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(2);
      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining("Docker is required")
      );
    });

    it("exits with ExternalError when Docker is not running", async () => {
      mockIsDockerRunning.mockResolvedValue(false);

      await expect(
        upCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(3);
    });

    it("exits with ExternalError when Supabase fails to start", async () => {
      mockStartSupabase.mockResolvedValue({
        success: false,
        message: "Supabase start failed",
      });

      await expect(
        upCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(3);
    });

    it("exits with ExternalError when database does not become ready", async () => {
      mockWaitForDatabase.mockResolvedValue(false);

      await expect(
        upCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(3);
      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining("Timed out")
      );
    });

    it("exits with ExternalError when migrations fail", async () => {
      mockRunMigrations.mockResolvedValue({
        success: false,
        message: "Migration syntax error",
      });

      await expect(
        upCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(3);
    });

    it("exits with ValidationError when DIRECT_URL is not configured", async () => {
      mockResolveLocalDirectUrl.mockReturnValue(null);

      await expect(
        upCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(2);
      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining("DIRECT_URL")
      );
    });
  });

  // =========================================================================
  // Storage Edge Cases
  // =========================================================================

  describe("storage edge cases", () => {
    it("warns but continues when storage service fails to start", async () => {
      mockHasStorageComposeFile.mockReturnValue(true);
      mockStartStorageService.mockResolvedValue({
        success: false,
        message: "Port conflict",
      });
      mockGetStorageStatus.mockReturnValue({ running: false });

      await upCommand.parseAsync([], { from: "user" });

      expect(exitSpy).not.toHaveBeenCalled();
      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining("unavailable")
      );
    });
  });
});
