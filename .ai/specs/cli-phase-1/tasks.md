# Implementation Plan: CLI Phase 1 – Self-Hosting Commands

## Overview

This implementation plan converts the CLI Phase 1 design into discrete, incremental tasks for a code-generation LLM. Each task builds on previous tasks and ends with integration. Focus is on core commands first (`init`, `up`, `down`, `reset`, `purge`) with test tasks marked optional.

---

## Tasks

- [x] 1. Set up CLI project structure and core infrastructure
  - [x] 1.1 Add Commander.js dependency to package.json
    - Add `"commander": "^12.0.0"` to dependencies
    - Run `bun install`
    - _Requirements: 6.1, 6.2, 6.3_
    - _Location: `package.json`_

  - [x] 1.2 Create CLI directory structure and entry point
    - Create `cli/` directory with `commands/`, `lib/`, `templates/` subdirectories
    - Create `cli/index.ts` with Commander program setup
    - Add `"bin": { "ui-syncup": "./cli/index.ts" }` to package.json
    - _Requirements: 6.1, 6.2, 6.3_
    - _Location: `cli/index.ts`, `package.json`_

  - [x] 1.3 Create shared types and constants
    - Create `cli/lib/types.ts` with CommandResult, EnvironmentCheck, FileOperationResult, ServiceStatus, GlobalOptions interfaces
    - Create `cli/lib/constants.ts` with VERSION, STORAGE_DIRS, ENV_FILES constants
    - Create `cli/lib/index.ts` barrel export
    - _Requirements: 6.1_
    - _Location: `cli/lib/types.ts`, `cli/lib/constants.ts`_

---

- [x] 2. Implement core library services
  - [x] 2.1 Implement UI service for console output
    - Create `cli/lib/ui.ts` with success, warning, error, info, log functions
    - Implement ANSI color codes directly (no chalk dependency)
    - Support `--no-color` flag via environment check
    - Implement simple spinner using ANSI codes
    - _Requirements: 6.5, 6.6_
    - _Location: `cli/lib/ui.ts`_

  - [x] 2.2 Implement prompts service for user input
    - Create `cli/lib/prompts.ts` with confirm, select, input, password, confirmPhrase functions
    - Use Node.js readline for input (no external prompts library)
    - Handle non-interactive mode (CI environment)
    - _Requirements: 6.7, 6.10, 5.2, 5.3_
    - _Location: `cli/lib/prompts.ts`_

  - [x] 2.3 Implement config service for environment detection
    - Create `cli/lib/config.ts` with detectEnvironment, getConfig, isProductionEnvironment
    - Check for Bun, Docker, Supabase CLI availability
    - Check port availability (3000, 54321, 54322, 54323)
    - Detect CI environment via `CI` environment variable
    - _Requirements: 1.1, 1.2, 5.4, 6.10_
    - _Location: `cli/lib/config.ts`_

  - [ ]* 2.4 Write property test for production environment detection
    - **Property 5: Production environment blocks purge**
    - **Validates: Requirements 5.4**
    - _Location: `cli/__tests__/config.property.test.ts`_

  - [x] 2.5 Implement network service with retry logic
    - Create `cli/lib/network.ts` with withRetry, isOffline, checkConnectivity
    - Implement exponential backoff (1s, 2s, 4s) for up to 3 attempts
    - Detect offline state and use cached resources when available
    - _Requirements: 7.7, 7.8, 7.9_
    - _Location: `cli/lib/network.ts`_

  - [x] 2.6 Implement project config service
    - Create `cli/lib/project-config.ts` with loadProjectConfig, saveProjectConfig
    - Implement createDefaultConfig with schema version
    - Add config validation with Zod schema
    - Implement config migration for older schema versions
    - _Requirements: 8.4, 8.5, 8.6, 9.1, 9.2, 9.6_
    - _Location: `cli/lib/project-config.ts`_

  - [ ]* 2.7 Write property test for network retry behavior
    - **Property 8: Network operations retry with exponential backoff**
    - **Validates: Requirements 7.7**
    - _Location: `cli/__tests__/network.property.test.ts`_

- [x] 3. Implement file system service
  - [x] 3.1 Create filesystem service with core operations
    - Create `cli/lib/filesystem.ts` with fileExists, ensureDirectory, writeFile, deleteFile, deleteDirectory
    - Implement createBackup with timestamp suffix format
    - Set file permissions to 0o600 for .env files
    - _Requirements: 1.6, 1.7, 1.8, NF-Security.3_
    - _Location: `cli/lib/filesystem.ts`_

  - [x] 3.2 Implement template copying with variable interpolation
    - Add copyTemplate function that reads from `cli/templates/`
    - Support `{{VARIABLE}}` placeholder replacement
    - Generate secure random secrets using crypto.randomBytes
    - _Requirements: 1.4, 1.5_
    - _Location: `cli/lib/filesystem.ts`_

  - [ ]* 3.3 Write property tests for filesystem service
    - **Property 1: File overwrite safety**
    - **Property 2: Backup creation preserves originals**
    - **Property 7: Generated environment files have secure permissions**
    - **Validates: Requirements 1.6, 1.7, NF-Security.3**
    - _Location: `cli/__tests__/filesystem.property.test.ts`_

