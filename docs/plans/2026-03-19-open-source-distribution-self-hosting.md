# Open-Source Distribution & Self-Hosting Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the lean CLI, add production Docker Compose with profile gates, wire up CI/CD workflows, and deliver all OSS community files so anyone can self-host UI SyncUp with a single command.

**Architecture:** The CLI (`/cli/`) is a standalone npm package built with tsup, published as `ui-syncup` on npm. `docker/compose.yml` uses Docker Compose profiles for opt-in bundled services. GitHub Actions CI runs on PRs; a tag-triggered release workflow publishes Docker images (GHCR + Docker Hub) and the CLI to npm. `semantic-release` manages versioning and CHANGELOG.

**Tech Stack:** Node.js ≥ 20, TypeScript, Commander.js, @inquirer/prompts, chalk, tsup (CLI); Docker Buildx multi-arch; GitHub Actions; semantic-release; bun (build/dev only).

**Codebase facts to know:**
- `commander` and `@inquirer/prompts` are already in root `dependencies` — the CLI package will re-declare them in its own `package.json`
- `scripts/migrate.ts` uses `#!/usr/bin/env bun` — the Docker runner stage must have bun installed
- `docker-compose.override.yml` and `docker-compose.minio.yml` exist at root — both must be renamed and moved
- `src/app/api/health/route.ts` exists with a complex service-check implementation — it will be simplified
- Test runner: `vitest`; lint: `bun run lint`; typecheck: `bun run typecheck`; no `tsup` in devDeps yet
- `docs/plans/` is where this plan lives; `docs/cli/CLI_GUIDE.md` is existing CLI docs

---

## Phase 1 — Foundation (Tasks 1–7)

> **Gate:** All 7 tasks complete + verify checklist items 1–6 before starting Phase 2.

---

### Task 1: Repository Structure Cleanup

**Files:**
- Rename: `docker-compose.override.yml` → `docker/compose.dev.yml`
- Rename: `docker-compose.minio.yml` → `docker/compose.dev-minio.yml`
- Create dirs: `docker/`, `cli/src/commands/`, `cli/src/lib/`
- Modify: `package.json` — update minio script references

**Step 1: Create docker/ directory and git-move files**

```bash
mkdir -p docker cli/src/commands cli/src/lib
git mv docker-compose.override.yml docker/compose.dev.yml
git mv docker-compose.minio.yml docker/compose.dev-minio.yml
```

Expected: both files moved, `git status` shows renames staged.

**Step 2: Update `package.json` minio script references**

In `package.json`, change all three minio scripts from `docker-compose.minio.yml` to `docker/compose.dev-minio.yml`:

```json
"minio:start": "docker compose -f docker/compose.dev-minio.yml up -d",
"minio:stop":  "docker compose -f docker/compose.dev-minio.yml down",
"minio:status": "docker compose -f docker/compose.dev-minio.yml ps",
```

**Step 3: Verify no stale references remain**

```bash
grep -r "docker-compose\.minio\.yml\|docker-compose\.override\.yml" \
  --include="*.{json,sh,yml,yaml,ts,md}" \
  --exclude-dir=node_modules .
```

Expected: no output.

**Step 4: Commit**

```bash
git add package.json docker/
git commit -m "chore: reorganize docker compose files into docker/ directory"
```

---

### Task 2: `docker/compose.yml` — Production Self-Hosting

**Files:**
- Create: `docker/compose.yml`

**Step 1: Create the production compose file**

Create `docker/compose.yml` with the following content. Key design rules:
- `app` service always starts (no profile)
- `postgres`, `redis`, `minio`, `minio-init` only start when their profile is active
- `app` `depends_on` postgres/redis with `required: false` so it starts when profiles are absent

```yaml
# ============================================================================
# UI SyncUp — Production Self-Hosting Compose
# ============================================================================
#
# Quick start (fully external services):
#   docker compose -f docker/compose.yml up -d
#
# With bundled infrastructure:
#   docker compose -f docker/compose.yml \
#     --profile db --profile cache --profile storage up -d
#
# Profile reference:
#   --profile db       → postgres:15-alpine
#   --profile cache    → redis:7-alpine
#   --profile storage  → minio + minio-init (bucket creation)
#
# Tip: Set COMPOSE_PROFILES=db,cache,storage in .env for bare `docker compose up -d`
# ============================================================================

name: ui-syncup

services:
  app:
    image: ghcr.io/bykhd/ui-syncup:latest
    restart: always
    ports:
      - "${PORT:-3000}:3000"
    env_file:
      - .env
    environment:
      - NODE_ENV=production
    # Runs DB migrations before the Next.js server starts.
    # Migration failure exits the container before any traffic is served.
    command: >
      sh -c "bun run db:migrate && node server.js"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 45s
    depends_on:
      postgres:
        condition: service_healthy
        required: false
      redis:
        condition: service_healthy
        required: false

  postgres:
    image: postgres:15-alpine
    restart: always
    profiles: ["db"]
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-syncup}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required when using --profile db}
      POSTGRES_DB: ${POSTGRES_DB:-ui_syncup}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-syncup} -d ${POSTGRES_DB:-ui_syncup}"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s

  redis:
    image: redis:7-alpine
    restart: always
    profiles: ["cache"]
    command: redis-server --save 60 1 --loglevel warning
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10

  minio:
    image: minio/minio:latest
    restart: always
    profiles: ["storage"]
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:?MINIO_ROOT_USER is required when using --profile storage}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD is required when using --profile storage}
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      timeout: 5s
      retries: 5

  minio-init:
    image: minio/mc:latest
    profiles: ["storage"]
    depends_on:
      minio:
        condition: service_healthy
    restart: "no"
    entrypoint: >
      /bin/sh -c "
        mc alias set myminio http://minio:9000 $${MINIO_ROOT_USER} $${MINIO_ROOT_PASSWORD};
        mc mb --ignore-existing myminio/${STORAGE_ATTACHMENTS_BUCKET:-ui-syncup-attachments};
        mc mb --ignore-existing myminio/${STORAGE_MEDIA_BUCKET:-ui-syncup-media};
        mc anonymous set download myminio/${STORAGE_ATTACHMENTS_BUCKET:-ui-syncup-attachments};
        mc anonymous set download myminio/${STORAGE_MEDIA_BUCKET:-ui-syncup-media};
        exit 0;
      "

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

**Step 2: Verify compose file parses**

```bash
docker compose -f docker/compose.yml config --quiet
```

Expected: exits 0, no errors.

**Step 3: Confirm service list**

```bash
docker compose -f docker/compose.yml config --services
```

Expected output (5 services): `app`, `postgres`, `redis`, `minio`, `minio-init`

**Step 4: Commit**

```bash
git add docker/compose.yml
git commit -m "feat: add production self-hosting docker compose with profile gates"
```

---

### Task 3: Update Dockerfile for Migration Entrypoint Support

**Context:** The compose entrypoint runs `bun run db:migrate && node server.js`. The current Dockerfile runner uses `node:20-alpine` — no bun. The runner must be changed to `oven/bun:1-alpine` (which ships bun + a compatible node). Migration deps (`drizzle-orm`, `postgres`, `dotenv`) and the migration script must be available in the runtime image.

**Files:**
- Modify: `Dockerfile` (runner stage only — stages 1 and 2 unchanged)

**Step 1: Replace the runner stage**

Find this section in `Dockerfile` (line 39 onwards):
```dockerfile
FROM node:20-alpine AS runner
```

Replace the entire runner stage with:

```dockerfile
# ---------------------------------------------------------------------------
# Stage 3: Production runtime (oven/bun for migration support)
# ---------------------------------------------------------------------------
FROM oven/bun:1-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy Next.js standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy migration assets needed by the compose entrypoint: bun run db:migrate
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lock* ./
COPY --from=builder /app/scripts/migrate.ts ./scripts/migrate.ts
COPY --from=builder /app/drizzle ./drizzle

