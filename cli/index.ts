#!/usr/bin/env node
/**
 * UI SyncUp CLI Entry Point
 *
 * Provides lifecycle management commands for self-hosted UI SyncUp instances.
 * Commands: init, up, down, reset, purge
 *
 * @module cli
 * @see {@link file://.ai/specs/cli-phase-1/design.md} for architecture details
 * @see Requirements: 6.4 (unknown commands), 7.1-7.6 (error handling)
 */

import { Command } from "commander";
import {
  VERSION,
  PROGRAM_NAME,
  PROGRAM_DESCRIPTION,
  ExitCode,
  formatError,
  getExitCode,
  findClosestCommand,
  error as logError,
  info,
  newLine,
} from "./lib/index";
import { initCommand, upCommand, downCommand, resetCommand, purgeCommand, updateCommand } from "./commands/index";

// ============================================================================
// Program Setup
// ============================================================================

const program = new Command()
  .name(PROGRAM_NAME)
  .description(PROGRAM_DESCRIPTION)
  .version(VERSION, "-v, --version", "Display the CLI version")
  .option("--verbose", "Enable verbose output for debugging", false)
  .option("--no-color", "Disable colored output (useful for CI environments)");

// ============================================================================
// Command Registration
// ============================================================================

program.addCommand(initCommand);
program.addCommand(upCommand);
program.addCommand(downCommand);
program.addCommand(resetCommand);
program.addCommand(purgeCommand);
program.addCommand(updateCommand);


// ============================================================================
// Unknown Command Handler (Requirement 6.4)
// ============================================================================

program.on("command:*", (operands) => {
  const unknownCommand = operands[0] ?? "unknown";
  const availableCommands = program.commands.map((cmd) => cmd.name()).filter(Boolean);
  
  newLine();
  logError(`Unknown command: '${unknownCommand}'`);
  newLine();
  
  // Check for close match and suggest (Did you mean?)
  const suggestion = findClosestCommand(unknownCommand, availableCommands);
  if (suggestion) {
    info(`💡 Did you mean: ${PROGRAM_NAME} ${suggestion}?`);
    newLine();
  }
  
  // Show available commands
  console.log("Available commands:");
  availableCommands.forEach((cmd) => {
    console.log(`  ${PROGRAM_NAME} ${cmd}`);
  });
  newLine();
  console.log(`Run '${PROGRAM_NAME} --help' for more information.`);
  
  process.exit(ExitCode.ValidationError);
});

// ============================================================================
// Global Error Handler (Requirements 7.1-7.6)
// ============================================================================

/**
 * Handle uncaught exceptions and unhandled rejections
 *
 * Requirements implemented:
 * - 7.1: Human-readable error message
 * - 7.2: Recovery suggestions where applicable
 * - 7.3: No stack traces unless --verbose
 * - 7.4: External command error details captured
 * - 7.5: Verbose logging when --verbose enabled
 */
function handleFatalError(error: unknown): void {
  const isVerbose = process.argv.includes("--verbose");

  newLine();
  logError("An unexpected error occurred:");
  newLine();

  // Format error message with appropriate detail level
  const formattedError = formatError(error, {
    verbose: isVerbose,
    showSuggestion: true,
  });

  // Print each line of the formatted error
  formattedError.split("\n").forEach((line) => {
    console.error(`   ${line}`);
  });

  newLine();
  
  // Determine exit code
  const exitCode = getExitCode(error);
  
  // Only show issue report link for unexpected internal errors
  if (exitCode === ExitCode.InternalError) {
    console.error("If this issue persists, please report it at:");
    console.error("  https://github.com/BYKHD/ui-syncup/issues");
    newLine();
  }

  process.exit(exitCode);
}

process.on("uncaughtException", handleFatalError);
process.on("unhandledRejection", handleFatalError);

// ============================================================================
// Parse Arguments
// ============================================================================

program.parse();
