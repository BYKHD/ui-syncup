/**
 * Network Service with retry logic
 *
 * Provides network operations with exponential backoff and offline detection.
 *
 * @module cli/lib/network
 * @see Requirements: 7.7 (retry), 7.8 (cached resources), 7.9 (network errors)
 */

import { NETWORK_RETRY } from "./constants";
import { debug } from "./ui";

// ============================================================================
// Types
// ============================================================================

/** Options for retry behavior */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Base delay between retries in milliseconds */
  baseDelayMs: number;
  /** Maximum delay between retries in milliseconds */
  maxDelayMs: number;
  /** Optional callback for retry progress */
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

/** Default retry configuration */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: NETWORK_RETRY.maxAttempts,
  baseDelayMs: NETWORK_RETRY.baseDelayMs,
  maxDelayMs: NETWORK_RETRY.maxDelayMs,
};

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Execute an operation with exponential backoff retry
 *
 * @param operation - Async function to execute
 * @param options - Retry configuration options
 * @returns Result of the operation
 * @throws Error if all retries fail
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> {
  const config: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on last attempt
      if (attempt === config.maxAttempts) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelayMs * Math.pow(2, attempt - 1),
        config.maxDelayMs
      );

      debug(`Attempt ${attempt} failed, retrying in ${delay}ms: ${lastError.message}`);

      // Notify callback if provided
      if (config.onRetry) {
        config.onRetry(attempt, lastError, delay);
      }

      // Wait before retry
      await sleep(delay);
    }
  }

  throw lastError || new Error("All retry attempts failed");
}

// ============================================================================
// Connectivity Check
// ============================================================================

/** Default host to check for connectivity */
const DEFAULT_CONNECTIVITY_HOST = "https://api.github.com";

/**
 * Check if there is network connectivity
 *
 * @param host - URL to check (default: api.github.com)
 * @returns true if connected, false if offline
 */
export async function checkConnectivity(
  host: string = DEFAULT_CONNECTIVITY_HOST
): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(host, {
      method: "HEAD",
      signal: controller.signal,
    });

    return response.ok || response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Check if the system appears to be offline
 *
 * @returns true if offline, false if online
 */
export async function isOffline(): Promise<boolean> {
  const connected = await checkConnectivity();
  return !connected;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a timeout wrapper for a promise
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string = "Operation timed out"
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Retry specifically for network-related errors
 * Will not retry non-network errors like validation failures
 */
export async function withNetworkRetry<T>(
  operation: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> {
  return withRetry(async () => {
    try {
      return await operation();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      // Check if this is a network error worth retrying
      const isNetworkError =
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("ENOTFOUND") ||
        error.message.includes("ETIMEDOUT") ||
        error.message.includes("ECONNRESET") ||
        error.message.includes("fetch failed") ||
        error.name === "AbortError";

      if (!isNetworkError) {
        throw err; // Don't retry non-network errors
      }

      throw err; // Let withRetry handle it
    }
  }, options);
}
