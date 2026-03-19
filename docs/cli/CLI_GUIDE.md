# UI SyncUp CLI – Self-Hosting Guide

The `ui-syncup` CLI is a lightweight Node.js tool for deploying and operating a self-hosted UI SyncUp instance. It requires **Docker** and **Node 20+** — no Bun needed on the host machine.

---

## Installation

```bash
# One-time use (recommended)
npx ui-syncup <command>

# Global install
npm install -g ui-syncup
ui-syncup <command>
```

---

## Command Overview

| Command | Purpose |
|---------|---------|
| `ui-syncup init` | First-time setup wizard |
| `ui-syncup upgrade` | Pull latest image and restart |
| `ui-syncup doctor` | Diagnose deployment health |

---

## `ui-syncup init`

### Purpose

Interactive wizard for first-time deployments. Downloads the production Docker Compose file, configures your `.env`, and starts the stack.

### Usage

```bash
npx ui-syncup init
```

### What it does

1. Verifies Docker is installed and running
2. Downloads `docker/compose.yml` from the repo into your working directory
3. Prompts for app URL and secret (auto-generates `BETTER_AUTH_SECRET`)
4. Prompts for each service backend with sensible defaults:
   - **Database** — bundled PostgreSQL or external (Supabase / Neon / other)
   - **Cache** — bundled Redis or external (Upstash / Redis Cloud)
   - **Storage** — bundled MinIO or external S3 (AWS / R2 / Backblaze)
   - **Email** — Resend API key or SMTP credentials
5. Writes `.env` (mode `0600`) with `COMPOSE_PROFILES` set
6. Runs `docker compose up -d` with the selected profiles

### Profile gates

Bundled services are opt-in via Docker Compose profiles:

| Profile | Service |
|---------|---------|
| `db` | PostgreSQL 15 |
| `cache` | Redis 7 |
| `storage` | MinIO + bucket init |

### Re-running

`init` is safe to re-run. It skips downloading files that already exist and only prompts for values not yet set in `.env`.

---

## `ui-syncup upgrade`

### Purpose

Pulls the latest Docker image and restarts the stack with zero-downtime replacement.

### Usage

```bash
npx ui-syncup upgrade

# Upgrade using a specific compose file
npx ui-syncup upgrade -f /path/to/compose.yml
```

### What it does

1. Runs `docker compose pull` to fetch the latest image tags
2. Runs `docker compose up -d --remove-orphans` to restart with the new image

### Note

Active `COMPOSE_PROFILES` in your `.env` are respected automatically — bundled services are upgraded alongside the app.

---

## `ui-syncup doctor`

### Purpose

Diagnoses your deployment and reports the status of each component.

### Usage

```bash
npx ui-syncup doctor
```

### Checks performed

| Check | Pass condition |
|-------|---------------|
| Docker daemon | `docker info` exits 0 |
| Required env vars | All required variables present in `.env` |
| App health | `GET /api/health` returns `{"status":"ok"}` |
| Disk space | ≥ 2 GB free on the Docker data directory |

### Example output

```
✔  Docker 27.1.0
✔  All required env vars present
✔  /api/health → ok (v0.2.4)
✔  Disk space: 42 GB free
```

---

## Environment Variables

The key variables written by `init`:

| Variable | Description |
|----------|-------------|
| `BETTER_AUTH_URL` | Public-facing app URL |
| `NEXT_PUBLIC_APP_URL` | Same as above (client-side) |
| `BETTER_AUTH_SECRET` | Auto-generated 32-byte hex secret |
| `DATABASE_URL` | PostgreSQL connection string |
| `DIRECT_URL` | Non-pooled connection (for migrations) |
| `REDIS_URL` | Redis connection string |
| `STORAGE_ENDPOINT` | S3-compatible endpoint URL |
| `STORAGE_ACCESS_KEY_ID` | S3 access key |
| `STORAGE_SECRET_ACCESS_KEY` | S3 secret key |
| `COMPOSE_PROFILES` | Comma-separated active profile names |
| `POSTGRES_PASSWORD` | Password for bundled PostgreSQL |
| `MINIO_ROOT_PASSWORD` | Auto-generated password for bundled MinIO |

---

## Updating

```bash
# Pull the latest image and restart
npx ui-syncup upgrade
```

This is the standard update path. Migrations run automatically on container start (`bun run db:migrate`).

---

## Design Philosophy

- **Docker-native** — no Bun or Node required on the server, just Docker
- **Opt-in bundled services** — bring your own database/cache/storage or use the included ones
- **Idempotent** — `init` and `upgrade` are safe to run repeatedly
- **Minimal footprint** — three commands cover the full operational lifecycle
