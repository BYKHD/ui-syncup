import { existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { select, input, confirm } from '@inquirer/prompts'
import { ui } from '../lib/ui.js'
import { generateSecret, writeEnv, parseEnv } from '../lib/env.js'
import { isDockerRunning, runCompose, volumeExists, removeVolume } from '../lib/docker.js'
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
    const projectName = process.env['COMPOSE_PROJECT_NAME'] || 'ui-syncup'
    const pgVolume = `${projectName}_postgres_data`
    const volumeAlreadyExists = volumeExists(pgVolume)
    if (volumeAlreadyExists) {
      ui.warn(`Existing PostgreSQL volume detected (${pgVolume}).`)
      ui.warn('The password you enter MUST match the one used when the volume was first created.')
      ui.warn('If you changed the password, choose "Reset" to wipe the volume and start fresh.')
      const resetChoice = await select({
        message: 'How do you want to proceed?',
        choices: [
          { name: 'Keep existing volume (enter the original password)', value: 'keep' },
          { name: 'Reset volume — wipe all data and reinitialise (irreversible)', value: 'reset' },
        ],
      })
      if (resetChoice === 'reset') {
        const confirmed = await confirm({
          message: `Delete volume "${pgVolume}" and all its data? This cannot be undone.`,
          default: false,
        })
        if (confirmed) {
          if (!removeVolume(pgVolume)) {
            ui.error(`Failed to remove volume ${pgVolume}. Is the container still running?`)
            process.exit(1)
          }
          ui.success(`Volume ${pgVolume} removed — will be reinitialised with the new password.`)
        } else {
          ui.info('Reset cancelled — keeping existing volume. Enter the original password below.')
        }
      }
    }
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
      { name: 'Resend (recommended for production)', value: 'resend' },
      { name: 'SMTP — custom server (SendGrid, Postmark, etc.)', value: 'smtp' },
      { name: 'Mailpit — bundled SMTP catcher (dev/test only)', value: 'mailpit' },
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
  } else if (emailChoice === 'mailpit') {
    profiles.push('mail')
    envVars['SMTP_HOST'] = 'mailpit'
    envVars['SMTP_PORT'] = '1025'
    envVars['SMTP_USER'] = ''
    envVars['SMTP_PASSWORD'] = ''
    envVars['SMTP_FROM_EMAIL'] = 'noreply@localhost'
    envVars['SMTP_SECURE'] = 'false'
  }

  // Store active profiles in .env so bare `docker compose up -d` re-runs work
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
  if (profiles.includes('mail')) {
    ui.info('Mailpit inbox: http://localhost:8025')
  }
  if (profiles.length > 0) {
    ui.info(`Active profiles: ${profiles.join(', ')}`)
  }
}
