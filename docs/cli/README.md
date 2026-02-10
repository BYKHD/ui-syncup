# UI SyncUp CLI

Command-line tool for managing self-hosted UI SyncUp instances.

## Installation

```bash
git clone https://github.com/your-org/ui-syncup.git
cd ui-syncup
bun install
```

## Usage

```bash
# From project root
bunx ui-syncup <command>

# Or run directly
bun ./cli/index.ts <command>
```

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
bun ./cli/index.ts init
bun ./cli/index.ts init --verbose
bun ./cli/index.ts init --mode production   # Non-interactive production setup
```

### What it does

1. Detects system requirements (Bun, Docker, Supabase CLI, ports)
2. Prompts for setup mode (local or production) — or use `--mode` flag
3. Creates `.env.local` or `.env.production` with safe defaults
4. Creates storage directories (`storage/uploads`, `storage/avatars`)
5. Generates `docker-compose.override.yml`
6. Creates `ui-syncup.config.json` (tracks `version` and `defaults.mode` only in V1)

### Features

- **Backup protection**: Prompts before overwriting existing files
- **Rollback on error**: Cleans up partial changes if something fails
- **Secure permissions**: Sets 0600 on `.env` files
- **CI-friendly**: Non-interactive mode via `CI=1` or `--mode` flag

## `up` Command

Starts the local development stack.

```bash
bun ./cli/index.ts up
bun ./cli/index.ts up --verbose
```

### What it does

1. Starts Supabase services (database, auth, realtime)
2. Starts MinIO storage service (when `docker-compose.minio.yml` exists)
3. Waits for health checks (database + storage)
4. Displays service URLs and status

## `down` Command

Stops all local services.

```bash
bun ./cli/index.ts down
bun ./cli/index.ts down --verbose
```

Stops Supabase services and MinIO storage.

## `reset` Command

Safely wipes local environment data while preserving configuration.

```bash
bun ./cli/index.ts reset
```

- Requires manual confirmation
- Stops services, clears storage directories, removes Docker containers
- Preserves `.env` files and configuration

## `purge` Command

Aggressive factory reset for development only.

```bash
bun ./cli/index.ts purge
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
│   ├── init.ts            # Init command
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
    └── docker-compose.override.template.yml
```

## Development

```bash
# Type check
bun run typecheck

# Run CLI directly
bun ./cli/index.ts --help
```
