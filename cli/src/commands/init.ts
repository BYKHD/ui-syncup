import { existsSync, writeFileSync, unlinkSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { select, input, confirm } from '@inquirer/prompts'
import { ui } from '../lib/ui.js'
import { generateSecret, writeEnv, parseEnv } from '../lib/env.js'
import { isDockerRunning, runCompose } from '../lib/docker.js'
import { buildStandaloneOverride } from '../lib/compose-override.js'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version } = require('../../package.json') as { version: string }

const COMPOSE_URL =
  'https://raw.githubusercontent.com/BYKHD/ui-syncup/main/docker/compose.yml'
const ENV_EXAMPLE_URL =
  'https://raw.githubusercontent.com/BYKHD/ui-syncup/main/.env.example'

export async function initCommand(): Promise<void> {
  ui.banner(version)
  ui.header('Setup Wizard 🪄')

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

  const deploymentMode = await select({
    message: 'Deployment mode:',
    choices: [
      {
        name: 'Standalone (direct IP / domain, no reverse proxy)',
        value: 'standalone',
      },
      {
        name: 'Behind reverse proxy (Dokploy / Coolify / Traefik / Caddy)',
        value: 'proxy',
      },
    ],
  })

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

  // Store active profiles in .env so bare `docker compose up -d` re-runs work
  envVars['COMPOSE_PROFILES'] = profiles.join(',')

  // Step 5: Write .env
  ui.step(5, 6, 'Writing .env...')
  writeEnv('.env', envVars)
  ui.success('.env written (permissions: 0600)')

  // Write or remove compose.override.yml based on deployment mode.
  // Docker Compose merges this file with compose.yml when both are passed via -f,
  // adding host port publishing only when no reverse proxy is present.
  const overrideFile = 'compose.override.yml'
  if (deploymentMode === 'standalone') {
    const port = envVars['PORT'] || '3000'
    writeFileSync(overrideFile, buildStandaloneOverride(port))
    ui.success(`Generated ${overrideFile} — port ${port} will be published to host`)
  } else {
    if (existsSync(overrideFile)) {
      unlinkSync(overrideFile)
      ui.info(`Removed ${overrideFile} — traffic routed via reverse proxy`)
    }
  }

  // Step 6: Start the stack
  ui.step(6, 6, 'Starting UI SyncUp...')
  const result = runCompose('compose.yml', ['up', '-d'], profiles, false, overrideFile)
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
