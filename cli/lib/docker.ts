/**
 * Docker Service
 *
 * Provides Docker container and compose management for the local development stack.
 *
 * @module cli/lib/docker
 * @see Requirements: 2.1, 2.2, 3.1, 4.3, 4.6, 5.5-5.7
 */

import { spawnSync, spawn, type ChildProcess } from "child_process";
import type { CommandResult, ServiceStatus } from "./types";
import { findProjectRoot } from "./config";
import { debug, error as logError } from "./ui";

const PROJECT_ROOT_ERROR =
  "Not in a UI SyncUp project. Run from project root or a subdirectory.";

// ============================================================================
// Docker Detection
// ============================================================================

/**
 * Check if Docker is installed
 */
export async function isDockerInstalled(): Promise<boolean> {
  const result = spawnSync("docker", ["--version"], {
    encoding: "utf-8",
    timeout: 5000,
    stdio: ["pipe", "pipe", "pipe"],
  });
  return result.status === 0;
}

/**
 * Check if Docker daemon is running
 */
export async function isDockerRunning(): Promise<boolean> {
  const result = spawnSync("docker", ["info"], {
    encoding: "utf-8",
    timeout: 10000,
    stdio: ["pipe", "pipe", "pipe"],
  });
  return result.status === 0;
}

/**
 * Get Docker version string
 */
export async function getDockerVersion(): Promise<string | null> {
  const result = spawnSync("docker", ["--version"], {
    encoding: "utf-8",
    timeout: 5000,
  });

  if (result.status !== 0 || !result.stdout) {
    return null;
  }

  // Parse "Docker version 24.0.0, build xxx"
  const match = result.stdout.match(/Docker version ([0-9.]+)/);
  return match ? match[1] : result.stdout.trim();
}

// ============================================================================
// Container Management
// ============================================================================

/**
 * Start Docker Compose services
 *
 * @param projectName - Optional project name (defaults to ui-syncup)
 * @param detached - Run in detached mode (default: true)
 */
export async function startServices(
  projectName: string = "ui-syncup",
  detached: boolean = true
): Promise<CommandResult> {
  const args = ["compose", "-p", projectName, "up"];
  if (detached) {
    args.push("-d");
  }

  return runDockerCommand(args, "Starting Docker services...");
}

/**
 * Stop Docker Compose services
 *
 * @param projectName - Optional project name (defaults to ui-syncup)
 */
export async function stopServices(
  projectName: string = "ui-syncup"
): Promise<CommandResult> {
  const args = ["compose", "-p", projectName, "down"];
  return runDockerCommand(args, "Stopping Docker services...");
}

/**
 * Remove Docker containers for the project
 *
 * @param projectName - Optional project name (defaults to ui-syncup)
 */
export async function removeContainers(
  projectName: string = "ui-syncup"
): Promise<CommandResult> {
  // Stop and remove containers
  const args = ["compose", "-p", projectName, "down", "--remove-orphans"];
  return runDockerCommand(args, "Removing containers...");
}

/**
 * Remove Docker volumes for the project
 *
 * @param projectName - Optional project name (defaults to ui-syncup)
 */
export async function removeVolumes(
  projectName: string = "ui-syncup"
): Promise<CommandResult> {
  const args = ["compose", "-p", projectName, "down", "-v"];
  return runDockerCommand(args, "Removing volumes...");
}

/**
 * Remove Docker images for the project
 *
 * @param projectName - Optional project name (defaults to ui-syncup)
 */
export async function removeImages(
  projectName: string = "ui-syncup"
): Promise<CommandResult> {
  const args = ["compose", "-p", projectName, "down", "--rmi", "local"];
  return runDockerCommand(args, "Removing images...");
}

/**
 * Perform full cleanup: containers, volumes, and images
 *
 * @param projectName - Optional project name (defaults to ui-syncup)
 */
export async function fullCleanup(
  projectName: string = "ui-syncup"
): Promise<CommandResult> {
  const args = [
    "compose",
    "-p",
    projectName,
    "down",
    "-v",
    "--rmi",
    "local",
    "--remove-orphans",
  ];
  return runDockerCommand(args, "Performing full cleanup...");
}

// ============================================================================
// Service Status
// ============================================================================

/**
 * Get status of running Docker Compose services
 *
 * @param projectName - Optional project name (defaults to ui-syncup)
 */
export async function getServiceStatus(
  projectName: string = "ui-syncup"
): Promise<ServiceStatus[]> {
  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    logError(PROJECT_ROOT_ERROR);
    return [];
  }

  const result = spawnSync(
    "docker",
    ["compose", "-p", projectName, "ps", "--format", "json"],
    {
      encoding: "utf-8",
      timeout: 10000,
      cwd: projectRoot,
    }
  );

  if (result.status !== 0 || !result.stdout) {
    return [];
  }

  try {
    const raw = result.stdout.trim();
    if (!raw) {
      return [];
    }

    // Newer Docker Compose returns a JSON array; older versions return JSON per line.
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((container) => mapContainerToService(container));
    }
  } catch {
    // Fall back to line-delimited parsing below.
  }

  try {
    const lines = result.stdout.trim().split("\n").filter(Boolean);
    return lines.map((line) => mapContainerToService(JSON.parse(line)));
  } catch {
    return [];
  }
}

