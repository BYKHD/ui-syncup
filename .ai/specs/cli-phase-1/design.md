# Design Document: CLI Phase 1 – Self-Hosting Commands

## Overview

The UI SyncUp CLI is a command-line tool built with TypeScript and Bun that provides lifecycle management for self-hosted instances. Phase 1 implements the core commands (`init`, `up`, `down`, `reset`, `purge`) needed to bootstrap and manage a local development environment.

**Design Goals:**
- Zero external dependencies beyond the project's existing stack
- Leverage existing scripts as building blocks (migrate.ts, seed.ts)
- Progressive enhancement: simple by default, powerful when needed
- Safe defaults that prevent data loss

**Key Research Findings:**
- Existing `scripts/migrate.ts` provides robust migration with retry logic and GitHub Actions integration
- Existing `scripts/seed.ts` handles admin user creation with password hashing
- Project uses Supabase CLI for local Postgres, not standalone Docker
- Bun is the runtime; Commander.js recommended for CLI framework

---

## Architecture

```mermaid
flowchart TB
    subgraph CLI["CLI Layer (cli/)"]
        Main[cli/index.ts<br/>Entry Point]
        Commands[cli/commands/]
        Init[init.ts]
        Up[up.ts]
        Down[down.ts]
        Reset[reset.ts]
        Purge[purge.ts]
    end
    
    subgraph Core["Core Services (cli/lib/)"]
        Config[config.ts<br/>Environment Detection]
        Docker[docker.ts<br/>Docker Operations]
        Supabase[supabase.ts<br/>Supabase CLI Wrapper]
        FileSystem[filesystem.ts<br/>File Operations]
        UI[ui.ts<br/>Console Output]
        Prompts[prompts.ts<br/>User Input]
    end
    
    subgraph External["External Tools"]
        DockerEngine[Docker Engine]
        SupabaseCLI[Supabase CLI]
        BunRuntime[Bun Runtime]
    end
    
    Main --> Commands
    Commands --> Init & Up & Down & Reset & Purge
    
    Init --> Config & FileSystem & UI & Prompts
    Up --> Docker & Supabase & UI
    Down --> Docker & Supabase & UI
    Reset --> Docker & FileSystem & UI & Prompts
    Purge --> Docker & FileSystem & UI & Prompts
    
    Docker --> DockerEngine
    Supabase --> SupabaseCLI
    Config --> BunRuntime
```

### Directory Structure

```
cli/
├── index.ts                 # CLI entry point (Commander setup)
├── commands/
│   ├── init.ts              # Project initialization
│   ├── up.ts                # Start local stack
│   ├── down.ts              # Stop local stack
│   ├── reset.ts             # Reset environment
│   ├── purge.ts             # Factory reset
│   └── index.ts             # Command barrel export
├── lib/
│   ├── config.ts            # Environment detection & configuration
│   ├── docker.ts            # Docker operations wrapper
│   ├── supabase.ts          # Supabase CLI wrapper
│   ├── filesystem.ts        # File system operations
│   ├── prompts.ts           # User input handling
│   ├── ui.ts                # Console output formatting
│   ├── network.ts           # Network operations with retry
│   ├── project-config.ts    # Config file management
│   ├── constants.ts         # Shared constants
│   └── index.ts             # Library barrel export
├── templates/
│   ├── env.local.template   # Local environment template
│   ├── env.production.template
│   └── docker-compose.override.template.yml
└── __tests__/
    ├── init.test.ts
    ├── up.test.ts
    ├── config.test.ts
    └── filesystem.test.ts
```

---

## Components and Interfaces

### CLI Entry Point

```typescript
// cli/index.ts
import { Command } from 'commander';
import { initCommand } from './commands/init';
import { upCommand } from './commands/up';
import { downCommand } from './commands/down';
import { resetCommand } from './commands/reset';
import { purgeCommand } from './commands/purge';
import { VERSION } from './lib/constants';

const program = new Command()
  .name('ui-syncup')
  .description('CLI for managing UI SyncUp self-hosted instances')
  .version(VERSION);

program.addCommand(initCommand);
program.addCommand(upCommand);
program.addCommand(downCommand);
program.addCommand(resetCommand);
program.addCommand(purgeCommand);

program.parse();
```

### Core Interfaces