# Install production deps for migration (drizzle-orm, postgres, dotenv)
RUN bun install --production --frozen-lockfile

RUN chown -R nextjs:nodejs /app/drizzle /app/scripts /app/package.json

USER nextjs

EXPOSE 3000

# Default CMD for standalone runs without compose.
# The compose entrypoint overrides this with: sh -c "bun run db:migrate && node server.js"
CMD ["node", "server.js"]
```

**Step 2: Verify Docker build succeeds**

```bash
docker build -t ui-syncup-test . 2>&1 | tail -10
```

Expected: last line contains `Successfully built` or `writing image`.

**Step 3: Commit**

```bash
git add Dockerfile
git commit -m "feat: switch runner to oven/bun for migration entrypoint support in compose"
```

---

### Task 4: GitHub Actions CI Workflow

**Files:**
- Create: `.github/workflows/ci.yml`
- Create dir: `.github/workflows/`

**Step 1: Create `.github/workflows/ci.yml`**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - name: Install dependencies
        run: bun install --frozen-lockfile
      - name: Run lint
        run: bun run lint

  typecheck:
    name: Typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - name: Install dependencies
        run: bun install --frozen-lockfile
      - name: Run typecheck
        run: bun run typecheck

  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - name: Install dependencies
        run: bun install --frozen-lockfile
      - name: Run tests
        run: bun run test

  docker-smoke:
    name: Docker Smoke Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      - name: Build Docker image (no push)
        uses: docker/build-push-action@v6
        with:
          context: .
          push: false
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

**Step 2: Commit**

```bash
mkdir -p .github/workflows
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions CI workflow (lint, typecheck, test, docker smoke)"
```

---

### Task 5: GitHub Actions Release Workflow

**Files:**
- Create: `.github/workflows/release.yml`

**Step 1: Create `.github/workflows/release.yml`**

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - "v*.*.*"

jobs:
  build-and-push:
    name: Build & Push Docker Image (multi-arch)
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Set up QEMU (for ARM cross-compilation)
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Extract version tags from git tag
        id: version
        run: |
          TAG="${GITHUB_REF#refs/tags/}"
          # v0.2.4 → major=v0, minor=v0.2, patch=v0.2.4
          MAJOR="${TAG%%.*}"
          MINOR="${TAG%.*}"
          echo "tag=${TAG}" >> "$GITHUB_OUTPUT"
          echo "major=${MAJOR}" >> "$GITHUB_OUTPUT"
          echo "minor=${MINOR}" >> "$GITHUB_OUTPUT"

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push multi-arch image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          platforms: linux/amd64,linux/arm64
          tags: |
            ghcr.io/bykhd/ui-syncup:latest
            ghcr.io/bykhd/ui-syncup:${{ steps.version.outputs.tag }}
            ghcr.io/bykhd/ui-syncup:${{ steps.version.outputs.minor }}
            ghcr.io/bykhd/ui-syncup:${{ steps.version.outputs.major }}
            bykhd/ui-syncup:latest
            bykhd/ui-syncup:${{ steps.version.outputs.tag }}
            bykhd/ui-syncup:${{ steps.version.outputs.minor }}
            bykhd/ui-syncup:${{ steps.version.outputs.major }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  publish-cli:
    name: Publish CLI to npm
    runs-on: ubuntu-latest
    needs: build-and-push
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          registry-url: "https://registry.npmjs.org"
      - name: Extract semver from tag (strip v prefix)
        id: version
        run: echo "version=${GITHUB_REF#refs/tags/v}" >> "$GITHUB_OUTPUT"
      - name: Install CLI dependencies
        working-directory: ./cli
        run: npm install
      - name: Stamp CLI version from tag
        working-directory: ./cli
        run: npm version ${{ steps.version.outputs.version }} --no-git-tag-version
      - name: Build CLI
        working-directory: ./cli
        run: npm run build
      - name: Publish to npm
        working-directory: ./cli
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

  create-release:
    name: Create GitHub Release
    runs-on: ubuntu-latest
    needs: [build-and-push, publish-cli]
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Create GitHub Release with auto-generated notes
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
```

**Step 2: Document required secrets (add to README or CI notes)**

