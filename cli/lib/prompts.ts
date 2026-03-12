/**
 * Prompts Service for CLI user input
 *
 * Provides user input functions using Node.js readline.
 * Handles non-interactive mode for CI environments.
 *
 * @module cli/lib/prompts
 * @see Requirements: 6.7 (stdin input), 6.10 (CI mode), 5.2/5.3 (confirmations)
 */

import * as readline from "readline";
import { error, info } from "./ui";

// ============================================================================
// Utilities
// ============================================================================

/**
 * Check if running in non-interactive mode (CI environment)
 */
export function isNonInteractive(): boolean {
  const inCI = process.env.CI === "true" || process.env.CI === "1";
  const hasTTYInput = process.stdin.isTTY === true;
  const hasTTYOutput = process.stdout.isTTY === true;

  return inCI || !hasTTYInput || !hasTTYOutput;
}

/**
 * Create a readline interface for input
 */
function createReadline(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompt for input with a question
 */
async function question(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

// ============================================================================
// Confirm
// ============================================================================

/**
 * Ask for yes/no confirmation
 *
 * @param message - Question to ask
 * @param defaultValue - Default value if user presses Enter (default: false)
 * @returns true if user confirms, false otherwise
 */
export async function confirm(
  message: string,
  defaultValue: boolean = false
): Promise<boolean> {
  if (isNonInteractive()) {
    info(`[Non-interactive] Using default: ${defaultValue ? "yes" : "no"}`);
    return defaultValue;
  }

  const hint = defaultValue ? "[Y/n]" : "[y/N]";
  const rl = createReadline();

  try {
    const answer = await question(rl, `${message} ${hint} `);
    const normalized = answer.trim().toLowerCase();

    if (normalized === "") {
      return defaultValue;
    }

    return normalized === "y" || normalized === "yes";
  } finally {
    rl.close();
  }
}

// ============================================================================
// Select
// ============================================================================

/** Option for select prompt */
export interface SelectOption<T> {
  name: string;
  value: T;
}

/**
 * Ask user to select from a list of options using arrow keys
 *
 * @param message - Question to ask
 * @param choices - Array of options with name and value
 * @returns The selected value
 */
export async function select<T>(
  message: string,
  choices: SelectOption<T>[]
): Promise<T> {
  if (choices.length === 0) {
    throw new Error("No choices provided for select prompt");
  }

  if (isNonInteractive()) {
    info(`[Non-interactive] Using first option: ${choices[0].name}`);
    return choices[0].value;
  }

  // Use @inquirer/prompts for arrow key navigation
  const { select: inquirerSelect } = await import("@inquirer/prompts");

  const result = await inquirerSelect({
    message,
    choices: choices.map((choice) => ({
      name: choice.name,
      value: choice.value,
    })),
  });

  return result as T;
}

// ============================================================================
// Input
// ============================================================================

/** Options for text input prompt */
export interface InputOptions {
  /** Validation function — return true to accept, or an error string to reject */
  validate?: (value: string) => string | true;
}

/**
 * Ask for text input
 *
 * @param message - Prompt message
 * @param defaultValue - Default value if user presses Enter
 * @param options - Additional options (e.g. validate)
 * @returns User's input string
 */
export async function input(
  message: string,
  defaultValue?: string,
  options?: InputOptions
): Promise<string> {
  if (isNonInteractive()) {
    if (defaultValue !== undefined) {
      info(`[Non-interactive] Using default: ${defaultValue}`);
      return defaultValue;
    }
    throw new Error("No default value provided for non-interactive mode");
  }

  const rl = createReadline();

  try {
    const hint = defaultValue ? ` (${defaultValue})` : "";

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const answer = await question(rl, `${message}${hint}: `);
      const value = answer.trim() === "" && defaultValue !== undefined
        ? defaultValue
        : answer.trim();

      if (options?.validate) {
        const result = options.validate(value);
        if (result !== true) {
          error(result);
          continue;
        }
      }

      return value;
    }
  } finally {
    rl.close();
  }
}

// ============================================================================
// Password
// ============================================================================

/**
 * Ask for password input (hidden characters)
 *
 * @param message - Prompt message
 * @returns User's password string
 */
export async function password(message: string): Promise<string> {
  if (isNonInteractive()) {
    throw new Error("Password input not available in non-interactive mode");
  }

  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Write prompt
    process.stdout.write(`${message}: `);

    // Enable raw mode to capture characters without echo
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    let password = "";

    const onData = (char: Buffer) => {
      const c = char.toString("utf-8");

      switch (c) {
        case "\n":
        case "\r":
        case "\u0004": // Ctrl+D
          // Enter pressed - done
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
          }
          process.stdin.removeListener("data", onData);
          process.stdout.write("\n");
          rl.close();
          resolve(password);
          break;

        case "\u0003": // Ctrl+C
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
          }
          process.stdin.removeListener("data", onData);
          process.stdout.write("\n");
          rl.close();
          reject(new Error("User cancelled"));
          break;

        case "\u007F": // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write("\b \b"); // Erase character
          }
          break;

        default:
          password += c;
          process.stdout.write("*"); // Show asterisk
      }
    };

    process.stdin.on("data", onData);
    process.stdin.resume();
  });
}

// ============================================================================
// Confirm Phrase
// ============================================================================

/**
 * Require user to type an exact phrase for confirmation
 *
 * @param message - Prompt message explaining what to type
 * @param expectedPhrase - The exact phrase user must type
 * @returns true if phrase matches, false otherwise
 */
export async function confirmPhrase(
  message: string,
  expectedPhrase: string
): Promise<boolean> {
  if (isNonInteractive()) {
    error("Phrase confirmation not available in non-interactive mode");
    return false;
  }

  const rl = createReadline();

  try {
    console.log(message);
    console.log();

    const answer = await question(rl, `Type "${expectedPhrase}" to confirm: `);

    return answer.trim() === expectedPhrase;
  } finally {
    rl.close();
  }
}
