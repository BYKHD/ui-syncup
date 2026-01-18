# UI SyncUp CLI – Self‑Hosting & Operations Guide

This document describes the **UI SyncUp CLI** designed to support self‑hosting, local development, and production operations while keeping configuration simple and safe.

---

## Goals of the CLI

- Make self‑hosting easy and predictable
- Reduce setup errors and GitHub support issues
- Support CI/CD and infrastructure automation
- Avoid replacing the Web Admin UI

**Principle:**  
> CLI handles lifecycle & infrastructure.  
> Web UI handles configuration & integrations.

---

## Installation

```bash
git clone https://github.com/your-org/ui-syncup.git
cd ui-syncup
bun install
```

Run via Bunx:

```bash
bunx ui-syncup <command>
```

---

## Command Overview


| Command | Purpose | Implementation Phase |
|------|--------|--------------------------------|
| `ui-syncup init` | Bootstrap local or production setup | Phase 1 |
| `ui-syncup up` | Start local stack | Phase 1 |
| `ui-syncup down` | Stop local stack | Phase 1 |
| `ui-syncup doctor` | Environment & health checks | Phase 2 |
| `ui-syncup migrate` | Run database migrations | Phase 2 |
| `ui-syncup reset` | Wipe local data safely | Phase 1 |
| `ui-syncup purge` | Factory reset for development | Phase 1 |
| `ui-syncup version` | Display CLI and app version info | TBD |
| `ui-syncup logs` | Tail application and service logs | TBD |
| `ui-syncup backup` | Create full database & storage backup | TBD |
| `ui-syncup restore` | Restore from backup archive | TBD |
| `ui-syncup secrets` | Manage external credentials (optional) | TBD |
| `ui-syncup export` | Export configuration for backup | TBD |

---

## `ui-syncup init`

### Purpose
Initializes the project for self‑hosting with **safe defaults**.

### Usage
```bash
ui-syncup init
```

### Flow
- Detects system requirements (Node, Docker, ports)
- Prompts for setup mode:
  - Local (recommended)
  - Production / External services
- Generates required files and folders

### Files Created
```
.env.local
docker-compose.override.yml
/storage/uploads
/storage/avatars
```

### Example Default Config
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/uisyncup
STORAGE_PROVIDER=local
AUTH_PROVIDER=local
```

No external credentials required at this stage.

---

## `ui-syncup up`

### Purpose
Starts the local development stack.

### Usage
```bash
ui-syncup up
```

### What it does
- Starts Docker services
- Waits for database readiness
- Runs migrations
- Seeds admin user if missing

### Output
```text
Admin account:
Email: admin@local
Password: <generated-secure-password>
```

---

## `ui-syncup down`

### Purpose
Stops all local services.

```bash
ui-syncup down
```

Equivalent to `docker compose down`.

---

## `ui-syncup doctor`

### Purpose
Diagnose environment and configuration issues.

### Usage
```bash
ui-syncup doctor
```

### Checks
- Node & Docker availability
- Database connectivity
- **Schema version validation**
- Storage provider access
- File system permissions
- Optional services (SMTP, OAuth)

### Example Output
```text
✔ Database reachable
✔ Schema up-to-date (v15)
✔ Storage writable
⚠ Email not configured (optional)
```

### Schema Outdated Warning
```text
✔ Database reachable
⚠ Schema outdated (v12 → v15 required)
  Run: ui-syncup migrate
```

---

## `ui-syncup migrate`

### Purpose
Run database migrations manually. **Required after updating** when schema changes.

### Usage
```bash
ui-syncup migrate
ui-syncup migrate --status
ui-syncup migrate --dry-run
```

### Flags
| Flag | Description |
|------|-------------|
| `--status` | Show current vs required schema version |
| `--dry-run` | Preview migrations without applying |
| `--rollback` | Rollback last migration (use with caution) |

### Status Output
```text
Current schema: v12
Required schema: v15
Pending migrations:
  - 20260115_add_audit_logs
  - 20260117_update_team_roles  
  - 20260118_add_workspace_settings
