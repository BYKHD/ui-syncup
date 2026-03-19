import { existsSync } from 'node:fs'
import { ui } from '../lib/ui.js'
import { isDockerRunning, runCompose } from '../lib/docker.js'
import { parseEnv } from '../lib/env.js'

export async function startCommand(composeFile: string): Promise<void> {
  ui.header('UI SyncUp — Start')

  if (!isDockerRunning()) {
    ui.error('Docker is not running.')
    process.exit(1)
  }

  const profiles = existsSync('.env')
    ? (parseEnv('.env')['COMPOSE_PROFILES'] ?? '').split(',').filter(Boolean)
    : []

  ui.info('Starting stack...')
  const result = runCompose(composeFile, ['up', '-d'], profiles)
  if (!result.success) {
    ui.error('Failed to start stack — check logs with: ui-syncup logs')
    process.exit(1)
  }

  ui.success('Stack is running.')
}
