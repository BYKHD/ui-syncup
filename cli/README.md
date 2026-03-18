# ui-syncup

CLI for managing self-hosted [UI SyncUp](https://github.com/BYKHD/ui-syncup) instances.

UI SyncUp is a visual feedback and issue tracking platform for design-to-development collaboration — pin annotations on mockups, create issues from visual feedback, and track them through a structured workflow.

## Requirements

- **Node.js** ≥ 20
- **Docker** — required by `ui-syncup up` (Supabase runs inside Docker)
- **Bun** — required to run the full application after `init`
- **Supabase CLI** — installed automatically if missing, or install manually: `brew install supabase/tap/supabase`

## Installation

```bash
npm install -g ui-syncup
# or
bun add -g ui-syncup
```

## Quick Start

```bash
# 1. Clone the repository into a new folder
ui-syncup init

# 2. Start all services (Supabase, migrations, admin user)
ui-syncup up

# 3. Start the development server (from inside the project folder)
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Commands

| Command | Description |
|---------|-------------|
| `ui-syncup init` | Initialize a new project — creates `.env` files, storage dirs, and config |
| `ui-syncup up` | Start all services: Supabase, run migrations, create admin user |
| `ui-syncup down` | Stop all services |
| `ui-syncup reset` | Reset data to a clean state (preserves config files) |
| `ui-syncup purge` | Full cleanup — removes all data, volumes, and config |

## Global Options

| Flag | Description |
|------|-------------|
| `-v, --version` | Display CLI version |
| `--verbose` | Enable verbose output for debugging |
| `--no-color` | Disable colored output (useful in CI environments) |

## Init Modes

`ui-syncup init` supports two setup modes:

- **Local** — sets up a local development environment with MinIO (S3-compatible storage)
- **Production** — configures production with Cloudflare R2/AWS S3 and transactional email (Resend or SMTP)

## Examples

```bash
# Initialize in local mode without prompts
ui-syncup init --mode local

# Start with verbose output for debugging
ui-syncup up --verbose

# Skip migrations on startup (if already up to date)
ui-syncup up --skip-migrations

# Full reset (requires typing the confirmation phrase)
ui-syncup purge
```

## Repository

Source code, issue tracker, and full documentation:
[github.com/BYKHD/ui-syncup](https://github.com/BYKHD/ui-syncup)

## License

MIT