```typescript
// cli/lib/types.ts

/** Result of a CLI operation */
export interface CommandResult {
  success: boolean;
  message?: string;
  error?: Error;
}

/** Setup mode selection */
export type SetupMode = 'local' | 'production';

/** Environment detection result */
export interface EnvironmentCheck {
  bunInstalled: boolean;
  bunVersion?: string;
  dockerInstalled: boolean;
  dockerRunning: boolean;
  dockerVersion?: string;
  supabaseInstalled: boolean;
  supabaseVersion?: string;
  portsAvailable: boolean;
  unavailablePorts?: number[];
}

/** File operation result */
export interface FileOperationResult {
  path: string;
  action: 'created' | 'modified' | 'deleted' | 'skipped' | 'backed_up';
  success: boolean;
  error?: string;
}

/** Service status */
export interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'starting' | 'error';
  url?: string;
  error?: string;
}

/** Global CLI options */
export interface GlobalOptions {
  verbose: boolean;
  noColor: boolean;
  nonInteractive: boolean;
}

/** Project configuration file schema (ui-syncup.config.json) */
export interface ProjectConfig {
  /** Schema version for migration */
  version: string;
  /** Default settings */
  defaults?: {
    mode?: 'local' | 'production';
    ports?: {
      app?: number;
      db?: number;
      studio?: number;
    };
    verbose?: boolean;
  };
}
```

### Config Service

```typescript
// cli/lib/config.ts

export interface Config {
  /** Detected environment (development, production, test) */
  environment: string;
  /** Whether running in CI environment */
  isCI: boolean;
  /** Project root directory */
  projectRoot: string;
  /** Supabase project directory */
  supabaseDir: string;
  /** Storage directories */
  storageDirs: {
    uploads: string;
    avatars: string;
  };
}

export function detectEnvironment(): EnvironmentCheck;
export function getConfig(): Config;
export function isProductionEnvironment(): boolean;
```

### Docker Service

```typescript
// cli/lib/docker.ts

export function isDockerInstalled(): Promise<boolean>;
export function isDockerRunning(): Promise<boolean>;
export function getDockerVersion(): Promise<string | null>;
export function startServices(): Promise<CommandResult>;
export function stopServices(): Promise<CommandResult>;
export function removeContainers(): Promise<CommandResult>;
export function removeVolumes(): Promise<CommandResult>;
export function removeImages(): Promise<CommandResult>;
export function getServiceStatus(): Promise<ServiceStatus[]>;
```

### Supabase Service

```typescript
// cli/lib/supabase.ts

export function isSupabaseInstalled(): Promise<boolean>;
export function getSupabaseVersion(): Promise<string | null>;
export function startSupabase(): Promise<CommandResult>;
export function stopSupabase(): Promise<CommandResult>;
export function getSupabaseStatus(): Promise<ServiceStatus[]>;
export function waitForDatabase(timeoutMs: number): Promise<boolean>;
export function runMigrations(): Promise<CommandResult>;
export function seedAdminUser(): Promise<{ email: string; password: string } | null>;
```

### File System Service

```typescript
// cli/lib/filesystem.ts

export function ensureDirectory(path: string): Promise<FileOperationResult>;
export function fileExists(path: string): boolean;
export function createBackup(path: string): Promise<FileOperationResult>;
export function writeFile(path: string, content: string, options?: { 
  backup?: boolean;
  permissions?: number;
}): Promise<FileOperationResult>;
export function deleteFile(path: string): Promise<FileOperationResult>;
export function deleteDirectory(path: string, recursive?: boolean): Promise<FileOperationResult>;
export function copyTemplate(templateName: string, destPath: string, variables?: Record<string, string>): Promise<FileOperationResult>;
```

### UI Service

```typescript
// cli/lib/ui.ts

export interface Spinner {
  start(message: string): void;
  succeed(message?: string): void;
  fail(message?: string): void;
  stop(): void;
}

export function createSpinner(): Spinner;
export function success(message: string): void;
export function warning(message: string): void;
export function error(message: string): void;
export function info(message: string): void;
export function log(message: string): void;
export function table(data: Record<string, string>[]): void;
export function box(title: string, content: string): void;
```

### Prompts Service

```typescript
// cli/lib/prompts.ts

export function confirm(message: string, defaultValue?: boolean): Promise<boolean>;
export function select<T>(message: string, choices: Array<{ name: string; value: T }>): Promise<T>;
export function input(message: string, defaultValue?: string): Promise<string>;
export function password(message: string): Promise<string>;
export function confirmPhrase(message: string, expectedPhrase: string): Promise<boolean>;
```

### Network Service