---

- [x] 4. Implement Docker and Supabase services
  - [x] 4.1 Create Docker service wrapper
    - Create `cli/lib/docker.ts` with isDockerInstalled, isDockerRunning, getDockerVersion
    - Implement startServices, stopServices using child_process.spawn
    - Implement removeContainers, removeVolumes, removeImages
    - Capture and format stdout/stderr appropriately
    - _Requirements: 2.1, 2.2, 3.1, 4.3, 4.6, 5.5, 5.6, 5.7_
    - _Location: `cli/lib/docker.ts`_

  - [x] 4.2 Create Supabase CLI service wrapper
    - Create `cli/lib/supabase.ts` with isSupabaseInstalled, startSupabase, stopSupabase
    - Implement waitForDatabase with configurable timeout and polling
    - Wrap existing migrate.ts functionality via runMigrations
    - Extract admin seeding logic from seed.ts into seedAdminUser
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.8, 2.9_
    - _Location: `cli/lib/supabase.ts`_

  - [ ]* 4.3 Write property test for database wait timeout
    - **Property 3: Database wait respects timeout**
    - **Validates: Requirements 2.3**
    - _Location: `cli/__tests__/supabase.property.test.ts`_

---

- [x] 5. Implement `init` command
  - [x] 5.1 Create environment file templates
    - Create `cli/templates/env.local.template` with local Supabase defaults
    - Create `cli/templates/env.production.template` with placeholders
    - Create `cli/templates/docker-compose.override.template.yml`
    - _Requirements: 1.4, 1.5_
    - _Location: `cli/templates/`_

  - [x] 5.2 Implement init command logic
    - Create `cli/commands/init.ts` with initCommand
    - Run environment detection and display results
    - Prompt for setup mode (local/production)
    - Generate environment files with backup if existing
    - Create storage directories
    - Generate `ui-syncup.config.json` with default settings
    - Display summary and next steps
    - Implement rollback on partial failure
    - _Requirements: 1.1-1.11, 9.5_
    - _Location: `cli/commands/init.ts`_

  - [x] 5.3 Create config file template
    - Create `cli/templates/config.template.json` with schema version and defaults
    - _Requirements: 8.4, 9.1, 9.2, 9.3_
    - _Location: `cli/templates/config.template.json`_

  - [x] 5.4 Wire init command to CLI entry point
    - Import and register initCommand in `cli/index.ts`
    - Add --verbose and --no-color global options
    - _Requirements: 6.1, 6.9_
    - _Location: `cli/index.ts`_

---


- [x] 6. Checkpoint - Verify init command works
  - Run `bun run typecheck` and ensure no type errors
  - Run `bunx ./cli/index.ts init --help` and verify help output
  - Test in temp directory: `cd /tmp && mkdir test-init && cd test-init && bunx /path/to/cli init`
  - Verify .env.local and storage directories created

---

- [x] 7. Implement `up` command
  - [x] 7.1 Implement up command logic
    - Create `cli/commands/up.ts` with upCommand
    - Check Docker is running, display error if not
    - Start Supabase with progress indicators
    - Wait for database with spinner
    - Run migrations automatically
    - Seed admin if no admin exists, display credentials
    - Display service URLs on success
    - _Requirements: 2.1-2.11_
    - _Location: `cli/commands/up.ts`_

  - [x] 7.2 Wire up command to CLI entry point
    - Import and register upCommand in `cli/index.ts`
    - _Requirements: 6.1_
    - _Location: `cli/index.ts`_

---

- [x] 8. Implement `down` command
  - [x] 8.1 Implement down command logic
    - Create `cli/commands/down.ts` with downCommand
    - Stop Supabase services
    - Stop Docker containers (preserve volumes)
    - Display confirmation message
    - Handle case when no services running
    - _Requirements: 3.1-3.5_
    - _Location: `cli/commands/down.ts`_

  - [x] 8.2 Wire down command to CLI entry point
    - Import and register downCommand in `cli/index.ts`
    - _Requirements: 6.1_
    - _Location: `cli/index.ts`_

---