/**
 * Parse container state to ServiceStatus status
 */
function parseContainerStatus(state: string): ServiceStatus["status"] {
  const normalized = state.toLowerCase();
  if (normalized.includes("running") || normalized.includes("up")) {
    return "running";
  }
  if (normalized.includes("starting") || normalized.includes("created")) {
    return "starting";
  }
  if (normalized.includes("error") || normalized.includes("dead")) {
    return "error";
  }
  return "stopped";
}

/**
 * Extract URL from container port mappings
 */
function extractPortUrl(publishers: unknown): string | undefined {
  if (!Array.isArray(publishers) || publishers.length === 0) {
    return undefined;
  }

  const pub = publishers[0];
  if (pub && typeof pub === "object" && "PublishedPort" in pub) {
    const port = (pub as { PublishedPort: number }).PublishedPort;
    if (port) {
      return `http://localhost:${port}`;
    }
  }

  return undefined;
}

function mapContainerToService(container: Record<string, unknown>): ServiceStatus {
  const name =
    (container as { Service?: string; Name?: string }).Service ||
    (container as { Name?: string }).Name ||
    "unknown";
  const state = String(
    (container as { State?: string; Status?: string }).State ??
      (container as { Status?: string }).Status ??
      ""
  );

  return {
    name,
    status: parseContainerStatus(state),
    url: extractPortUrl(
      (container as { Publishers?: unknown; Ports?: unknown }).Publishers ??
        (container as { Ports?: unknown }).Ports
    ),
  };
}

// ============================================================================
// Command Execution
// ============================================================================

/**
 * Run a Docker command and return the result
 */
async function runDockerCommand(
  args: string[],
  description: string
): Promise<CommandResult> {
  debug(`${description} (docker ${args.join(" ")})`);

  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    logError(PROJECT_ROOT_ERROR);
    return {
      success: false,
      message: PROJECT_ROOT_ERROR,
      error: new Error(PROJECT_ROOT_ERROR),
    };
  }

  return new Promise((resolve) => {
    const child = spawn("docker", args, {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: projectRoot,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({
          success: true,
          message: stdout.trim() || description,
        });
      } else {
        resolve({
          success: false,
          message: stderr.trim() || `Command failed with code ${code}`,
          error: new Error(stderr.trim() || `Exit code: ${code}`),
        });
      }
    });

    child.on("error", (err) => {
      resolve({
        success: false,
        message: `Failed to run docker: ${err.message}`,
        error: err,
      });
    });
  });
}

/**
 * Run a Docker command with live output streaming
 *
 * @param args - Docker command arguments
 * @param onOutput - Callback for stdout/stderr output
 */
export function runDockerCommandStream(
  args: string[],
  onOutput?: (line: string, isError: boolean) => void
): ChildProcess {
  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    logError(PROJECT_ROOT_ERROR);
    throw new Error(PROJECT_ROOT_ERROR);
  }

  const child = spawn("docker", args, {
    stdio: ["pipe", "pipe", "pipe"],
    cwd: projectRoot,
  });

  if (onOutput) {
    let stdoutBuffer = "";
    let stderrBuffer = "";

    child.stdout?.on("data", (data: Buffer) => {
      stdoutBuffer += data.toString();
      let newlineIndex = stdoutBuffer.indexOf("\n");
      while (newlineIndex !== -1) {
        const line = stdoutBuffer.slice(0, newlineIndex);
        stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
        if (line) {
          onOutput(line, false);
        }
        newlineIndex = stdoutBuffer.indexOf("\n");
      }
    });

    child.stderr?.on("data", (data: Buffer) => {
      stderrBuffer += data.toString();
      let newlineIndex = stderrBuffer.indexOf("\n");
      while (newlineIndex !== -1) {
        const line = stderrBuffer.slice(0, newlineIndex);
        stderrBuffer = stderrBuffer.slice(newlineIndex + 1);
        if (line) {
          onOutput(line, true);
        }
        newlineIndex = stderrBuffer.indexOf("\n");
      }
    });

    child.stdout?.on("end", () => {
      if (stdoutBuffer) {
        onOutput(stdoutBuffer, false);
      }
    });

    child.stderr?.on("end", () => {
      if (stderrBuffer) {
        onOutput(stderrBuffer, true);
      }
    });
  }

  return child;
}

/**
 * Pull Docker images required for the project
 */
export async function pullImages(): Promise<CommandResult> {
  const args = ["compose", "pull"];
  return runDockerCommand(args, "Pulling Docker images...");
}

/**
 * Build Docker images for the project
 */
export async function buildImages(): Promise<CommandResult> {
  const args = ["compose", "build"];
  return runDockerCommand(args, "Building Docker images...");
}