```typescript
// cli/lib/network.ts

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 4000,
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T>;

export function isOffline(): Promise<boolean>;
export function checkConnectivity(host?: string): Promise<boolean>;
```

### Project Config Service

```typescript
// cli/lib/project-config.ts

export const CONFIG_FILENAME = 'ui-syncup.config.json';
export const CURRENT_SCHEMA_VERSION = '1.0.0';

export function loadProjectConfig(projectRoot: string): ProjectConfig | null;
export function saveProjectConfig(projectRoot: string, config: ProjectConfig): Promise<FileOperationResult>;
export function createDefaultConfig(): ProjectConfig;
export function migrateConfig(oldConfig: ProjectConfig): ProjectConfig;
export function validateConfig(config: unknown): { valid: boolean; errors?: string[] };
```

## Data Models

### Environment Template Variables

```typescript
// cli/templates/env.local.template
const ENV_LOCAL_TEMPLATE = `
# Database (Supabase Local)
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# Storage (Local filesystem)
STORAGE_PROVIDER="local"
STORAGE_LOCAL_PATH="./storage"

# Auth
AUTH_PROVIDER="local"
BETTER_AUTH_SECRET="{{RANDOM_SECRET}}"
BETTER_AUTH_URL="http://localhost:3000"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
`;
```

### Generated Admin Credentials

```typescript
interface GeneratedCredentials {
  email: string;      // "admin@local"
  password: string;   // Cryptographically secure, 16+ chars
  createdAt: Date;
}
```

---

## Correctness Properties

> A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Prework Analysis

```
1.6 WHEN the System generates environment files THEN the System SHALL NOT overwrite existing environment files without confirmation
  Thoughts: This is about file safety. We can test that for any existing file, the system either prompts for confirmation or preserves the original. This requires testing the interaction between file detection and user prompts.
  Testable: yes - property

1.7 WHEN the User confirms overwriting existing files THEN the System SHALL create a backup of the original files with timestamp suffix
  Thoughts: For any file that gets overwritten, we can verify a backup exists with correct naming format. This is a round-trip style property.
  Testable: yes - property

2.3 WHEN services are starting THEN the System SHALL wait for database readiness with a configurable timeout of 60 seconds
  Thoughts: We can test that the wait function respects timeouts. For any timeout value, the function should return within that time plus small tolerance.
  Testable: yes - property

4.8 THE System SHALL NOT delete environment files during reset
  Thoughts: For any reset operation, we can verify environment files remain unchanged. This is an invariant property.
  Testable: yes - property

4.9 THE System SHALL NOT delete docker-compose.override.yml during reset
  Thoughts: Same as above, verifying configuration preservation during reset.
  Testable: yes - property

5.4 WHEN running in a production environment THEN the System SHALL block the purge operation
  Thoughts: For any production environment configuration, purge should always fail. This is a security property.
  Testable: yes - property

7.1 WHEN an error occurs THEN the System SHALL display a human-readable error message
  Thoughts: For any error thrown, the output should be parseable and not contain raw stack traces (unless verbose). This tests error formatting.
  Testable: yes - property

NF-Security.3 THE System SHALL set appropriate file permissions (600) on generated environment files
  Thoughts: For any generated .env file, we can verify the file permissions are exactly 0o600.
  Testable: yes - property
```

### Property Reflection

After reviewing the testable properties, the following consolidations apply:
- Properties 4.8 and 4.9 can be combined into a single "reset preserves configuration" property
- All file backup properties test the same behavior pattern

### Correctness Properties

**Property 1: File overwrite safety**
*For any* existing environment file and init operation without explicit user confirmation, the original file should remain unchanged and no new file should be created at that path.
**Validates: Requirements 1.6**

**Property 2: Backup creation preserves originals**
*For any* file that is overwritten after user confirmation, a backup file should exist with the original content and a timestamp suffix in the format `filename.backup.TIMESTAMP`.
**Validates: Requirements 1.7**

**Property 3: Database wait respects timeout**
*For any* configured timeout value T, the database wait function should return (success or failure) within T + 2000ms (allowing for execution overhead).
**Validates: Requirements 2.3**

**Property 4: Reset preserves configuration files**
*For any* reset operation on an initialized project, the following files should remain unchanged: `.env.local`, `.env.production`, `docker-compose.override.yml`.
**Validates: Requirements 4.8, 4.9**

**Property 5: Production environment blocks purge**
*For any* environment where `NODE_ENV=production` or `VERCEL_ENV` is set, the purge command should return an error without performing any destructive operations.
**Validates: Requirements 5.4**

