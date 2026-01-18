#!/usr/bin/env bun
/**
 * UI SyncUp CLI Entry Point
 *
 * Provides lifecycle management commands for self-hosted UI SyncUp instances.
 * Commands: init, up, down, reset, purge
 *
 * @module cli
 * @see {@link file://.ai/specs/cli-phase-1/design.md} for architecture details
 */

import { Command } from "commander";
import {
  VERSION,
  PROGRAM_NAME,
  PROGRAM_DESCRIPTION,
  ExitCode,
} from "./lib/index";
import { initCommand, upCommand } from "./commands/index";

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

// Commands will be registered here as they are implemented:
// program.addCommand(downCommand);
// program.addCommand(resetCommand);
// program.addCommand(purgeCommand);


// ============================================================================
// Unknown Command Handler
// ============================================================================

program.on("command:*", (operands) => {
  const unknownCommand = operands[0] ?? "unknown";
  console.error(`Error: Unknown command '${unknownCommand}'`);
  console.error("");
  program.outputHelp({ error: true });
  process.exit(ExitCode.ValidationError);
});

// ============================================================================
// Global Error Handler
// ============================================================================

function handleFatalError(error: unknown): void {
  const isVerbose = process.argv.includes("--verbose");
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error("");
  console.error("❌ An unexpected error occurred:");
  console.error(`   ${message}`);

  if (isVerbose && stack) {
    console.error("");
    console.error("Stack trace:");
    console.error(stack);
  }

  console.error("");
  console.error("If this issue persists, please report it at:");
  console.error("  https://github.com/BYKHD/ui-syncup/issues");

  process.exit(ExitCode.InternalError);
}

process.on("uncaughtException", handleFatalError);
process.on("unhandledRejection", handleFatalError);

// ============================================================================
// Parse Arguments
// ============================================================================

program.parse();
