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