Required GitHub repo secrets before the release workflow works:
- `DOCKERHUB_USERNAME` — Docker Hub username (`bykhd`)
- `DOCKERHUB_TOKEN` — Docker Hub access token (not password)
- `NPM_TOKEN` — npm automation token with publish scope
- `GITHUB_TOKEN` — automatic, no setup needed

**Step 3: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add release workflow for Docker multi-arch push and npm CLI publish"
```

---

### Task 6: Rebuild CLI (`/cli/`)

This is the largest task. The CLI is a standalone npm package separate from the root Next.js app. It must work with Node ≥ 20 without requiring bun.

**Files:**
- Create: `cli/package.json`
- Create: `cli/tsconfig.json`
- Create: `cli/tsup.config.ts`
- Create: `cli/index.ts`
- Create: `cli/src/lib/ui.ts`
- Create: `cli/src/lib/docker.ts`
- Create: `cli/src/lib/env.ts`
- Create: `cli/src/commands/init.ts`
- Create: `cli/src/commands/upgrade.ts`
- Create: `cli/src/commands/doctor.ts`

**Step 1: Create `cli/package.json`**

```json
{
  "name": "ui-syncup",
  "version": "0.2.4",
  "description": "Self-host UI SyncUp with a single command",
  "bin": {
    "ui-syncup": "./dist/index.cjs"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "@inquirer/prompts": "^8.0.0",
    "chalk": "^5.3.0"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  },
  "engines": {
    "node": ">=20"
  },
  "license": "MIT"
}
```

**Step 2: Create `cli/tsup.config.ts`**

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['index.ts'],
  format: ['cjs'],
  target: 'node20',
  bundle: true,
  clean: true,
  sourcemap: false,
  minify: false,
  shims: true,
})
```

**Step 3: Create `cli/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "rootDir": "."
  },
  "include": ["index.ts", "src/**/*.ts"],
  "exclude": ["dist", "node_modules"]
}
```

**Step 4: Create `cli/src/lib/ui.ts`**

```typescript
import chalk from 'chalk'

export const ui = {
  info:    (msg: string) => console.log(chalk.blue('ℹ'), msg),
  success: (msg: string) => console.log(chalk.green('✔'), msg),
  warn:    (msg: string) => console.log(chalk.yellow('⚠'), msg),
  error:   (msg: string) => console.error(chalk.red('✖'), msg),
  step:    (n: number, total: number, msg: string) =>
    console.log(chalk.dim(`[${n}/${total}]`), msg),
  header:  (msg: string) => console.log('\n' + chalk.bold.blue(msg) + '\n'),
}
```

**Step 5: Create `cli/src/lib/docker.ts`**

```typescript
import { execSync, spawnSync } from 'node:child_process'

export function isDockerRunning(): boolean {
  try {
    execSync('docker info', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

export function runCompose(
  composeFile: string,
  args: string[],
  profiles: string[] = []
): { success: boolean } {
  const profileFlags = profiles.flatMap(p => ['--profile', p])
  const cmd = ['docker', 'compose', '-f', composeFile, ...profileFlags, ...args]
  const result = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit' })
  return { success: result.status === 0 }
}
```

**Step 6: Create `cli/src/lib/env.ts`**

```typescript
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

export const REQUIRED_VARS = [
  'DATABASE_URL',
  'DIRECT_URL',
  'REDIS_URL',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_API_URL',
]

export const ENV_EXAMPLE_URL =
  'https://github.com/BYKHD/ui-syncup/blob/main/.env.example'

export function parseEnv(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {}
  const content = readFileSync(filePath, 'utf-8')
  const vars: Record<string, string> = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    vars[trimmed.slice(0, idx)] = trimmed.slice(idx + 1)
  }
  return vars
}

export function writeEnv(filePath: string, vars: Record<string, string>): void {
  const lines = Object.entries(vars).map(([k, v]) => `${k}=${v}`)
  writeFileSync(filePath, lines.join('\n') + '\n', { mode: 0o600 })
}

export function generateSecret(): string {
  return randomBytes(32).toString('hex')
}

export function getMissingVars(vars: Record<string, string>): string[] {
  return REQUIRED_VARS.filter(k => !vars[k] || vars[k].trim() === '')
}
```

**Step 7: Create `cli/src/commands/init.ts`**

Full wizard: downloads compose.yml + .env, prompts for 4 service backend choices, writes .env with 0600, starts the stack with constructed profile flags.

