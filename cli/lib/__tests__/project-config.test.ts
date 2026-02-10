/**
 * Unit tests for the project-config module.
 *
 * Validates V1 config scope: only `version` and `defaults.mode` are active.
 *
 * @vitest-environment node
 * @module cli/lib/__tests__/project-config.test
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import path from "path";

// ---------------------------------------------------------------------------
// Mock fs
// ---------------------------------------------------------------------------

const mockReadFileSync = vi.hoisted(() => vi.fn());
const mockWriteFileSync = vi.hoisted(() => vi.fn());
const mockExistsSync = vi.hoisted(() => vi.fn());
const mockMkdirSync = vi.hoisted(() => vi.fn());

vi.mock("fs", () => ({
  default: {
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    existsSync: mockExistsSync,
    mkdirSync: mockMkdirSync,
  },
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
}));

// ---------------------------------------------------------------------------
// Import AFTER mocks
// ---------------------------------------------------------------------------

import {
  createDefaultConfig,
  validateConfig,
  loadProjectConfig,
  saveProjectConfig,
} from "../project-config";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROJECT_ROOT = "/mock/project";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("project-config (V1 scope)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // createDefaultConfig
  // =========================================================================

  describe("createDefaultConfig", () => {
    it("returns config with only version and defaults.mode", () => {
      const config = createDefaultConfig();

      expect(config).toEqual({
        version: expect.any(String),
        defaults: {
          mode: "local",
        },
      });
    });

    it("does not include ports or verbose in defaults", () => {
      const config = createDefaultConfig();

      expect(config.defaults).not.toHaveProperty("ports");
      expect(config.defaults).not.toHaveProperty("verbose");
    });

    it("sets version to current schema version", () => {
      const config = createDefaultConfig();

      expect(config.version).toBe("1.0.0");
    });
  });

  // =========================================================================
  // validateConfig
  // =========================================================================

  describe("validateConfig", () => {
    it("validates a minimal V1 config successfully", () => {
      const result = validateConfig({
        version: "1.0.0",
        defaults: { mode: "local" },
      });

      expect(result.valid).toBe(true);
    });

    it("validates config with production mode", () => {
      const result = validateConfig({
        version: "1.0.0",
        defaults: { mode: "production" },
      });

      expect(result.valid).toBe(true);
    });

    it("validates config without defaults", () => {
      const result = validateConfig({
        version: "1.0.0",
      });

      expect(result.valid).toBe(true);
    });

    it("rejects config with invalid mode value", () => {
      const result = validateConfig({
        version: "1.0.0",
        defaults: { mode: "staging" },
      });

      expect(result.valid).toBe(false);
    });

    it("rejects config without version", () => {
      const result = validateConfig({
        defaults: { mode: "local" },
      });

      expect(result.valid).toBe(false);
    });
  });

  // =========================================================================
  // loadProjectConfig
  // =========================================================================

  describe("loadProjectConfig", () => {
    it("returns null when config file does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      const result = loadProjectConfig(PROJECT_ROOT);
      expect(result).toBeNull();
    });

    it("loads and returns valid config from file", () => {
      const validConfig = {
        version: "1.0.0",
        defaults: { mode: "local" },
      };
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(validConfig));

      const result = loadProjectConfig(PROJECT_ROOT);
      expect(result).toEqual(validConfig);
    });

    it("returns null for invalid JSON", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("not valid json");

      const result = loadProjectConfig(PROJECT_ROOT);
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // saveProjectConfig
  // =========================================================================

  describe("saveProjectConfig", () => {
    it("writes config as formatted JSON", async () => {
      const config = createDefaultConfig();
      mockMkdirSync.mockReturnValue(undefined);
      mockWriteFileSync.mockReturnValue(undefined);

      const result = await saveProjectConfig(PROJECT_ROOT, config);

      expect(result.success).toBe(true);
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        path.join(PROJECT_ROOT, "ui-syncup.config.json"),
        expect.stringContaining('"version"'),
        "utf-8"
      );
    });

    it("writes only V1 fields (no ports, no verbose)", async () => {
      const config = createDefaultConfig();
      mockMkdirSync.mockReturnValue(undefined);
      mockWriteFileSync.mockReturnValue(undefined);

      await saveProjectConfig(PROJECT_ROOT, config);

      const writtenJson = mockWriteFileSync.mock.calls[0][1] as string;
      const parsed = JSON.parse(writtenJson);

      expect(parsed.defaults).not.toHaveProperty("ports");
      expect(parsed.defaults).not.toHaveProperty("verbose");
      expect(parsed.defaults).toHaveProperty("mode", "local");
    });
  });
});
