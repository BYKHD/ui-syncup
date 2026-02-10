/**
 * Integration tests for the `down` command workflow.
 *
 * Validates stack shutdown, service detection, partial failure handling,
 * and documentation-critical outputs.
 *
 * @vitest-environment node
 * @module cli/commands/__tests__/down.test
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockFindProjectRoot = vi.hoisted(() => vi.fn());
const mockIsProductionEnvironment = vi.hoisted(() => vi.fn());
const mockStopSupabase = vi.hoisted(() => vi.fn());
const mockGetSupabaseStatus = vi.hoisted(() => vi.fn());
const mockHasStorageComposeFile = vi.hoisted(() => vi.fn());
const mockStopStorageService = vi.hoisted(() => vi.fn());
const mockIsStorageServiceRunning = vi.hoisted(() => vi.fn());

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
  stopSupabase: mockStopSupabase,
  getSupabaseStatus: mockGetSupabaseStatus,
  hasStorageComposeFile: mockHasStorageComposeFile,
  stopStorageService: mockStopStorageService,
  isStorageServiceRunning: mockIsStorageServiceRunning,
  // Project Config
  loadProjectConfig: vi.fn(() => null),
  success: mockSuccess,
  warning: mockWarning,
  error: mockError,
  info: mockInfo,
  log: mockLog,
  newLine: mockNewLine,
  debug: mockDebug,
  createSpinner: mockCreateSpinner,
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
  mockGetSupabaseStatus.mockResolvedValue({
    ok: true,
    services: [
      { name: "studio", status: "running" },
      { name: "api", status: "running" },
    ],
  });
  mockStopSupabase.mockResolvedValue({ success: true });
  mockHasStorageComposeFile.mockReturnValue(false);
  mockIsStorageServiceRunning.mockReturnValue(false);
}

// ---------------------------------------------------------------------------
// Import AFTER mocks
// ---------------------------------------------------------------------------

import { downCommand } from "../down";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("down command", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new ExitError(code ?? 0);
    });
    setupDefaultMocks();
  });

  // =========================================================================
  // Happy Paths
  // =========================================================================

  describe("happy path", () => {
    it("stops all services successfully", async () => {
      await downCommand.parseAsync([], { from: "user" });

      expect(exitSpy).not.toHaveBeenCalled();
      expect(mockStopSupabase).toHaveBeenCalled();
      expect(mockSuccess).toHaveBeenCalledWith(
        expect.stringContaining("stopped successfully")
      );
    });

    it("reports nothing to stop when no services are running", async () => {
      mockGetSupabaseStatus.mockResolvedValue({ ok: true, services: [] });

      await downCommand.parseAsync([], { from: "user" });

      expect(exitSpy).not.toHaveBeenCalled();
      expect(mockStopSupabase).not.toHaveBeenCalled();
      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining("Nothing to stop")
      );
    });

    it("stops storage service when running", async () => {
      mockHasStorageComposeFile.mockReturnValue(true);
      mockIsStorageServiceRunning.mockReturnValue(true);
      mockStopStorageService.mockResolvedValue({ success: true });

      await downCommand.parseAsync([], { from: "user" });

      expect(exitSpy).not.toHaveBeenCalled();
      expect(mockStopStorageService).toHaveBeenCalled();
    });

    it("preserves data volumes and displays guidance", async () => {
      await downCommand.parseAsync([], { from: "user" });

      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining("Data volumes have been preserved")
      );
      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining("ui-syncup up")
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
        downCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(2);
    });

    it("exits with ValidationError in production environment", async () => {
      mockIsProductionEnvironment.mockReturnValue(true);

      await expect(
        downCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(2);
      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining("production environment")
      );
    });

    it("exits with ExternalError when Supabase stop fails", async () => {
      mockStopSupabase.mockResolvedValue({
        success: false,
        message: "Failed to stop",
      });

      await expect(
        downCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(3);
      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining("still be running")
      );
    });

    it("reports partial failure when storage stop fails but Supabase succeeds", async () => {
      mockHasStorageComposeFile.mockReturnValue(true);
      mockIsStorageServiceRunning.mockReturnValue(true);
      mockStopStorageService.mockResolvedValue({
        success: false,
        message: "Port busy",
      });

      await expect(
        downCommand.parseAsync([], { from: "user" })
      ).rejects.toThrow(ExitError);

      expect(exitSpy).toHaveBeenCalledWith(3);
      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining("completed with errors")
      );
    });
  });
});
