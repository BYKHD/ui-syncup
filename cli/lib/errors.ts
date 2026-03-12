/**
 * CLI Error Handling Module
 *
 * Provides custom error classes, error formatting, and recovery suggestions
 * for the UI SyncUp CLI.
 *
 * @module cli/lib/errors
 * @see Requirements: 7.1 (human-readable errors), 7.2 (recovery suggestions),
 *      7.3 (no stack traces), 7.4 (external command errors), 7.6 (partial failures)
 */

import { ExitCode } from "./types";

// ============================================================================
// Custom Error Classes
// ============================================================================

/**
 * Base CLI error class with exit code and optional recovery suggestion
 */
export class CLIError extends Error {
  public readonly exitCode: ExitCode;
  public readonly suggestion?: string;
  public readonly cause?: Error;

  constructor(
    message: string,
    options: {
      exitCode?: ExitCode;
      suggestion?: string;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = "CLIError";
    this.exitCode = options.exitCode ?? ExitCode.InternalError;
    this.suggestion = options.suggestion;
    this.cause = options.cause;

    // Maintains proper stack trace in V8 (Bun/Node)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CLIError);
    }
  }
}

/**
 * Validation error for missing dependencies, invalid config, etc.
 * Exit code: 2
 */
export class ValidationError extends CLIError {
  constructor(message: string, suggestion?: string, cause?: Error) {
    super(message, {
      exitCode: ExitCode.ValidationError,
      suggestion,
      cause,
    });
    this.name = "ValidationError";
  }
}

/**
 * External command error for Docker, Supabase CLI, network failures, etc.
 * Exit code: 3
 */
export class ExternalError extends CLIError {
  public readonly command?: string;
  public readonly stderr?: string;

  constructor(
    message: string,
    options: {
      suggestion?: string;
      cause?: Error;
      command?: string;
      stderr?: string;
    } = {}
  ) {
    super(message, {
      exitCode: ExitCode.ExternalError,
      suggestion: options.suggestion,
      cause: options.cause,
    });
    this.name = "ExternalError";
    this.command = options.command;
    this.stderr = options.stderr;
  }
}

/**
 * User abort error when user cancels an operation
 * Exit code: 1
 */
export class UserAbortError extends CLIError {
  constructor(message = "Operation cancelled by user") {
    super(message, {
      exitCode: ExitCode.UserAbort,
    });
    this.name = "UserAbortError";
  }
}

// ============================================================================
// Recovery Suggestion Mapping
// ============================================================================

/**
 * Common error patterns and their recovery suggestions
 */
const RECOVERY_SUGGESTIONS: Array<{
  pattern: RegExp;
  suggestion: string;
}> = [
  // Docker errors
  {
    pattern: /docker.*not.*running|docker.*daemon|Cannot connect to the Docker/i,
    suggestion: "Start Docker Desktop and try again.",
  },
  {
    pattern: /docker.*not.*installed|command not found.*docker/i,
    suggestion: "Install Docker: https://docs.docker.com/get-docker/",
  },
  {
    pattern: /docker.*permission|docker.*denied/i,
    suggestion:
      "Add your user to the docker group, or use sudo.\nSee: https://docs.docker.com/engine/install/linux-postinstall/",
  },

  // Supabase CLI errors
  {
    pattern: /supabase.*not.*installed|command not found.*supabase/i,
    suggestion: "Install Supabase CLI: npm install -g supabase",
  },
  {
    pattern: /supabase.*failed|supabase.*error/i,
    suggestion: "Try running 'supabase stop' and then 'ui-syncup up' again.",
  },

  // Database errors
  {
    pattern: /database.*timeout|connection.*refused|ECONNREFUSED/i,
    suggestion:
      "Ensure the database is running. Try 'ui-syncup down' then 'ui-syncup up'.",
  },
  {
    pattern: /migration.*failed/i,
    suggestion:
      "Check migration files for errors. Run with --verbose for details.",
  },

  // Network errors
  {
    pattern: /network.*error|ENETUNREACH|ENOTFOUND|getaddrinfo/i,
    suggestion: "Check your internet connection and try again.",
  },
  {
    pattern: /timeout|ETIMEDOUT/i,
    suggestion:
      "The operation timed out. Check your network connection or try again later.",
  },

  // File system errors
  {
    pattern: /EACCES|permission denied/i,
    suggestion:
      "Check file permissions. You may need to run with elevated privileges.",
  },
  {
    pattern: /ENOENT|no such file|file not found/i,
    suggestion: "The requested file or directory does not exist.",
  },
  {
    pattern: /EEXIST|already exists/i,
    suggestion:
      "The file already exists. Rerun the command to be prompted for overwrite with automatic backup.",
  },
  {
    pattern: /ENOSPC|no space left/i,
    suggestion: "Disk is full. Free up some space and try again.",
  },

  // Port errors
  {
    pattern: /port.*in use|EADDRINUSE|address already in use/i,
    suggestion:
      "Required ports are already in use. Stop other services or change port configuration.",
  },

  // Production environment
  {
    pattern: /production.*environment|blocked.*production/i,
    suggestion:
      "This command is not allowed in production. Unset NODE_ENV or use a development environment.",
  },
];