```typescript
import { existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { select, input, confirm } from '@inquirer/prompts'
import { ui } from '../lib/ui.js'
import { generateSecret, writeEnv, parseEnv } from '../lib/env.js'
import { isDockerRunning, runCompose } from '../lib/docker.js'

const COMPOSE_URL =
  'https://raw.githubusercontent.com/BYKHD/ui-syncup/main/docker/compose.yml'
const ENV_EXAMPLE_URL =
  'https://raw.githubusercontent.com/BYKHD/ui-syncup/main/.env.example'

export async function initCommand(): Promise<void> {
  ui.header('UI SyncUp — Setup Wizard')

  // Step 1: Check Docker
  ui.step(1, 6, 'Checking Docker...')
  if (!isDockerRunning()) {
    ui.error('Docker is not running. Please start Docker and try again.')
    process.exit(1)
  }
  ui.success('Docker is running')

  // Step 2: Download compose.yml
  ui.step(2, 6, 'Setting up compose.yml...')
  if (existsSync('compose.yml')) {
    ui.info('compose.yml already exists — skipping download')
  } else {
    execSync(`curl -fsSL "${COMPOSE_URL}" -o compose.yml`, { stdio: 'inherit' })
    ui.success('Downloaded compose.yml')
  }

  // Step 3: Setup .env
  ui.step(3, 6, 'Setting up .env...')
  let envVars: Record<string, string> = {}
  const envExists = existsSync('.env')
  if (envExists) {
    ui.warn('.env already exists — checking for missing vars only')
    envVars = parseEnv('.env')
  } else {
    execSync(`curl -fsSL "${ENV_EXAMPLE_URL}" -o .env`, { stdio: 'inherit' })
    envVars = parseEnv('.env')
    ui.success('Downloaded .env template')
  }

  // Step 4: Wizard
  ui.step(4, 6, 'Configuring services...')

  const appUrl = await input({
    message: 'Public URL of your app (e.g. https://syncup.example.com):',
    default: envVars['BETTER_AUTH_URL'] || '',
    validate: v => v.startsWith('http') || 'Must start with http:// or https://',
  })
  envVars['BETTER_AUTH_URL'] = appUrl
  envVars['NEXT_PUBLIC_APP_URL'] = appUrl
  envVars['NEXT_PUBLIC_API_URL'] = `${appUrl}/api`

  if (!envVars['BETTER_AUTH_SECRET']) {
    const autoSecret = await confirm({
      message: 'Auto-generate a secure BETTER_AUTH_SECRET?',
      default: true,
    })
    if (autoSecret) {
      envVars['BETTER_AUTH_SECRET'] = generateSecret()
      ui.success('Generated BETTER_AUTH_SECRET')
    }
  }

  const profiles: string[] = []

  // Database
  const dbChoice = await select({
    message: 'Database backend:',
    choices: [
      { name: 'Bundled PostgreSQL (recommended)', value: 'bundled' },
      { name: 'External (Supabase / Neon / other)', value: 'external' },
    ],
  })
  if (dbChoice === 'bundled') {
    profiles.push('db')
    const pgPass = await input({
      message: 'PostgreSQL password (POSTGRES_PASSWORD, min 8 chars):',
      validate: v => v.length >= 8 || 'Minimum 8 characters',
    })
    envVars['POSTGRES_PASSWORD'] = pgPass
    envVars['DATABASE_URL'] = `postgresql://syncup:${pgPass}@postgres:5432/ui_syncup`
    envVars['DIRECT_URL'] = envVars['DATABASE_URL']
  } else {
    envVars['DATABASE_URL'] = await input({
      message: 'DATABASE_URL (postgresql://...):',
      validate: v => v.startsWith('postgres') || 'Must be a PostgreSQL URL',
    })
    envVars['DIRECT_URL'] = await input({
      message: 'DIRECT_URL (non-pooled, for migrations):',
      default: envVars['DATABASE_URL'],
    })
  }

  // Cache
  const cacheChoice = await select({
    message: 'Cache backend:',
    choices: [
      { name: 'Bundled Redis (recommended)', value: 'bundled' },
      { name: 'External (Upstash / Redis Cloud)', value: 'external' },
    ],
  })
  if (cacheChoice === 'bundled') {
    profiles.push('cache')
    envVars['REDIS_URL'] = 'redis://redis:6379'
  } else {
    envVars['REDIS_URL'] = await input({
      message: 'REDIS_URL (redis://...):',
      validate: v => v.startsWith('redis') || 'Must be a Redis URL',
    })
  }

  // Storage
  const storageChoice = await select({
    message: 'Storage backend:',
    choices: [
      { name: 'Bundled MinIO (recommended)', value: 'bundled' },
      { name: 'External S3 (AWS / R2 / Backblaze)', value: 'external' },
    ],
  })
  if (storageChoice === 'bundled') {
    profiles.push('storage')
    const minioUser = await input({ message: 'MinIO root username:', default: 'minioadmin' })
    const minioPass = await input({
      message: 'MinIO root password (min 8 chars):',
      validate: v => v.length >= 8 || 'Minimum 8 characters',
    })
    envVars['MINIO_ROOT_USER'] = minioUser
    envVars['MINIO_ROOT_PASSWORD'] = minioPass
    envVars['STORAGE_ENDPOINT'] = 'http://minio:9000'
    envVars['STORAGE_REGION'] = 'us-east-1'
    envVars['STORAGE_ACCESS_KEY_ID'] = minioUser
    envVars['STORAGE_SECRET_ACCESS_KEY'] = minioPass
    envVars['STORAGE_ATTACHMENTS_BUCKET'] = 'ui-syncup-attachments'
    envVars['STORAGE_MEDIA_BUCKET'] = 'ui-syncup-media'
    envVars['STORAGE_ATTACHMENTS_PUBLIC_URL'] = `${appUrl}/storage/attachments`
    envVars['STORAGE_MEDIA_PUBLIC_URL'] = `${appUrl}/storage/media`
  } else {
    envVars['STORAGE_ENDPOINT'] = await input({ message: 'Storage endpoint URL:' })
    envVars['STORAGE_ACCESS_KEY_ID'] = await input({ message: 'Storage access key ID:' })
    envVars['STORAGE_SECRET_ACCESS_KEY'] = await input({ message: 'Storage secret access key:' })
  }

  // Email
  const emailChoice = await select({
    message: 'Email provider:',
    choices: [
      { name: 'Resend', value: 'resend' },
      { name: 'SMTP (self-hosted)', value: 'smtp' },
      { name: 'Skip for now', value: 'skip' },
    ],
  })
  if (emailChoice === 'resend') {
    envVars['RESEND_API_KEY'] = await input({ message: 'Resend API key:' })
    envVars['RESEND_FROM_EMAIL'] = await input({ message: 'From email address:' })
  } else if (emailChoice === 'smtp') {
    envVars['SMTP_HOST'] = await input({ message: 'SMTP host:' })
    envVars['SMTP_PORT'] = await input({ message: 'SMTP port:', default: '587' })
    envVars['SMTP_USER'] = await input({ message: 'SMTP username:' })
    envVars['SMTP_PASSWORD'] = await input({ message: 'SMTP password:' })
    envVars['SMTP_FROM_EMAIL'] = await input({ message: 'From email:' })
    envVars['SMTP_SECURE'] = await input({ message: 'TLS? (true/false):', default: 'true' })
  }

  // Store active profiles in .env for bare `docker compose up` re-runs
  envVars['COMPOSE_PROFILES'] = profiles.join(',')

  // Step 5: Write .env
  ui.step(5, 6, 'Writing .env...')
  writeEnv('.env', envVars)
  ui.success('.env written (permissions: 0600)')

  // Step 6: Start the stack
  ui.step(6, 6, 'Starting UI SyncUp...')
  const result = runCompose('compose.yml', ['up', '-d'], profiles)
  if (!result.success) {
    ui.error('docker compose up failed — check logs with: docker compose logs app')
    process.exit(1)
  }

  ui.success('UI SyncUp is running!')
  ui.info(`Open: ${appUrl}`)
  if (profiles.length > 0) {
    ui.info(`Active profiles: ${profiles.join(', ')}`)
  }
}
```

**Step 8: Create `cli/src/commands/upgrade.ts`**

```typescript
import { ui } from '../lib/ui.js'
import { isDockerRunning, runCompose } from '../lib/docker.js'

