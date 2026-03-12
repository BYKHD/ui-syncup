# UI SyncUp CLI

Command-line tool for managing self-hosted UI SyncUp instances.

## Installation

```bash
git clone https://github.com/BYKHD/ui-syncup.git
cd ui-syncup
bun install
```

Or via the install script:

```bash
curl -fsSL https://raw.githubusercontent.com/BYKHD/ui-syncup/main/install.sh | bash
```

## Usage

```bash
# Canonical invocation (also works with npx, pnpm dlx)
bunx ui-syncup <command>
```

> **For contributors:** `bun ./cli/index.ts <command>` also works during development.

## Available Commands

| Command | Description | Status |
|---------|-------------|--------|
| `init`  | Initialize project with environment files | ✅ Implemented |
| `up`    | Start local development stack (Supabase + MinIO) | ✅ Implemented |
| `down`  | Stop local services | ✅ Implemented |
| `reset` | Reset local data (preserve config) | ✅ Implemented |
| `purge` | Factory reset (remove everything) | ✅ Implemented |

## `init` Command

Initializes a UI SyncUp project with safe defaults.

```bash
bunx ui-syncup init
bunx ui-syncup init --verbose
bunx ui-syncup init --mode production       # Interactive production wizard
bunx ui-syncup init --mode production --skip-dockerfile
```

### What it does

1. Detects system requirements (Bun, Docker, Supabase CLI, ports)
2. Prompts for setup mode (local or production) — or use `--mode` flag
3. **Local mode:** Creates `.env.local` with safe defaults and storage directories
4. **Production mode:** Runs an interactive wizard to configure:
   - Application URL
   - PostgreSQL database connection
   - S3-compatible storage (Cloudflare R2, AWS S3, or MinIO)
   - Email provider (Resend, SMTP, or skip)
   - Generates `Dockerfile` and `.dockerignore` for self-hosted deployment
5. Creates `ui-syncup.config.json`

### Features

- **Backup protection**: Prompts before overwriting existing files
- **Rollback on error**: Cleans up partial changes if something fails
- **Secure permissions**: Sets 0600 on `.env` files
- **CI-friendly**: Non-interactive mode via `CI=1` or `--mode` flag

## `up` Command

Starts the local development stack.

```bash
bunx ui-syncup up
bunx ui-syncup up --verbose
```

### What it does

1. Starts Supabase services (database, auth, realtime)
2. Starts MinIO storage service (when `docker-compose.minio.yml` exists)
3. Waits for health checks (database + storage)
4. Displays service URLs and status

## `down` Command

Stops all local services.

```bash
bunx ui-syncup down
bunx ui-syncup down --verbose
```

Stops Supabase services and MinIO storage.

## `reset` Command

Safely wipes local environment data while preserving configuration.

```bash
bunx ui-syncup reset
```

- Requires manual confirmation
- Stops services, clears storage directories, removes Docker containers
- Preserves `.env` files and configuration

## `purge` Command

Aggressive factory reset for development only.

```bash
bunx ui-syncup purge
```

- Requires typed confirmation phrase
- Blocked in production environments
- Removes everything: database, storage, Docker resources, configuration files

## Global Options

| Option | Description |
|--------|-------------|
| `--version`, `-v` | Display CLI version |
| `--verbose` | Enable debug output |
| `--no-color` | Disable colored output (for CI) |
| `--help`, `-h` | Show help |

## Project Structure

```
cli/
├── index.ts              # Entry point & command registration
├── commands/
│   ├── index.ts           # Command barrel exports
│   ├── init.ts            # Init command (local + production wizard)
│   ├── up.ts              # Up command
│   ├── down.ts            # Down command
│   ├── reset.ts           # Reset command
│   └── purge.ts           # Purge command
├── lib/
│   ├── index.ts           # Library barrel exports
│   ├── constants.ts       # Shared constants
│   ├── types.ts           # Shared types
│   ├── config.ts          # Environment detection
│   ├── docker.ts          # Docker operations
│   ├── supabase.ts        # Supabase CLI wrapper
│   ├── storage.ts         # MinIO storage lifecycle
│   ├── filesystem.ts      # File operations
│   ├── prompts.ts         # User input
│   ├── ui.ts              # Console output
│   ├── errors.ts          # Error handling
│   ├── network.ts         # Network with retry
│   └── project-config.ts  # Project config management
└── templates/
    ├── env.local.template
    ├── env.production.template
    ├── docker-compose.override.template.yml
    ├── Dockerfile.template
    └── dockerignore.template
```

## Development

```bash
# Type check
bun run typecheck

# Run CLI directly (contributors only)
bun ./cli/index.ts --help
```