/**
 * Get a recovery suggestion for an error message
 */
export function getRecoverySuggestion(error: Error | string): string | undefined {
  const message = typeof error === "string" ? error : error.message;

  // Check if it's a CLIError with a suggestion
  if (error instanceof CLIError && error.suggestion) {
    return error.suggestion;
  }

  const extraMessages: string[] = [];
  if (error instanceof ExternalError && error.stderr) {
    extraMessages.push(error.stderr);
  }
  if (error instanceof Error && error.cause instanceof Error) {
    extraMessages.push(error.cause.message);
  }

  const combinedMessage = [message, ...extraMessages].join("\n");

  // Check against known patterns
  for (const { pattern, suggestion } of RECOVERY_SUGGESTIONS) {
    if (pattern.test(combinedMessage)) {
      return suggestion;
    }
  }

  return undefined;
}

// ============================================================================
// Error Formatting
// ============================================================================

/**
 * Options for formatting errors
 */
export interface FormatErrorOptions {
  /** Show stack trace */
  verbose?: boolean;
  /** Show recovery suggestion */
  showSuggestion?: boolean;
}

/**
 * Format an error for display to the user
 *
 * Requirements:
 * - 7.1: Human-readable error message
 * - 7.3: No stack traces unless --verbose
 * - 7.4: Capture and display external command errors
 */
export function formatError(
  error: unknown,
  options: FormatErrorOptions = {}
): string {
  const { verbose = false, showSuggestion = true } = options;
  const lines: string[] = [];

  // Extract message
  const message = error instanceof Error ? error.message : String(error);
  lines.push(message);

  // Add external command details if available
  if (error instanceof ExternalError) {
    if (error.command) {
      lines.push(`  Command: ${error.command}`);
    }
    if (error.stderr) {
      const trimmedStderr = error.stderr.trim();
      if (trimmedStderr.length > 0) {
        const stderrLines = trimmedStderr.split("\n");
        const maxLines = verbose ? stderrLines.length : 3;
        const shownLines = stderrLines.slice(0, maxLines);
        lines.push("");
        lines.push("  Error output:");
        shownLines.forEach((line) => {
          lines.push(`    ${line}`);
        });
        if (!verbose && stderrLines.length > maxLines) {
          lines.push("    ... (truncated)");
        }
      }
    }
  }

  // Add cause if present
  if (error instanceof Error && error.cause instanceof Error) {
    lines.push(`  Caused by: ${error.cause.message}`);
  }

  // Add recovery suggestion
  if (showSuggestion) {
    const suggestion = getRecoverySuggestion(error instanceof Error ? error : message);
    if (suggestion) {
      lines.push("");
      lines.push("💡 Suggestion:");
      suggestion.split("\n").forEach((line) => {
        lines.push(`   ${line}`);
      });
    }
  }

  // Add stack trace if verbose
  if (verbose && error instanceof Error && error.stack) {
    lines.push("");
    lines.push("Stack trace:");
    // Skip the first line (error message) from stack
    const stackLines = error.stack.split("\n").slice(1);
    stackLines.forEach((line) => {
      lines.push(`  ${line.trim()}`);
    });
  }

  return lines.join("\n");
}

/**
 * Get the exit code for an error
 */
export function getExitCode(error: unknown): ExitCode {
  if (error instanceof CLIError) {
    return error.exitCode;
  }
  return ExitCode.InternalError;
}

// ============================================================================
// Partial Failure Formatting
// ============================================================================

/**
 * Operation status for partial failure tracking
 */
export interface OperationStatus {
  name: string;
  success: boolean;
  error?: string;
}

/**
 * Format a partial failure report
 *
 * Requirements:
 * - 7.6: Indicate what was completed and what failed
 */
export function formatPartialFailure(operations: OperationStatus[]): string {
  const completed = operations.filter((op) => op.success);
  const failed = operations.filter((op) => !op.success);

  const lines: string[] = [];

  if (completed.length > 0) {
    lines.push("✓ Completed:");
    completed.forEach((op) => {
      lines.push(`  • ${op.name}`);
    });
  }

  if (failed.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("✗ Failed:");
    failed.forEach((op) => {
      lines.push(`  • ${op.name}`);
      if (op.error) {
        lines.push(`    ${op.error}`);
      }
    });
  }

  return lines.join("\n");
}

// ============================================================================
// Levenshtein Distance for "Did you mean?" suggestions
// ============================================================================

/**
 * Calculate Levenshtein distance between two strings
 * Used for suggesting similar commands when an unknown command is entered
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Create a 2D array for memoization
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  // Initialize base cases
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill in the rest
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Find the closest matching command from a list
 * Returns undefined if no close match found (distance > threshold)
 */
export function findClosestCommand(
  input: string,
  commands: string[],
  threshold = 3
): string | undefined {
  let closest: string | undefined;
  let minDistance = Infinity;

  for (const cmd of commands) {
    const distance = levenshteinDistance(input.toLowerCase(), cmd.toLowerCase());
    if (distance < minDistance && distance <= threshold) {
      minDistance = distance;
      closest = cmd;
    }
  }

  return closest;
}
