# Self-Hosted Deployment via Docker (No CLI)

This guide covers deploying UI SyncUp using `docker/compose.yml` directly — without the `ui-syncup` CLI. Use this path when deploying on a Linux server, Coolify, or Dokploy.

> **You do not need the `Dockerfile`.**
> `compose.yml` pulls the pre-built image `ghcr.io/bykhd/ui-syncup:latest` published by the CI/CD pipeline. The Dockerfile is only used by the GitHub Actions release workflow to build and publish that image.

---

## Files in this directory

| File | Purpose |
|------|---------|
| `compose.yml` | Production self-hosting compose — the only file needed for deployment |
| `compose.dev.yml` | Local development override (SMTP pass-through, mailpit, etc.) |
| `compose.dev-minio.yml` | Standalone MinIO for local development (no profiles, no auth) |

---

## How services and profiles work

`compose.yml` defines four services. The `app` service always starts. The three infrastructure services are **opt-in via profiles** — nothing bundled runs unless you explicitly activate a profile.

| Profile | Service(s) started | Use when |
|---------|--------------------|----------|
| _(none)_ | `app` only | You supply all external services (Supabase, Neon, Upstash, AWS S3, Resend) |
| `db` | `app` + `postgres:15-alpine` | You want a bundled PostgreSQL database |
| `cache` | `app` + `redis:7-alpine` | You want a bundled Redis cache |
| `storage` | `app` + `minio` + `minio-init` | You want bundled S3-compatible object storage |
| `db,cache` | `app` + `postgres` + `redis` | Bundled database and cache |
| `db,cache,storage` | all services | Fully self-contained, all-in-one bundle |

**Selecting profiles** — two equivalent methods:

```bash
# Method A: --profile flags on the command line
docker compose -f docker/compose.yml \
  --profile db --profile cache --profile storage up -d

# Method B: COMPOSE_PROFILES env var (preferred for platforms and .env files)
COMPOSE_PROFILES=db,cache,storage docker compose -f docker/compose.yml up -d
```

On Coolify, Dokploy, or any platform that manages env vars for you, use **Method B** — set `COMPOSE_PROFILES` in the platform's environment variable UI.

---

## Step 1 — Download the compose file

```bash
curl -fsSL \
  https://raw.githubusercontent.com/BYKHD/ui-syncup/main/docker/compose.yml \
  -o compose.yml
```

Or copy it directly from this repository. You only need this one file on your server.

---

## Step 2 — Create your `.env` file

```bash
curl -fsSL \
  https://raw.githubusercontent.com/BYKHD/ui-syncup/main/.env.example \
  -o .env

chmod 600 .env
```