export async function upgradeCommand(composeFile: string): Promise<void> {
  ui.header('UI SyncUp — Upgrade')

  if (!isDockerRunning()) {
    ui.error('Docker is not running.')
    process.exit(1)
  }

  ui.step(1, 2, 'Pulling latest image...')
  const pull = runCompose(composeFile, ['pull'])
  if (!pull.success) {
    ui.error('docker compose pull failed')
    process.exit(1)
  }

  ui.step(2, 2, 'Restarting stack (migrations run automatically on container start)...')
  const up = runCompose(composeFile, ['up', '-d', '--remove-orphans'])
  if (!up.success) {
    ui.error('docker compose up failed — check logs with: docker compose logs app')
    process.exit(1)
  }

  ui.success('Upgrade complete. Migrations applied automatically via the app entrypoint.')
}
```

**Step 9: Create `cli/src/commands/doctor.ts`**

```typescript
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { ui } from '../lib/ui.js'
import { parseEnv, getMissingVars, ENV_EXAMPLE_URL } from '../lib/env.js'
import { isDockerRunning } from '../lib/docker.js'

export async function doctorCommand(): Promise<void> {
  ui.header('UI SyncUp — Doctor')
  let allGood = true

  // Check 1: Docker daemon
  ui.info('Checking Docker daemon...')
  if (isDockerRunning()) {
    ui.success('Docker is running')
  } else {
    ui.error('Docker is not running')
    allGood = false
  }

  // Check 2: Required env vars
  ui.info('Checking .env required variables...')
  if (!existsSync('.env')) {
    ui.error('.env not found. Run: npx ui-syncup init')
    allGood = false
  } else {
    const vars = parseEnv('.env')
    const missing = getMissingVars(vars)
    if (missing.length === 0) {
      ui.success('All required env vars present')
    } else {
      for (const k of missing) {
        ui.error(`Missing: ${k} — see ${ENV_EXAMPLE_URL}`)
      }
      allGood = false
    }
  }

  // Check 3: Health endpoint
  ui.info('Checking /api/health...')
  try {
    const vars = existsSync('.env') ? parseEnv('.env') : {}
    const appUrl = vars['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000'
    const raw = execSync(`curl -sf "${appUrl}/api/health"`, {
      encoding: 'utf-8',
      timeout: 5000,
    })
    const json = JSON.parse(raw)
    if (json.status === 'ok') {
      ui.success(`Health OK — version: ${json.version}`)
    } else {
      ui.warn(`Health returned status: ${json.status}`)
    }
  } catch {
    ui.error('Health endpoint unreachable — is the stack running?')
    allGood = false
  }

  // Check 4: Disk space (require ≥ 2 GB free)
  ui.info('Checking disk space...')
  try {
    const dfOut = execSync("df -k . | awk 'NR==2{print $4}'", {
      encoding: 'utf-8',
    }).trim()
    const freeGB = parseInt(dfOut, 10) / 1024 / 1024
    if (freeGB >= 2) {
      ui.success(`Disk space OK — ${freeGB.toFixed(1)} GB free`)
    } else {
      ui.warn(`Low disk space — ${freeGB.toFixed(1)} GB free (recommend ≥ 2 GB)`)
      allGood = false
    }
  } catch {
    ui.warn('Could not check disk space')
  }

  console.log('')
  if (allGood) {
    ui.success('All checks passed.')
  } else {
    ui.error('Some checks failed — see above.')
    process.exit(1)
  }
}
```

**Step 10: Create `cli/index.ts` (entry point)**

```typescript
#!/usr/bin/env node
import { Command } from 'commander'
import { initCommand } from './src/commands/init.js'
import { upgradeCommand } from './src/commands/upgrade.js'
import { doctorCommand } from './src/commands/doctor.js'

const DEFAULT_COMPOSE = 'compose.yml'

const program = new Command()
  .name('ui-syncup')
  .description('Self-host UI SyncUp with a single command')
  .version('0.2.4')

program
  .command('init')
  .description('Guided setup: download compose file, configure services, start the stack')
  .action(initCommand)

program
  .command('upgrade')
  .description('Pull latest image and restart the stack (migrations run automatically)')
  .option('-f, --file <path>', 'Path to compose file', DEFAULT_COMPOSE)
  .action(({ file }) => upgradeCommand(file))

program
  .command('doctor')
  .description('Validate environment, service health, and disk space')
  .action(doctorCommand)

program.parse()
```

**Step 11: Install CLI dependencies and build**

```bash
cd cli
npm install
npm run build
ls dist/
```

Expected: `dist/index.cjs` exists.

**Step 12: Smoke test the CLI**

```bash
node dist/index.cjs --help
node dist/index.cjs --version
```

Expected: help output with `init`, `upgrade`, `doctor` listed; version `0.2.4`.

**Step 13: Commit**

```bash
cd ..
git add cli/
git commit -m "feat: add lean CLI with init, upgrade, and doctor commands"
```

---

### Task 7: Update `GET /api/health`

**Context:** The current `src/app/api/health/route.ts` calls `validateExternalServices()` which can violate the < 100ms SLA. The spec requires `{ status, version, timestamp }` on GET. Replace the handler with a lightweight implementation. The `HEAD` handler can stay as-is or be simplified similarly.

**Files:**
- Modify: `src/app/api/health/route.ts`
- Possibly modify: `tsconfig.json` (add `resolveJsonModule: true`)

**Step 1: Check if `resolveJsonModule` is already in `tsconfig.json`**

```bash
grep "resolveJsonModule" tsconfig.json
```

If absent, add it to `compilerOptions`.

**Step 2: Replace `src/app/api/health/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import pkg from '../../../../package.json'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    version: pkg.version,
    timestamp: new Date().toISOString(),
  })
}