**Property 6: Error messages are human-readable**
*For any* error thrown during CLI execution without `--verbose` flag, the output should not contain file paths with line numbers (stack trace signature) and should contain actionable guidance text.
**Validates: Requirements 7.1**

**Property 7: Generated environment files have secure permissions**
*For any* newly created `.env*` file, the file permissions should be exactly `0o600` (read/write for owner only).
**Validates: Non-Functional Security.3**

---

## Error Handling

### Error Categories

| Category | Exit Code | Example |
|----------|-----------|---------|
| Success | 0 | Command completed successfully |
| User Abort | 1 | User cancelled confirmation prompt |
| Validation Error | 2 | Missing required dependency |
| External Error | 3 | Docker not running, network failure |
| Internal Error | 4 | Unexpected exception |

### Error Recovery Patterns

```typescript
// Rollback pattern for init
async function initWithRollback(options: InitOptions): Promise<CommandResult> {
  const createdFiles: string[] = [];
  
  try {
    // Track each created file
    const envResult = await writeFile('.env.local', content);
    if (envResult.success) createdFiles.push(envResult.path);
    
    // ... more operations
    
    return { success: true };
  } catch (error) {
    // Rollback: delete all created files
    for (const file of createdFiles) {
      await deleteFile(file).catch(() => {});
    }
    return { success: false, error };
  }
}
```

---

## Testing Strategy

### Dual Testing Approach

- **Unit tests**: Verify individual service functions with mocked dependencies
- **Property tests**: Verify universal properties across randomized inputs
- **Integration tests**: Verify command flows with real file system (in temp directories)

### Unit Test Coverage

| Component | Test File | Coverage Focus |
|-----------|-----------|----------------|
| config.ts | config.test.ts | Environment detection, CI detection |
| filesystem.ts | filesystem.test.ts | File operations, backup creation |
| docker.ts | docker.test.ts | Command execution, error handling |
| supabase.ts | supabase.test.ts | Service management, timeout handling |
| ui.ts | ui.test.ts | Output formatting, color handling |
| prompts.ts | prompts.test.ts | Input validation, phrase matching |

### Property-Based Test Configuration

- Minimum 100 iterations per property test
- Use `fast-check` library (already installed)
- Tag format: `// Feature: cli-phase-1, Property N: <property_text>`

### Test Commands

```bash
# Run all CLI tests
bun run test cli/

# Run specific test file
bun run test cli/__tests__/init.test.ts

# Run with coverage
bun run test --coverage cli/
```

### Manual Verification

For E2E verification after implementation:

1. **Init command flow**:
   ```bash
   cd /tmp && mkdir test-cli && cd test-cli
   bunx ui-syncup init
   # Select "local" mode, verify .env.local created
   ```

2. **Up/Down cycle**:
   ```bash
   bunx ui-syncup up
   # Verify services accessible at localhost:3000
   bunx ui-syncup down
   # Verify services stopped
   ```

3. **Reset behavior**:
   ```bash
   bunx ui-syncup reset
   # Verify .env.local preserved, data cleared
   ```

4. **Purge protection**:
   ```bash
   NODE_ENV=production bunx ui-syncup purge
   # Verify operation blocked
   ```

---

## Dependencies

### Runtime Dependencies (to add to package.json)

```json
{
  "dependencies": {
    "commander": "^12.0.0"
  }
}
```

Note: We intentionally minimize dependencies. Colored output and spinners will use simple ANSI codes rather than heavy libraries like `chalk` or `ora`, keeping the CLI lightweight.

### Development Dependencies

No additional dev dependencies needed; existing `vitest` and `fast-check` are sufficient.

---

## Security Considerations

1. **Credential Generation**: Use `crypto.randomBytes()` for admin passwords
2. **File Permissions**: Set 600 on all .env files immediately after creation
3. **Production Protection**: Check multiple environment indicators before allowing destructive operations
4. **Credential Display**: Show admin credentials only once; never log to files
5. **Backup Security**: Backup files inherit restrictive permissions

---

## Migration from Existing Scripts

The CLI will wrap existing functionality where appropriate:

| CLI Command | Wraps/Uses |
|-------------|------------|
| `ui-syncup up --migrate` | scripts/migrate.ts |
| `ui-syncup up --seed` | scripts/seed.ts (admin portion) |
| `ui-syncup down` | `supabase stop` + docker-compose |

This ensures consistency with existing CI/CD workflows while providing a unified interface.
