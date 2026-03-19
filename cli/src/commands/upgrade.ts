import ora from 'ora'
import { ui } from '../lib/ui.js'
import { isDockerRunning, runCompose } from '../lib/docker.js'

export async function upgradeCommand(composeFile: string): Promise<void> {
  ui.header('UI SyncUp — Upgrade')

  if (!isDockerRunning()) {
    ui.error('Docker is not running.')
    process.exit(1)
  }

  const pull = ora('Pulling latest image...').start()
  const pullResult = runCompose(composeFile, ['pull'], [], true)
  if (!pullResult.success) {
    pull.fail('docker compose pull failed')
    process.exit(1)
  }
  pull.succeed('Latest image pulled')

  const up = ora('Restarting stack (migrations run automatically)...').start()
  const upResult = runCompose(composeFile, ['up', '-d', '--remove-orphans'], [], true)
  if (!upResult.success) {
    up.fail('Stack restart failed — check logs with: ui-syncup logs')
    process.exit(1)
  }
  up.succeed('Upgrade complete. Migrations applied.')
}