```

### Migration Output
```text
✔ Migration 20260115_add_audit_logs applied
✔ Migration 20260117_update_team_roles applied
✔ Migration 20260118_add_workspace_settings applied
✔ Schema updated to v15
```

### Used in
- CI pipelines
- Production deployments
- After `git pull` when updating
- Recovery scenarios

### Schema Validation at Startup
The application validates schema version on startup:
```text
❌ Database schema is outdated (v12 → v15 required)
   Run: ui-syncup migrate
   Process exited with code 1
```

---

## `ui-syncup version`

### Purpose
Display CLI version, app version, and runtime information.

### Usage
```bash
ui-syncup version
```

### Output
```text
UI SyncUp CLI: 1.2.0
App Version:   2.1.0
Node.js:       20.10.0
Docker:        24.0.7
Database:      PostgreSQL 15.4
```

### Flags
| Flag | Description |
|------|-------------|
| `--json` | Output as JSON for scripting |
| `--check` | Check for available updates |

---

## `ui-syncup logs`

### Purpose
Tail application and service logs for debugging.

### Usage
```bash
ui-syncup logs
ui-syncup logs --service db
ui-syncup logs --follow
```

### Flags
| Flag | Description |
|------|-------------|
| `--service <name>` | Filter by service (`app`, `db`, `worker`) |
| `--follow`, `-f` | Stream logs in real-time |
| `--lines <n>` | Number of lines to show (default: 100) |
| `--since <duration>` | Show logs since duration (e.g., `1h`, `30m`) |

### Example Output
```text
[app] 2026-01-18 14:32:01 INFO  Server started on port 3000
[db]  2026-01-18 14:32:00 LOG   database system is ready
```

---

## `ui-syncup backup`

### Purpose
Create a full backup of database and uploaded files.

### Usage
```bash
ui-syncup backup
ui-syncup backup --output ./backups/
```

### Flags
| Flag | Description |
|------|-------------|
| `--output <path>` | Backup destination directory |
| `--db-only` | Backup database only (skip files) |
| `--files-only` | Backup files only (skip database) |
| `--compress` | Compress backup (default: true) |

### Output
```text
✔ Database exported (245 MB)
✔ Files archived (1.2 GB)
✔ Backup created: backup-2026-01-18-143201.tar.gz
```

### Backup Contents
- PostgreSQL database dump
- `/storage/uploads` directory
- `/storage/avatars` directory
- Backup metadata (version, timestamp)

---

## `ui-syncup restore`

### Purpose
Restore database and files from a backup archive.

### Usage
```bash
ui-syncup restore ./backup-2026-01-18-143201.tar.gz
```

### Flags
| Flag | Description |
|------|-------------|
| `--db-only` | Restore database only |
| `--files-only` | Restore files only |
| `--dry-run` | Preview restore without changes |

### Safety
- Requires manual confirmation
- Validates backup integrity before restore
- Creates automatic pre-restore snapshot

### Example
```text
⚠ This will overwrite current data. Continue? [y/N]
✔ Backup verified (v2.1.0, 2026-01-18)
✔ Database restored
✔ Files restored
✔ Restore complete

---

## `ui-syncup reset`

### Purpose
Safely wipe **local** environment.

### Usage
```bash
ui-syncup reset
```

### Safety
- Requires manual confirmation
- No `--force` option

### Deletes
- Local database
- Uploaded files
- Docker containers

---

## `ui-syncup purge`

### Purpose
Aggressive factory reset for **development only**. Removes everything including configuration to start from absolute zero.

### Usage
```bash
ui-syncup purge
```

### Safety
- Requires manual confirmation with typed confirmation phrase
- Blocked in production environments
- Warns about irreversible action