export async function HEAD() {
  return new Response(null, { status: 200 })
}
```

**Note:** The `import pkg from '../../../../package.json'` path: the route is at `src/app/api/health/route.ts`, so `../../../../package.json` resolves to `package.json` at the repo root. Verify the depth: `src/` → `app/` → `api/` → `health/` → four `../` hops = root. Correct.

**Step 3: Run typecheck**

```bash
bun run typecheck
```

Expected: exits 0.

**Step 4: Commit**

```bash
git add src/app/api/health/route.ts tsconfig.json
git commit -m "feat: simplify /api/health to return { status, version, timestamp } in < 100ms"
```

---

## Phase 1 Gate — Verify Before Phase 2

```bash
# 1. Compose parses
docker compose -f docker/compose.yml config --quiet && echo "PASS: compose valid"

# 2. Docker build
docker build -t ui-syncup-test . && echo "PASS: docker build"

# 3. CLI help and version
node cli/dist/index.cjs --help
node cli/dist/index.cjs --version

# 4. Typecheck passes
bun run typecheck && echo "PASS: typecheck"

# 5. Bash script syntax
bash -n install.sh && echo "PASS: install.sh syntax"
```

---

## Phase 2 — Distribution Polish (Tasks 8–9)

---

### Task 8: Refactor `install.sh`

**Context:** Current `install.sh` installs bun and runs `bunx ui-syncup init`. New flow: checks Docker, downloads `compose.yml` + `.env`, runs a 4-question bash wizard identical to the CLI wizard, writes profile flags and `COMPOSE_PROFILES` to `.env`, then runs `docker compose up -d`.

**Files:**
- Modify: `install.sh` (full rewrite)

**Step 1: Rewrite `install.sh`**

```bash
#!/usr/bin/env bash
# =============================================================================
# UI SyncUp — Quick-start installer
# =============================================================================
#
# Usage:
#   bash install.sh
#   curl -fsSL https://raw.githubusercontent.com/BYKHD/ui-syncup/main/install.sh | bash
#
# What it does:
#   1. Checks Docker is installed and running
#   2. Downloads docker/compose.yml from the repo
#   3. Downloads .env.example as .env (skipped if .env already exists)
#   4. Runs a 4-question wizard (DB / Cache / Storage / Email)
#   5. Writes completed .env with COMPOSE_PROFILES set
#   6. Runs docker compose up -d with the selected profiles
# =============================================================================

set -euo pipefail

COMPOSE_URL="https://raw.githubusercontent.com/BYKHD/ui-syncup/main/docker/compose.yml"
ENV_EXAMPLE_URL="https://raw.githubusercontent.com/BYKHD/ui-syncup/main/.env.example"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${BLUE}ℹ${NC}  $*"; }
success() { echo -e "${GREEN}✔${NC}  $*"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }
error()   { echo -e "${RED}✖${NC}  $*" >&2; }

set_env() { ENV_VARS["$1"]="$2"; }

write_env_file() {
  local tmpfile
  tmpfile="$(mktemp)"
  for key in "${!ENV_VARS[@]}"; do
    echo "${key}=${ENV_VARS[$key]}"
  done > "$tmpfile"
  mv "$tmpfile" .env
  chmod 600 .env
}

