# ui-syncup CLI

Self-host [UI SyncUp](https://github.com/BYKHD/ui-syncup) with a single command. No infrastructure knowledge required.

## Requirements

- [Docker](https://docs.docker.com/get-docker/) ≥ 24
- Node.js ≥ 20 (only needed to run the CLI — the app itself runs in Docker)

## Quick Start

```bash
mkdir my-syncup && cd my-syncup
npx ui-syncup init
```

The wizard downloads `compose.yml`, walks you through service configuration, and starts the stack.

## Commands

### Setup & Lifecycle

| Command | Description |
|---|---|
| `init` | Guided first-time setup wizard |
| `start` | Start the stack (reads `COMPOSE_PROFILES` from `.env`) |
| `stop` | Stop gracefully — data is preserved |
| `restart [service]` | Restart all services or a single one |
| `remove` | Remove containers (`--volumes` to also wipe all data) |

### Observability

| Command | Description |
|---|---|
| `status` | Show container states, health, and app URL |
| `logs [service]` | Tail last 200 lines (`-F` to stream live) |
| `doctor` | Validate env vars, health endpoint, and disk space |
| `open` | Open the app in your default browser |

### Maintenance

| Command | Description |
|---|---|
| `upgrade` | Pull latest image and restart (migrations apply automatically) |
| `backup` | Dump PostgreSQL + MinIO to a timestamped `.tar.gz` |
| `restore <archive>` | Restore from a backup archive |

## Usage Examples

```bash
# First-time setup
npx ui-syncup init

# Day-to-day
ui-syncup status
ui-syncup logs -F              # stream all logs
ui-syncup logs app -F          # stream app logs only
ui-syncup restart app          # restart just the app container

# Upgrades
ui-syncup upgrade

# Backup & restore
ui-syncup backup -o ~/backups
ui-syncup restore ~/backups/ui-syncup-backup-2026-03-19T12-00.tar.gz

# Teardown
ui-syncup remove               # keep data volumes
ui-syncup remove --volumes     # wipe everything
```

## Bundled Services (Docker Compose profiles)

`init` lets you choose which services to bundle. Your selection is saved as `COMPOSE_PROFILES` in `.env` so subsequent `start`/`upgrade` commands pick it up automatically.

| Profile | Service | Use when |
|---|---|---|
| `db` | PostgreSQL 15 | No external database |
| `cache` | Redis 7 | No external Redis/Upstash |
| `storage` | MinIO | No external S3/R2/Backblaze |

## Backup Details

`backup` only exports data for active profiles:

- **PostgreSQL** (`db` profile) — `pg_dumpall` → `postgres.sql`
- **MinIO** (`storage` profile) — volume tar → `minio_data.tar.gz`
- Redis is intentionally excluded (cache — not persistent state)

Output is a single `.tar.gz` archive you can store offsite.

## License

MIT
