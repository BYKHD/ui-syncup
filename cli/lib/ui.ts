/**
 * UI Service for CLI console output
 *
 * Provides formatted output with ANSI colors and a simple spinner.
 * Respects NO_COLOR environment variable and --no-color flag.
 *
 * @module cli/lib/ui
 * @see Requirements: 6.5 (colored output), 6.6 (--no-color flag)
 */

// ============================================================================
// Color Detection
// ============================================================================

/**
 * Check if colors should be disabled
 * Respects NO_COLOR env var (https://no-color.org/) and --no-color flag
 */
function shouldDisableColor(): boolean {
  // Check NO_COLOR environment variable
  if (process.env.NO_COLOR !== undefined) {
    return true;
  }

  // Check --no-color flag in argv
  if (process.argv.includes("--no-color")) {
    return true;
  }

  // Check if stdout is not a TTY (piped output)
  if (!process.stdout.isTTY) {
    return true;
  }

  return false;
}

/** Whether colors are enabled (cached on first access) */
let colorsEnabled: boolean | null = null;

function isColorEnabled(): boolean {
  if (colorsEnabled === null) {
    colorsEnabled = !shouldDisableColor();
  }
  return colorsEnabled;
}

// ============================================================================
// ANSI Color Codes
// ============================================================================

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",

  // Foreground colors
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",

  // Cursor control
  hideCursor: "\x1b[?25l",
  showCursor: "\x1b[?25h",
  clearLine: "\x1b[2K",
  moveToStart: "\r",
} as const;

/**
 * Apply color to text if colors are enabled
 */
function colorize(text: string, color: string): string {
  if (!isColorEnabled()) {
    return text;
  }
  return `${color}${text}${ANSI.reset}`;
}

// ============================================================================
// Output Functions
// ============================================================================

/**
 * Print a success message (green checkmark)
 */
export function success(message: string): void {
  const prefix = colorize("✓", ANSI.green);
  console.log(`${prefix} ${message}`);
}

/**
 * Print a warning message (yellow triangle)
 */
export function warning(message: string): void {
  const prefix = colorize("⚠", ANSI.yellow);
  console.log(`${prefix} ${message}`);
}

/**
 * Print an error message (red cross)
 */
export function error(message: string): void {
  const prefix = colorize("✗", ANSI.red);
  console.error(`${prefix} ${message}`);
}

/**
 * Print an info message (blue circle)
 */
export function info(message: string): void {
  const prefix = colorize("ℹ", ANSI.blue);
  console.log(`${prefix} ${message}`);
}

/**
 * Print a plain log message
 */
export function log(message: string): void {
  console.log(message);
}

/**
 * Print a debug message (only shown with --verbose)
 */
export function debug(message: string): void {
  if (process.argv.includes("--verbose")) {
    const prefix = colorize("DEBUG", ANSI.gray);
    console.log(`${prefix} ${message}`);
  }
}

// ============================================================================
// Table Output
// ============================================================================

/**
 * Print data as a formatted table
 */
export function table(data: Record<string, string>[]): void {
  if (data.length === 0) {
    return;
  }

  // Get all keys and calculate column widths
  const keys = Object.keys(data[0]);
  const widths: Record<string, number> = {};

  for (const key of keys) {
    widths[key] = key.length;
    for (const row of data) {
      const value = row[key] || "";
      widths[key] = Math.max(widths[key], value.length);
    }
  }

  // Print header
  const header = keys.map((k) => k.padEnd(widths[k])).join("  ");
  console.log(colorize(header, ANSI.bold));

  // Print separator
  const separator = keys.map((k) => "─".repeat(widths[k])).join("──");
  console.log(colorize(separator, ANSI.dim));

  // Print rows
  for (const row of data) {
    const line = keys.map((k) => (row[k] || "").padEnd(widths[k])).join("  ");
    console.log(line);
  }
}

// ============================================================================
// Box Output
// ============================================================================

/**
 * Print content in a bordered box
 */
export function box(title: string, content: string): void {
  const lines = content.split("\n");
  const maxWidth = Math.max(
    title.length,
    ...lines.map((l) => l.length),
    40 // Minimum width
  );

  const top = `┌${"─".repeat(maxWidth + 2)}┐`;
  const bottom = `└${"─".repeat(maxWidth + 2)}┘`;
  const titleLine = `│ ${colorize(title.padEnd(maxWidth), ANSI.bold)} │`;

  console.log(colorize(top, ANSI.cyan));
  console.log(colorize(titleLine, ANSI.cyan));
  console.log(colorize(`├${"─".repeat(maxWidth + 2)}┤`, ANSI.cyan));

  for (const line of lines) {
    console.log(`${colorize("│", ANSI.cyan)} ${line.padEnd(maxWidth)} ${colorize("│", ANSI.cyan)}`);
  }

  console.log(colorize(bottom, ANSI.cyan));
}

// ============================================================================
// Spinner
// ============================================================================

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/** Spinner interface for long-running operations */
export interface Spinner {
  /** Start the spinner with a message */
  start(message: string): void;
  /** Stop spinner and show success */
  succeed(message?: string): void;
  /** Stop spinner and show failure */
  fail(message?: string): void;
  /** Stop spinner without status */
  stop(): void;
  /** Update the spinner message */
  update(message: string): void;
}

/**
 * Create an animated spinner for long-running operations
 */
export function createSpinner(): Spinner {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let frameIndex = 0;
  let currentMessage = "";
  let isSpinning = false;

  const render = () => {
    if (!isColorEnabled() || !process.stdout.isTTY) {
      return; // Don't animate in non-TTY
    }

    const frame = colorize(SPINNER_FRAMES[frameIndex], ANSI.cyan);
    process.stdout.write(`${ANSI.clearLine}${ANSI.moveToStart}${frame} ${currentMessage}`);
    frameIndex = (frameIndex + 1) % SPINNER_FRAMES.length;
  };

  const clearLine = () => {
    if (process.stdout.isTTY) {
      process.stdout.write(`${ANSI.clearLine}${ANSI.moveToStart}`);
    }
  };

  return {
    start(message: string) {
      if (isSpinning) {
        this.stop();
      }

      currentMessage = message;
      isSpinning = true;
      frameIndex = 0;

      if (process.stdout.isTTY) {
        process.stdout.write(ANSI.hideCursor);
        render();
        intervalId = setInterval(render, 80);
      } else {
        // In non-TTY, just log the message
        console.log(`... ${message}`);
      }
    },

    succeed(message?: string) {
      this.stop();
      success(message || currentMessage);
    },

    fail(message?: string) {
      this.stop();
      error(message || currentMessage);
    },

    stop() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }

      if (isSpinning) {
        clearLine();
        if (process.stdout.isTTY) {
          process.stdout.write(ANSI.showCursor);
        }
        isSpinning = false;
      }
    },

    update(message: string) {
      currentMessage = message;
      if (!process.stdout.isTTY) {
        console.log(`... ${message}`);
      }
    },
  };
}

// ============================================================================
// New Line and Separator
// ============================================================================

/**
 * Print a blank line
 */
export function newLine(): void {
  console.log();
}

/**
 * Print a horizontal separator line
 */
export function separator(): void {
  const width = process.stdout.columns || 80;
  console.log(colorize("─".repeat(Math.min(width, 80)), ANSI.dim));
}