- [x] 9. Implement `reset` command
  - [x] 9.1 Implement reset command logic
    - Create `cli/commands/reset.ts` with resetCommand
    - Prompt for confirmation (no --force flag)
    - Stop all services
    - Delete database data
    - Delete storage directory contents (not the directories themselves)
    - Remove Docker containers (keep volumes)
    - Preserve .env files and docker-compose.override.yml
    - Display completion message with next steps
    - _Requirements: 4.1-4.11_
    - _Location: `cli/commands/reset.ts`_

  - [x] 9.2 Wire reset command to CLI entry point
    - Import and register resetCommand in `cli/index.ts`
    - _Requirements: 6.1_
    - _Location: `cli/index.ts`_

  - [ ]* 9.3 Write property test for reset preserving config
    - **Property 4: Reset preserves configuration files**
    - **Validates: Requirements 4.8, 4.9**
    - _Location: `cli/__tests__/reset.property.test.ts`_

---

- [ ] 10. Implement `purge` command
  - [ ] 10.1 Implement purge command logic
    - Create `cli/commands/purge.ts` with purgeCommand
    - Block if production environment detected
    - Display warning about irreversibility
    - Require typed confirmation phrase "purge ui-syncup"
    - Stop all Docker containers
    - Remove Docker volumes
    - Remove Docker images
    - Delete storage directories
    - Delete environment files
    - Delete docker-compose.override.yml
    - Display completion message
    - Continue on errors, report all at end
    - _Requirements: 5.1-5.12_
    - _Location: `cli/commands/purge.ts`_

  - [ ] 10.2 Wire purge command to CLI entry point
    - Import and register purgeCommand in `cli/index.ts`
    - _Requirements: 6.1_
    - _Location: `cli/index.ts`_

---

- [ ] 11. Implement error handling and help
  - [ ] 11.1 Add global error handler
    - Wrap command execution in try/catch
    - Format errors without stack traces (unless --verbose)
    - Display recovery suggestions where applicable
    - Exit with appropriate status codes
    - _Requirements: 7.1-7.6_
    - _Location: `cli/index.ts`, `cli/lib/errors.ts`_

  - [ ] 11.2 Implement unknown command handler
    - Display error for unknown commands
    - Show list of available commands
    - _Requirements: 6.4_
    - _Location: `cli/index.ts`_

  - [ ]* 11.3 Write property test for error message formatting
    - **Property 6: Error messages are human-readable**
    - **Validates: Requirements 7.1**
    - _Location: `cli/__tests__/errors.property.test.ts`_

---

- [ ] 12. Checkpoint - Full CLI verification
  - Run `bun run typecheck` to verify all types
  - Run `bun run lint` to verify code style
  - Test full lifecycle in tmp directory:
    ```bash
    cd /tmp && rm -rf test-cli && mkdir test-cli && cd test-cli
    bunx /path/to/cli init          # Select local
    bunx /path/to/cli up            # Verify services start
    bunx /path/to/cli down          # Verify clean stop
    bunx /path/to/cli reset         # Confirm, verify config preserved
    bunx /path/to/cli up            # Verify starts fresh
    bunx /path/to/cli purge         # Type confirmation
    ```

---

- [ ] 13. Add CLI script to package.json
  - [ ] 13.1 Add npm scripts for CLI
    - Add `"cli": "bun run cli/index.ts"` script
    - Add `"cli:init": "bun run cli/index.ts init"` convenience script
    - Update README with CLI usage instructions
    - _Requirements: 6.1_
    - _Location: `package.json`, `README.md`_

---

## Verification Plan

### Automated Tests

```bash
# Run all CLI unit tests
bun run test cli/__tests__/

# Run property-based tests specifically
bun run test cli/__tests__/*.property.test.ts

# Run with coverage
bun run test --coverage cli/__tests__/
```

### Manual Verification

1. **Init Command**:
   - Create temp directory and run `bunx ui-syncup init`
   - Verify .env.local created with valid content
   - Verify storage directories exist
   - Re-run init and verify backup created when overwriting

2. **Up/Down Cycle**:
   - Run `bunx ui-syncup up`
   - Wait for completion, verify localhost:3000 accessible
   - Note admin credentials displayed
   - Run `bunx ui-syncup down`
   - Verify services stopped

3. **Reset Behavior**:
   - Run `bunx ui-syncup reset`
   - Confirm when prompted
   - Verify .env.local still exists
   - Run `bunx ui-syncup up` to verify fresh start

4. **Purge Protection**:
   - Set `NODE_ENV=production`
   - Run `bunx ui-syncup purge`
   - Verify blocked with error message
   - Unset NODE_ENV, run purge with correct confirmation phrase
   - Verify all files removed

---

## Notes

- Tasks marked with `*` are optional test tasks that can be deferred for faster MVP
- Property tests require `fast-check` which is already installed
- Existing `scripts/migrate.ts` and `scripts/seed.ts` will be wrapped, not replaced
- All commands support `--verbose` for debug output and `--no-color` for CI