### Deletes (Everything)
- Local database and Docker volumes
- All uploaded files (`/storage/*`)
- Docker containers and images
- Configuration files (`.env.local`, `docker-compose.override.yml`)
- Generated directories

### Comparison: `reset` vs `purge`
| Aspect | `reset` | `purge` |
|--------|---------|--------|
| Database | ✓ Wiped | ✓ Wiped |
| Uploaded files | ✓ Wiped | ✓ Wiped |
| Docker containers | ✓ Removed | ✓ Removed |
| Docker volumes | ✗ Kept | ✓ Removed |
| Docker images | ✗ Kept | ✓ Removed |
| `.env*` files | ✗ Kept | ✓ Removed |
| `docker-compose.override.yml` | ✗ Kept | ✓ Removed |
| Use case | Fresh data | Undo `init` |

### Example
```text
⚠ WARNING: This will remove ALL data and configuration.
  Type "purge ui-syncup" to confirm: purge ui-syncup
✔ Docker containers stopped
✔ Docker volumes removed
✔ Docker images removed
✔ Storage directories removed
✔ Configuration files removed
✔ Factory reset complete. Run "ui-syncup init" to start fresh.
```

---

## `ui-syncup secrets`

### Purpose
Optional helper to manage credentials without editing `.env` manually.

```bash
ui-syncup secrets set
```

### Supported Services (initial)
- S3 / Cloudflare R2
- Supabase
- Resend / SMTP

### Behavior
- Validates credentials
- Writes to `.env.production`
- Never prints secrets

---

## `ui-syncup export`

### Purpose
Export current configuration for backup or migration.

```bash
ui-syncup export
```

### Output
- Redacted config snapshot
- Provider selections
- Feature flags

Secrets are never included.

---

## Updating UI SyncUp

UI SyncUp uses **Git-based updates** instead of a dedicated `update` command. This provides version control, easy rollbacks, and transparency.

### Update Workflow

```bash
# 1. Check for updates
ui-syncup version --check

# 2. Stop services
ui-syncup down

# 3. Pull latest version
git fetch origin
git checkout v2.1.0    # or: git pull origin main

# 4. Update dependencies
bun install

# 5. Run migrations (if schema changed)
ui-syncup migrate

# 6. Restart services
ui-syncup up
```

### Check for Updates

```bash
ui-syncup version --check
```

```text
UI SyncUp CLI: 1.2.0
App Version:   2.0.0

✨ New version available: v2.1.0
   Release notes: https://github.com/your-org/ui-syncup/releases/v2.1.0
   Update: git fetch && git checkout v2.1.0
```

### Rollback to Previous Version

```bash
ui-syncup down
git checkout v2.0.0
bun install
ui-syncup migrate --rollback   # if needed
ui-syncup up
```

### Why No `update` Command?

| Approach | Benefit |
|----------|---------|
| Git-based | Full version history, easy rollbacks |
| Explicit migrations | User controls when schema changes |
| No magic | Transparent, predictable process |

---

## Configuration Ownership Model

| Config Type | Location |
|-----------|---------|
| Secrets | `.env*` |
| Provider choice | Database |
| Feature flags | Database |
| Infrastructure | Environment |

CLI **writes config**, Web UI **manages runtime settings**.

---

## What the CLI Does NOT Do

- ❌ No business logic
- ❌ No user or project management
- ❌ No daily admin workflows
- ❌ No provider lock‑in

---

## Design Philosophy

- Local‑first defaults
- External SaaS is opt‑in
- Predictable commands
- Safe by default
- Web UI remains primary control plane

---

## Recommended Tech Stack (CLI)

- Node.js
- commander / oclif
- zx or execa
- prompts
- dotenv
- chalk

---

## Summary

UI SyncUp CLI is intentionally **minimal**, focused on:
- Setup
- Health checks
- Maintenance
- Automation

This keeps the product approachable while still supporting serious self‑hosting and production use cases.
