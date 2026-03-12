/**
 * Integration tests for docker.ts label-based cleanup functions.
 *
 * Verifies deterministic cleanup behavior without a root compose file.
 *
 * @vitest-environment node
 * @module cli/lib/__tests__/docker.test
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mock — created before any module loading
// ---------------------------------------------------------------------------

const spawnSyncMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  spawnSync: spawnSyncMock,
  spawn: vi.fn(),
}));

// docker.ts imports from "child_process" (without node: prefix),
// so mock that path as well to cover both resolution paths.
vi.mock("child_process", () => ({
  spawnSync: spawnSyncMock,
  spawn: vi.fn(),
}));

vi.mock("fs", () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => '{"version":"0.0.0"}'),
}));

vi.mock("../config", () => ({
  findProjectRoot: vi.fn(() => "/mock/project/root"),
}));

vi.mock("../ui", () => ({
  debug: vi.fn(),
  error: vi.fn(),
}));

// Import AFTER all mocks are declared
import {
  cleanupProjectContainers,
  cleanupProjectVolumes,
  cleanupProjectImages,
} from "../docker";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockSpawnResult(opts: {
  status: number | null;
  stdout?: string;
  stderr?: string;
}) {
  return {
    status: opts.status,
    stdout: opts.stdout ?? "",
    stderr: opts.stderr ?? "",
    pid: 1,
    output: [],
    signal: null,
  };
}

// ---------------------------------------------------------------------------
// cleanupProjectContainers
// ---------------------------------------------------------------------------

describe("cleanupProjectContainers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("succeeds with no-op message when no containers are found", async () => {
    spawnSyncMock.mockReturnValueOnce(mockSpawnResult({ status: 0, stdout: "" }));

    const result = await cleanupProjectContainers();

    expect(result.success).toBe(true);
    expect(result.message).toContain("No project containers found");
    expect(spawnSyncMock).toHaveBeenCalledTimes(1);
    expect(spawnSyncMock).toHaveBeenCalledWith(
      "docker",
      ["ps", "-aq", "--filter", "label=com.docker.compose.project=ui-syncup"],
      expect.objectContaining({ encoding: "utf-8" })
    );
  });

  it("removes containers when some are found", async () => {
    spawnSyncMock
      .mockReturnValueOnce(mockSpawnResult({ status: 0, stdout: "abc123\ndef456\n" }))
      .mockReturnValueOnce(mockSpawnResult({ status: 0, stdout: "abc123\ndef456\n" }));

    const result = await cleanupProjectContainers();

    expect(result.success).toBe(true);
    expect(result.message).toContain("Removed 2 container(s)");
    expect(spawnSyncMock).toHaveBeenCalledTimes(2);
    expect(spawnSyncMock).toHaveBeenNthCalledWith(
      2,
      "docker",
      ["rm", "-f", "abc123", "def456"],
      expect.objectContaining({ encoding: "utf-8" })
    );
  });

  it("returns failure when docker ps fails", async () => {
    spawnSyncMock.mockReturnValueOnce(
      mockSpawnResult({ status: 1, stderr: "Cannot connect to Docker daemon" })
    );

    const result = await cleanupProjectContainers();

    expect(result.success).toBe(false);
    expect(result.message).toContain("Cannot connect to Docker daemon");
    expect(result.error).toBeDefined();
  });

  it("returns failure when docker rm fails", async () => {
    spawnSyncMock
      .mockReturnValueOnce(mockSpawnResult({ status: 0, stdout: "abc123\n" }))
      .mockReturnValueOnce(mockSpawnResult({ status: 1, stderr: "Error: no such container" }));

    const result = await cleanupProjectContainers();

    expect(result.success).toBe(false);
    expect(result.message).toContain("no such container");
  });

  it("uses custom project name when provided", async () => {
    spawnSyncMock.mockReturnValueOnce(mockSpawnResult({ status: 0, stdout: "" }));

    await cleanupProjectContainers("my-custom-project");

    expect(spawnSyncMock).toHaveBeenCalledWith(
      "docker",
      ["ps", "-aq", "--filter", "label=com.docker.compose.project=my-custom-project"],
      expect.objectContaining({ encoding: "utf-8" })
    );
  });
});

// ---------------------------------------------------------------------------
// cleanupProjectVolumes
// ---------------------------------------------------------------------------

describe("cleanupProjectVolumes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("succeeds with no-op message when no volumes are found", async () => {
    spawnSyncMock.mockReturnValueOnce(mockSpawnResult({ status: 0, stdout: "" }));

    const result = await cleanupProjectVolumes();

    expect(result.success).toBe(true);
    expect(result.message).toContain("No project volumes found");
    expect(spawnSyncMock).toHaveBeenCalledWith(
      "docker",
      ["volume", "ls", "-q", "--filter", "label=com.docker.compose.project=ui-syncup"],
      expect.objectContaining({ encoding: "utf-8" })
    );
  });

  it("removes volumes when some are found", async () => {
    spawnSyncMock
      .mockReturnValueOnce(mockSpawnResult({ status: 0, stdout: "vol_data\nvol_config\n" }))
      .mockReturnValueOnce(mockSpawnResult({ status: 0, stdout: "" }));

    const result = await cleanupProjectVolumes();

    expect(result.success).toBe(true);
    expect(result.message).toContain("Removed 2 volume(s)");
    expect(spawnSyncMock).toHaveBeenNthCalledWith(
      2,
      "docker",
      ["volume", "rm", "-f", "vol_data", "vol_config"],
      expect.objectContaining({ encoding: "utf-8" })
    );
  });

  it("returns failure when docker volume ls fails", async () => {
    spawnSyncMock.mockReturnValueOnce(
      mockSpawnResult({ status: 1, stderr: "permission denied" })
    );

    const result = await cleanupProjectVolumes();

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// cleanupProjectImages
// ---------------------------------------------------------------------------

describe("cleanupProjectImages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("succeeds with no-op message when no images are found", async () => {
    spawnSyncMock.mockReturnValueOnce(mockSpawnResult({ status: 0, stdout: "" }));

    const result = await cleanupProjectImages();

    expect(result.success).toBe(true);
    expect(result.message).toContain("No project images found");
    expect(spawnSyncMock).toHaveBeenCalledWith(
      "docker",
      ["image", "ls", "-q", "--filter", "label=com.docker.compose.project=ui-syncup"],
      expect.objectContaining({ encoding: "utf-8" })
    );
  });

  it("removes images when some are found", async () => {
    spawnSyncMock
      .mockReturnValueOnce(mockSpawnResult({ status: 0, stdout: "sha256:aaa\nsha256:bbb\nsha256:ccc\n" }))
      .mockReturnValueOnce(mockSpawnResult({ status: 0, stdout: "" }));

    const result = await cleanupProjectImages();

    expect(result.success).toBe(true);
    expect(result.message).toContain("Removed 3 image(s)");
    expect(spawnSyncMock).toHaveBeenNthCalledWith(
      2,
      "docker",
      ["rmi", "-f", "sha256:aaa", "sha256:bbb", "sha256:ccc"],
      expect.objectContaining({ encoding: "utf-8" })
    );
  });

  it("returns failure when docker rmi fails", async () => {
    spawnSyncMock
      .mockReturnValueOnce(mockSpawnResult({ status: 0, stdout: "sha256:aaa\n" }))
      .mockReturnValueOnce(mockSpawnResult({ status: 1, stderr: "image is referenced in multiple repositories" }));

    const result = await cleanupProjectImages();

    expect(result.success).toBe(false);
    expect(result.message).toContain("image is referenced");
  });
});
