/**
 * Storage Service
 *
 * Manages the local MinIO storage service lifecycle including
 * startup, shutdown, health checks, and status reporting.
 *
 * @module cli/lib/storage
 */

import { spawnSync, spawn, type ChildProcess } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

import type { CommandResult, ServiceStatus } from "./types";
import {
  DEFAULT_PORTS,
  DOCKER_COMPOSE_MINIO,
  MINIO_CONFIG,
  STORAGE_TIMEOUT_MS,
} from "./constants";
import { findProjectRoot } from "./config";
import { debug, error as logError } from "./ui";

// ============================================================================
// Storage Service Status
// ============================================================================

/**
 * Storage readiness result with health and bucket details
 */
export interface StorageStatusResult {
  /** Whether the status check itself succeeded */
  ok: boolean;
  /** Whether the MinIO service is running */
  running: boolean;
  /** MinIO S3 API URL when running */
  apiUrl?: string;
  /** MinIO Console URL when running */
  consoleUrl?: string;
  /** Error message if status check failed */
  error?: string;
}

/**
 * Check if the MinIO compose file exists in the project
 */
export function hasStorageComposeFile(): boolean {
  const projectRoot = findProjectRoot();
  if (!projectRoot) return false;
  return existsSync(join(projectRoot, DOCKER_COMPOSE_MINIO));
}

/**
 * Check if the MinIO storage container is currently running
 */
export function isStorageServiceRunning(): boolean {
  const result = spawnSync(
    "docker",
    ["inspect", "-f", "{{.State.Running}}", MINIO_CONFIG.containerName],
    {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    }
  );

  return result.status === 0 && result.stdout.trim() === "true";
}

/**
 * Get the current status of the storage service
 */
export function getStorageStatus(): StorageStatusResult {
  if (!hasStorageComposeFile()) {
    return {
      ok: true,
      running: false,
      error: `No ${DOCKER_COMPOSE_MINIO} found in project root.`,
    };
  }

  const running = isStorageServiceRunning();

  return {
    ok: true,
    running,
    apiUrl: running
      ? `http://localhost:${DEFAULT_PORTS.minioApi}`
      : undefined,
    consoleUrl: running
      ? `http://localhost:${DEFAULT_PORTS.minioConsole}`
      : undefined,
  };
}

// ============================================================================
// Storage Service Lifecycle
// ============================================================================

/**
 * Start the MinIO storage service via docker-compose
 */
export async function startStorageService(): Promise<CommandResult> {
  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    return {
      success: false,
      message: "Not in a UI SyncUp project directory.",
      error: new Error("Project root not found"),
    };
  }

  const composeFile = join(projectRoot, DOCKER_COMPOSE_MINIO);
  if (!existsSync(composeFile)) {
    return {
      success: false,
      message: `Storage compose file not found: ${DOCKER_COMPOSE_MINIO}`,
      error: new Error(`${DOCKER_COMPOSE_MINIO} does not exist`),
    };
  }

  const args = [
    "compose",
    "-f",
    DOCKER_COMPOSE_MINIO,
    "-p",
    MINIO_CONFIG.projectName,
    "up",
    "-d",
    "--wait",
  ];

  debug(`Starting storage service: docker ${args.join(" ")}`);

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
          message: "Storage service started successfully",
        });
      } else {
        resolve({
          success: false,
          message: stderr.trim() || `Storage service failed to start (exit code ${code})`,
          error: new Error(stderr.trim() || `Exit code: ${code}`),
        });
      }
    });

    child.on("error", (err) => {
      resolve({
        success: false,
        message: `Failed to start storage service: ${err.message}`,
        error: err,
      });
    });
  });
}

/**
 * Stop the MinIO storage service
 */
export async function stopStorageService(): Promise<CommandResult> {
  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    return {
      success: false,
      message: "Not in a UI SyncUp project directory.",
      error: new Error("Project root not found"),
    };
  }

  if (!hasStorageComposeFile()) {
    return {
      success: true,
      message: "No storage compose file found, nothing to stop.",
    };
  }

  const args = [
    "compose",
    "-f",
    DOCKER_COMPOSE_MINIO,
    "-p",
    MINIO_CONFIG.projectName,
    "down",
  ];

  debug(`Stopping storage service: docker ${args.join(" ")}`);

  return new Promise((resolve) => {
    const child = spawn("docker", args, {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: projectRoot,
    });

    let stderr = "";

    child.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({
          success: true,
          message: "Storage service stopped",
        });
      } else {
        resolve({
          success: false,
          message: stderr.trim() || `Failed to stop storage service (exit code ${code})`,
          error: new Error(stderr.trim() || `Exit code: ${code}`),
        });
      }
    });

    child.on("error", (err) => {
      resolve({
        success: false,
        message: `Failed to stop storage service: ${err.message}`,
        error: err,
      });
    });
  });
}

/**
 * Remove MinIO containers, volumes and images (for purge)
 */
export async function purgeStorageService(): Promise<CommandResult> {
  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    return {
      success: false,
      message: "Not in a UI SyncUp project directory.",
      error: new Error("Project root not found"),
    };
  }

  if (!hasStorageComposeFile()) {
    return {
      success: true,
      message: "No storage compose file found, nothing to purge.",
    };
  }

  const args = [
    "compose",
    "-f",
    DOCKER_COMPOSE_MINIO,
    "-p",
    MINIO_CONFIG.projectName,
    "down",
    "-v",
    "--rmi",
    "local",
    "--remove-orphans",
  ];

  debug(`Purging storage service: docker ${args.join(" ")}`);

  return new Promise((resolve) => {
    const child = spawn("docker", args, {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: projectRoot,
    });

    let stderr = "";

    child.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({
          success: true,
          message: "Storage service purged completely",
        });
      } else {
        resolve({
          success: false,
          message: stderr.trim() || `Failed to purge storage service (exit code ${code})`,
          error: new Error(stderr.trim() || `Exit code: ${code}`),
        });
      }
    });

    child.on("error", (err) => {
      resolve({
        success: false,
        message: `Failed to purge storage service: ${err.message}`,
        error: err,
      });
    });
  });
}

// ============================================================================
// Storage Health Check
// ============================================================================

/**
 * Wait for the MinIO storage service to become healthy
 *
 * @param timeoutMs - Maximum time to wait in milliseconds
 * @returns true if storage became healthy within timeout
 */
export async function waitForStorage(
  timeoutMs: number = STORAGE_TIMEOUT_MS
): Promise<boolean> {
  const startTime = Date.now();
  const endpoint = `http://localhost:${DEFAULT_PORTS.minioApi}/minio/health/live`;

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(2000) });
      if (response.ok) {
        return true;
      }
    } catch {
      // Service not ready yet, retry
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return false;
}
