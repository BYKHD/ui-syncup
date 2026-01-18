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
| `up`    | Start local development stack | 🚧 Planned |
| `down`  | Stop local services | 🚧 Planned |
| `reset` | Reset local data (preserve config) | 🚧 Planned |
| `purge` | Factory reset (remove everything) | 🚧 Planned |

## `init` Command

Initializes a UI SyncUp project with safe defaults.

```bash
bun ./cli/index.ts init
bun ./cli/index.ts init --verbose
```

### What it does

1. Detects system requirements (Bun, Docker, Supabase CLI, ports)
2. Prompts for setup mode (local or production)
3. Creates `.env.local` or `.env.production` with safe defaults
4. Creates storage directories (`storage/uploads`, `storage/avatars`)
5. Generates `docker-compose.override.yml`
6. Creates `ui-syncup.config.json`

### Features

- **Backup protection**: Prompts before overwriting existing files
- **Rollback on error**: Cleans up partial changes if something fails
- **Secure permissions**: Sets 0600 on `.env` files
- **CI-friendly**: Non-interactive mode via `CI=1` environment variable

### Example Output

```
🚀 UI SyncUp Project Initialization

System Requirements:
✓ Bun 1.3.1
✓ Docker 29.1.3 (running)
✓ Supabase CLI 2.67.1
✓ Required ports available

Select setup mode:
  1) Local Development (Supabase CLI + Docker)
  2) Production (External services)
```

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
├── index.ts          # Entry point
├── commands/
│   └── init.ts       # Init command
├── lib/
│   ├── config.ts     # Environment detection
│   ├── docker.ts     # Docker operations
│   ├── supabase.ts   # Supabase CLI wrapper
│   ├── filesystem.ts # File operations
│   ├── prompts.ts    # User input
│   ├── ui.ts         # Console output
│   └── network.ts    # Network with retry
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