main() {
  echo -e "\n${BLUE}${BOLD}UI SyncUp — Quick-start installer${NC}\n"

  # ── Docker check ───────────────────────────────────────────────────────────
  if ! command -v docker &>/dev/null; then
    error "Docker is not installed."
    error "Install guide: https://docs.docker.com/get-docker/"
    exit 1
  fi
  if ! docker info &>/dev/null 2>&1; then
    error "Docker is not running. Please start Docker and try again."
    exit 1
  fi
  success "Docker $(docker --version | awk '{print $3}' | tr -d ',')"

  # ── Download compose.yml ───────────────────────────────────────────────────
  if [[ -f compose.yml ]]; then
    info "compose.yml already exists — skipping download"
  else
    info "Downloading compose.yml..."
    curl -fsSL "$COMPOSE_URL" -o compose.yml
    success "Downloaded compose.yml"
  fi

  # ── Setup .env ─────────────────────────────────────────────────────────────
  declare -A ENV_VARS=()
  if [[ -f .env ]]; then
    warn ".env already exists — prompting only for values not yet set"
    while IFS='=' read -r key val || [[ -n "$key" ]]; do
      [[ "$key" =~ ^[[:space:]]*# || -z "$key" ]] && continue
      ENV_VARS["$key"]="${val:-}"
    done < .env
  else
    curl -fsSL "$ENV_EXAMPLE_URL" -o .env
    while IFS='=' read -r key val || [[ -n "$key" ]]; do
      [[ "$key" =~ ^[[:space:]]*# || -z "$key" ]] && continue
      ENV_VARS["$key"]="${val:-}"
    done < .env
    success "Downloaded .env template"
  fi

  # ── Wizard ─────────────────────────────────────────────────────────────────
  read -r -p "Public URL of your app (e.g. https://syncup.example.com): " APP_URL
  set_env BETTER_AUTH_URL    "$APP_URL"
  set_env NEXT_PUBLIC_APP_URL "$APP_URL"
  set_env NEXT_PUBLIC_API_URL "${APP_URL}/api"

  if [[ -z "${ENV_VARS[BETTER_AUTH_SECRET]:-}" ]]; then
    set_env BETTER_AUTH_SECRET "$(openssl rand -hex 32)"
    success "Generated BETTER_AUTH_SECRET"
  fi

  PROFILES=()

  # Database
  echo ""
  echo "Database backend:"
  echo "  1) Bundled PostgreSQL (recommended)"
  echo "  2) External (Supabase / Neon / other)"
  read -r -p "Choice [1]: " DB_CHOICE; DB_CHOICE="${DB_CHOICE:-1}"
  if [[ "$DB_CHOICE" == "1" ]]; then
    PROFILES+=(db)
    read -r -p "PostgreSQL password (min 8 chars): " PG_PASS
    set_env POSTGRES_PASSWORD "$PG_PASS"
    set_env DATABASE_URL "postgresql://syncup:${PG_PASS}@postgres:5432/ui_syncup"
    set_env DIRECT_URL   "postgresql://syncup:${PG_PASS}@postgres:5432/ui_syncup"
  else
    read -r -p "DATABASE_URL (postgresql://...): " DB_URL
    set_env DATABASE_URL "$DB_URL"
    read -r -p "DIRECT_URL (non-pooled, press enter to reuse DATABASE_URL): " D_URL
    set_env DIRECT_URL "${D_URL:-$DB_URL}"
  fi

  # Cache
  echo ""
  echo "Cache backend:"
  echo "  1) Bundled Redis (recommended)"
  echo "  2) External (Upstash / Redis Cloud)"
  read -r -p "Choice [1]: " CACHE_CHOICE; CACHE_CHOICE="${CACHE_CHOICE:-1}"
  if [[ "$CACHE_CHOICE" == "1" ]]; then
    PROFILES+=(cache)
    set_env REDIS_URL "redis://redis:6379"
  else
    read -r -p "REDIS_URL (redis://...): " REDIS_URL
    set_env REDIS_URL "$REDIS_URL"
  fi

  # Storage
  echo ""
  echo "Storage backend:"
  echo "  1) Bundled MinIO (recommended)"
  echo "  2) External S3 (AWS / R2 / Backblaze)"
  read -r -p "Choice [1]: " STORAGE_CHOICE; STORAGE_CHOICE="${STORAGE_CHOICE:-1}"
  if [[ "$STORAGE_CHOICE" == "1" ]]; then
    PROFILES+=(storage)
    MINIO_PASS="$(openssl rand -hex 16)"
    set_env MINIO_ROOT_USER     "minioadmin"
    set_env MINIO_ROOT_PASSWORD "$MINIO_PASS"
    set_env STORAGE_ENDPOINT    "http://minio:9000"
    set_env STORAGE_REGION      "us-east-1"
    set_env STORAGE_ACCESS_KEY_ID      "minioadmin"
    set_env STORAGE_SECRET_ACCESS_KEY  "$MINIO_PASS"
    set_env STORAGE_ATTACHMENTS_BUCKET "ui-syncup-attachments"
    set_env STORAGE_MEDIA_BUCKET       "ui-syncup-media"
    set_env STORAGE_ATTACHMENTS_PUBLIC_URL "${APP_URL}/storage/attachments"
    set_env STORAGE_MEDIA_PUBLIC_URL       "${APP_URL}/storage/media"
  else
    read -r -p "Storage endpoint URL: " S_EP
    read -r -p "Storage access key ID: " S_KEY
    read -r -p "Storage secret access key: " S_SECRET
    set_env STORAGE_ENDPOINT        "$S_EP"
    set_env STORAGE_ACCESS_KEY_ID   "$S_KEY"
    set_env STORAGE_SECRET_ACCESS_KEY "$S_SECRET"
  fi

  # Record COMPOSE_PROFILES so bare `docker compose up -d` works on re-runs
  PROFILES_STR="$(IFS=,; echo "${PROFILES[*]:-}")"
  set_env COMPOSE_PROFILES "$PROFILES_STR"

  # ── Write .env ─────────────────────────────────────────────────────────────
  write_env_file
  success ".env written (permissions: 0600)"

  # ── Start the stack ────────────────────────────────────────────────────────
  info "Starting UI SyncUp..."
  PROFILE_FLAGS=()
  for p in "${PROFILES[@]:-}"; do
    PROFILE_FLAGS+=("--profile" "$p")
  done
  docker compose -f compose.yml "${PROFILE_FLAGS[@]}" up -d

  success "UI SyncUp is running!"
  info "Open: ${APP_URL}"
  [[ ${#PROFILES[@]} -gt 0 ]] && info "Active profiles: ${PROFILES_STR}"
}

main "$@"
```

**Step 2: Verify syntax**

```bash
bash -n install.sh && echo "PASS: syntax OK"
```

**Step 3: Commit**

```bash
git add install.sh
git commit -m "feat: refactor install.sh to Docker-native wizard (no bun required)"
```

---

### Task 9: Semantic Release Configuration

**Files:**
- Create: `.releaserc.json`
- Modify: `package.json` (add semantic-release devDependencies)

**Step 1: Install semantic-release plugins**

```bash
bun add -d semantic-release \
  @semantic-release/commit-analyzer \
  @semantic-release/release-notes-generator \
  @semantic-release/changelog \
  @semantic-release/git \
  @semantic-release/github
```

**Step 2: Create `.releaserc.json`**

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/changelog", { "changelogFile": "CHANGELOG.md" }],
    ["@semantic-release/git", {
      "assets": ["CHANGELOG.md"],
      "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
    }],
    "@semantic-release/github"
  ]
}
```

**Note:** `@semantic-release/npm` is intentionally NOT included. CLI npm publishing is handled by the `publish-cli` job in `release.yml`. semantic-release only handles versioning, CHANGELOG, and GitHub Release.

**Step 3: Validate config JSON is well-formed**

```bash
node -e "JSON.parse(require('fs').readFileSync('.releaserc.json','utf8'))" && echo "PASS: valid JSON"
```

**Step 4: Commit**

```bash
git add .releaserc.json package.json bun.lock
git commit -m "chore: add semantic-release configuration for automated changelog and versioning"
```

---

## Phase 3 — Community Files (Task 10)

---

### Task 10: Community Files

**Files:**
- Create: `CONTRIBUTING.md`
- Create: `CODE_OF_CONDUCT.md`
- Create: `SECURITY.md`
- Create: `.github/ISSUE_TEMPLATE/bug_report.yml`
- Create: `.github/ISSUE_TEMPLATE/feature_request.yml`
- Create: `.github/PULL_REQUEST_TEMPLATE.md`

**Step 1: Create `CONTRIBUTING.md`**

```markdown
# Contributing to UI SyncUp

Thank you for contributing! All contributions are welcome.

## Development Setup

```bash
git clone https://github.com/BYKHD/ui-syncup.git
cd ui-syncup
bun install
cp .env.example .env.local
# Fill in required vars (DATABASE_URL, REDIS_URL, etc.)
bun run dev
```

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Effect |
|--------|--------|
| `feat:` | Minor version bump |
| `fix:` | Patch version bump |
| `feat!:` / `BREAKING CHANGE:` | Major version bump |
| `chore:`, `docs:`, `ci:` | No version bump |

## Pull Request Process

1. Fork and create your branch from `main`
2. Run `bun run lint && bun run typecheck && bun run test` — all must pass
3. Open a PR using the PR template
4. Wait for CI to pass and a maintainer review
```

**Step 2: Create `CODE_OF_CONDUCT.md`**

```markdown
# Contributor Covenant Code of Conduct

## Our Pledge

We pledge to make participation in our project and community a harassment-free
experience for everyone, regardless of age, body size, disability, ethnicity,
gender identity, level of experience, nationality, personal appearance, race,
religion, or sexual identity and orientation.

## Our Standards

Positive behavior: welcoming language, respectful disagreement, constructive feedback.

Unacceptable behavior: harassment, trolling, personal attacks, publishing private information.

## Enforcement

Report violations to the project maintainers. All reports will be reviewed promptly
and handled confidentially.

Full version: https://www.contributor-covenant.org/version/2/1/code_of_conduct/
```

**Step 3: Create `SECURITY.md`**

```markdown
# Security Policy

## Reporting a Vulnerability

**Do not** open a public GitHub issue for security vulnerabilities.

Please report via a [GitHub Private Security Advisory](https://github.com/BYKHD/ui-syncup/security/advisories/new).

We will respond within 72 hours and coordinate a fix and disclosure timeline.

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | ✅ |
| < 0.2   | ❌ |
```

**Step 4: Create `.github/ISSUE_TEMPLATE/bug_report.yml`**

```yaml
name: Bug Report
description: Something isn't working as expected
labels: ["bug"]
body:
  - type: input
    id: version
    attributes:
      label: UI SyncUp Version
      placeholder: "0.2.4"
    validations:
      required: true
  - type: textarea
    id: description
    attributes:
      label: Describe the bug
    validations:
      required: true
  - type: textarea
    id: reproduce
    attributes:
      label: Steps to reproduce
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected behavior
    validations:
      required: true
  - type: textarea
    id: environment
    attributes:
      label: Environment (OS, Docker version, deploy method)
```

**Step 5: Create `.github/ISSUE_TEMPLATE/feature_request.yml`**

```yaml
name: Feature Request
description: Suggest an idea for UI SyncUp
labels: ["enhancement"]
body:
  - type: textarea
    id: problem
    attributes:
      label: What problem does this solve?
    validations:
      required: true
  - type: textarea
    id: solution
    attributes:
      label: Proposed solution
    validations:
      required: true
  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives you have considered
```

**Step 6: Create `.github/PULL_REQUEST_TEMPLATE.md`**

```markdown
## Summary

<!-- What does this PR do? One paragraph. -->

## Type of Change

- [ ] Bug fix (`fix:`)
- [ ] New feature (`feat:`)
- [ ] Breaking change (`feat!:` / `BREAKING CHANGE:`)
- [ ] Chore / maintenance (`chore:`, `ci:`, `docs:`)

## Testing

- [ ] `bun run lint` passes
- [ ] `bun run typecheck` passes
- [ ] `bun run test` passes
- [ ] Tested manually (describe how below)

## Checklist

- [ ] Commit messages follow conventional commits format
- [ ] No secrets or sensitive data included
- [ ] Relevant docs updated (if applicable)
```

**Step 7: Commit all community files**

```bash
mkdir -p .github/ISSUE_TEMPLATE
git add CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md \
  .github/ISSUE_TEMPLATE/ .github/PULL_REQUEST_TEMPLATE.md
git commit -m "docs: add community files (CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, issue templates)"
```

---

## Final Verification Checklist

Run these after all tasks are complete:

```bash
# Compose
docker compose -f docker/compose.yml config --quiet && echo "✔ compose valid"
docker compose -f docker/compose.yml config --services

# Docker build
docker build -t ui-syncup-smoke . && echo "✔ docker build"

# CLI
node cli/dist/index.cjs --help
node cli/dist/index.cjs --version

# Typecheck
bun run typecheck && echo "✔ typecheck"

# Scripts
bash -n install.sh && echo "✔ install.sh syntax"

# Release config
node -e "JSON.parse(require('fs').readFileSync('.releaserc.json','utf8'))" && echo "✔ .releaserc.json valid"

# No stale references
grep -r "docker-compose\.minio\|docker-compose\.override" \
  --include="*.{json,sh,yml,ts,md}" --exclude-dir=node_modules . \
  && echo "FAIL: stale refs found" || echo "✔ no stale refs"
```

---

## Manual Steps (not automatable in this plan)

1. **Docker Hub:** Create `bykhd/ui-syncup` repository at hub.docker.com
2. **GitHub Secrets:** Add `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `NPM_TOKEN` to repo settings
3. **npm name check:** `npm info ui-syncup` — if taken, use `@bykhd/ui-syncup` (scoped) and update `cli/package.json` + release workflow accordingly
4. **README badges:** Add Docker Hub + GHCR badge lines to `README.md` after first successful release

---

## Phases Summary

| Phase | Tasks | Gate |
|-------|-------|------|
| P1 Foundation | 1–7 | Docker build + CLI smoke + typecheck pass |
| P2 Polish | 8–9 | `bash -n install.sh` + `.releaserc.json` valid |
| P3 Community | 10 | All files committed |
| Manual | — | Docker Hub setup, GitHub secrets, npm name check |