Then open `.env` in an editor and fill in the required variables (see [Environment Variables](#environment-variables) below).

**Place `.env` in the same directory as `compose.yml`.** The `app` service loads it automatically via `env_file`.

---

## Step 3 — Choose your infrastructure backends

Decide which services you will bundle vs. supply externally. This determines your `COMPOSE_PROFILES` value.

### Option A — All external (lightest, cloud-managed)

Leave `COMPOSE_PROFILES` unset or empty. Supply connection strings for all services in `.env`:

```dotenv
COMPOSE_PROFILES=

DATABASE_URL=postgresql://user:pass@your-db-host:5432/ui_syncup
DIRECT_URL=postgresql://user:pass@your-db-host:5432/ui_syncup
REDIS_URL=redis://your-redis-host:6379
# ... storage and email vars pointing to external providers
```

### Option B — All bundled (heaviest, no external dependencies)

```dotenv
COMPOSE_PROFILES=db,cache,storage

POSTGRES_USER=syncup
POSTGRES_PASSWORD=change-me-strong-password
POSTGRES_DB=ui_syncup

DATABASE_URL=postgresql://syncup:change-me-strong-password@postgres:5432/ui_syncup
DIRECT_URL=postgresql://syncup:change-me-strong-password@postgres:5432/ui_syncup
REDIS_URL=redis://redis:6379

MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=change-me-strong-password
STORAGE_ENDPOINT=http://minio:9000
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY_ID=minioadmin
STORAGE_SECRET_ACCESS_KEY=change-me-strong-password
STORAGE_ATTACHMENTS_BUCKET=ui-syncup-attachments
STORAGE_MEDIA_BUCKET=ui-syncup-media
STORAGE_ATTACHMENTS_PUBLIC_URL=https://your-domain.com/storage/attachments
STORAGE_MEDIA_PUBLIC_URL=https://your-domain.com/storage/media
```

Note: when using bundled Postgres, the hostname in `DATABASE_URL` is `postgres` (the service name). When using bundled Redis, the hostname is `redis`.

### Option C — Mix and match

Any combination works. Only activate profiles for the services you want bundled:

```dotenv
# Bundled DB + cache, external storage (e.g. AWS S3)
COMPOSE_PROFILES=db,cache
```

---

## Step 4 — Set required variables

Regardless of which profile combination you choose, these variables are always required:

```dotenv
# App identity
BETTER_AUTH_SECRET=<random string, minimum 32 characters>
BETTER_AUTH_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com/api

# Database — either bundled (postgres service) or external
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Cache — either bundled (redis service) or external
REDIS_URL=redis://...
```

Generate a secure `BETTER_AUTH_SECRET`:

```bash
openssl rand -hex 32
```

---

## Step 5 — Start the stack

```bash
docker compose -f compose.yml up -d
```

Because `COMPOSE_PROFILES` is set in `.env`, Docker Compose reads it automatically — no `--profile` flags needed on the command line.

**What happens on startup:**

1. Bundled infrastructure services (if any profiles active) start and run their health checks.
2. The `app` container waits for any bundled `postgres`/`redis` to pass their health checks before starting (via `depends_on: condition: service_healthy`). External services have no wait — their availability is your responsibility.
3. The `app` container runs `bun run db:migrate` automatically before the Next.js server starts.
4. If migration fails, the `app` container exits immediately (the server never starts). Check logs with `docker compose logs app`.
5. Once migrations succeed, `node server.js` starts and the app becomes available.

The stack should reach a healthy state within 60 seconds.

---

## Step 6 — Verify

```bash
# Check all containers are running
docker compose ps

# Check app logs (confirms migrations ran)
docker compose logs app

# Hit the health endpoint
curl http://localhost:3000/api/health
# Expected: {"status":"ok","version":"...","timestamp":"..."}
```

---

## Deploying on Coolify

Coolify manages `docker compose` deployments through its UI. There are no `--profile` flags to type — everything is done via environment variables.

### Steps

1. **Create a new Resource** → choose **Docker Compose**.

2. **Compose source** — choose one of:
   - **URL**: paste the raw GitHub URL to `docker/compose.yml`
   - **Git repository**: connect your fork and set the compose file path to `docker/compose.yml`
   - **Inline**: paste the full contents of `compose.yml` directly

3. **Environment Variables** tab — add all your variables. The critical one for profiles:

   ```
   COMPOSE_PROFILES=db,cache,storage
   ```

   Add every other required variable from your `.env` here. Coolify injects them into the container environment and passes `COMPOSE_PROFILES` to `docker compose up` automatically.

4. **Port** — Coolify will detect port `3000` from the compose file. Set your domain in the Domains section.

5. **Deploy** — click Deploy. Coolify runs `docker compose up -d` with your env vars injected.

6. **Verify** — check the deployment logs in Coolify's UI. Look for `bun run db:migrate` completing successfully in the `app` container logs.

### Profile selection on Coolify

| What you want | Set in Coolify env vars |
|---------------|-------------------------|
| App only (fully external) | `COMPOSE_PROFILES=` (empty value, or omit entirely) |
| Bundled Postgres only | `COMPOSE_PROFILES=db` |
| Bundled Postgres + Redis | `COMPOSE_PROFILES=db,cache` |
| All bundled | `COMPOSE_PROFILES=db,cache,storage` |

> Coolify does not have a "profile selector" UI. The `COMPOSE_PROFILES` env var is the only mechanism. Docker Compose natively reads this variable when running `docker compose up`.

---

## Deploying on Dokploy

Dokploy works the same way as Coolify for Docker Compose deployments.

### Steps

1. **Create a new Application** → choose **Docker Compose**.

2. **Compose file** — paste the contents of `docker/compose.yml` into the compose editor, or connect a Git repository and set the compose file path to `docker/compose.yml`.

3. **Environment** tab — add all your variables including:

   ```
   COMPOSE_PROFILES=db,cache,storage
   ```

4. **Domain** — configure your domain in Dokploy's domain settings. It will proxy to port `3000`.

5. **Deploy** — click Deploy.

6. **Logs** — check the `app` service logs in Dokploy to confirm migrations ran before the server started.

### Profile selection on Dokploy

Same as Coolify — set `COMPOSE_PROFILES` in Dokploy's **Environment** tab. No flags or CLI commands required.

---

## Environment Variables

### Always required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL pooled connection string |
| `DIRECT_URL` | PostgreSQL direct (non-pooled) connection string — used by Prisma migrations |
| `REDIS_URL` | Redis connection string |
| `BETTER_AUTH_SECRET` | Random string, minimum 32 characters |
| `BETTER_AUTH_URL` | Full public URL of your app (e.g. `https://syncup.example.com`) |
| `NEXT_PUBLIC_APP_URL` | Same as `BETTER_AUTH_URL` |
| `NEXT_PUBLIC_API_URL` | `${NEXT_PUBLIC_APP_URL}/api` |

### Bundled Postgres (`--profile db`)

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `syncup` | Database username |
| `POSTGRES_PASSWORD` | _(required)_ | Database password — set a strong value |
| `POSTGRES_DB` | `ui_syncup` | Database name |

When using bundled Postgres, set `DATABASE_URL` and `DIRECT_URL` to point at the `postgres` service:
```
postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
```

### Bundled Redis (`--profile cache`)

No extra variables needed. Set `REDIS_URL=redis://redis:6379` in your `.env`.

### Bundled MinIO (`--profile storage`)

| Variable | Default | Description |
|----------|---------|-------------|
| `MINIO_ROOT_USER` | _(required)_ | MinIO admin username |
| `MINIO_ROOT_PASSWORD` | _(required, min 8 chars)_ | MinIO admin password |
| `STORAGE_ENDPOINT` | `http://minio:9000` | S3 endpoint the app uses |
| `STORAGE_REGION` | `us-east-1` | S3 region |
| `STORAGE_ACCESS_KEY_ID` | — | Set to the same value as `MINIO_ROOT_USER` |
| `STORAGE_SECRET_ACCESS_KEY` | — | Set to the same value as `MINIO_ROOT_PASSWORD` |
| `STORAGE_ATTACHMENTS_BUCKET` | `ui-syncup-attachments` | Bucket name for attachments |
| `STORAGE_MEDIA_BUCKET` | `ui-syncup-media` | Bucket name for media |
| `STORAGE_ATTACHMENTS_PUBLIC_URL` | — | Public URL for attachments (e.g. `https://your-domain.com/storage/attachments`) |
| `STORAGE_MEDIA_PUBLIC_URL` | — | Public URL for media |

Buckets are created automatically by the `minio-init` container on first startup.

### Email (choose one)

**Resend (cloud):**
| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | API key from resend.com |
| `RESEND_FROM_EMAIL` | Verified sender address |

**SMTP (self-hosted):**
| Variable | Description |
|----------|-------------|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (e.g. `587`) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASSWORD` | SMTP password |
| `SMTP_FROM_EMAIL` | Sender address |
| `SMTP_SECURE` | `true` for TLS, `false` for STARTTLS |

### OAuth (all optional)

```dotenv
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=

ATLASSIAN_CLIENT_ID=
ATLASSIAN_CLIENT_SECRET=
```

### Runtime environment

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Set to `development` to enable verbose runtime logging. Note: the published Docker image is always a production build — this only affects runtime behavior, not the compiled output. |
| `PORT` | `3000` | Host port mapped to the app container |

---

## Upgrading

Pull the latest image and restart. Migrations run automatically on startup.

```bash
docker compose -f compose.yml pull
docker compose -f compose.yml up -d --remove-orphans
```

Check that migrations applied successfully:

```bash
docker compose logs app | grep -E "migrate|Migration"
```

> Data volumes (`postgres_data`, `redis_data`, `minio_data`) are never removed by `pull` or `up --remove-orphans`. Your data is safe.

---

## Stopping and removing

```bash
# Stop containers, keep volumes (data preserved)
docker compose -f compose.yml down

# Stop containers and remove all data volumes (DESTRUCTIVE)
docker compose -f compose.yml down -v
```

---

## Troubleshooting

**App container exits immediately on startup**

The most common cause is a failed migration. Check:

```bash
docker compose logs app
```

Look for the `bun run db:migrate` output. Common causes:
- `DATABASE_URL` is wrong or unreachable
- Postgres container is not yet healthy (should not happen with `depends_on`, but can occur with external DBs)
- Schema conflict from a partial previous migration

**Bundled Postgres never becomes healthy**

```bash
docker compose logs postgres
```

Usually caused by a missing or empty `POSTGRES_PASSWORD`. Postgres 15 requires a non-empty password unless `POSTGRES_HOST_AUTH_METHOD=trust` is set.

**`COMPOSE_PROFILES` has no effect**

Ensure the variable is set in the environment where `docker compose` runs, not just inside the container. On Coolify/Dokploy this means the **Environment Variables** tab (platform-level), not a variable only passed to the `app` container.

**MinIO buckets not created**

Check `minio-init` logs:

```bash
docker compose logs minio-init
```

If `minio-init` exited before MinIO was healthy, restart it:

```bash
docker compose up minio-init
```

**Health check failing**

```bash
curl -v http://localhost:3000/api/health
```

Expected response: `{"status":"ok","version":"...","timestamp":"..."}`. If the endpoint returns a 502 or connection refused, check `docker compose logs app` for startup errors.
