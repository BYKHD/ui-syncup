import { ui } from '../lib/ui.js'
import { isDockerRunning, runCompose } from '../lib/docker.js'

export async function restartCommand(composeFile: string, service?: string): Promise<void> {
  ui.header('UI SyncUp — Restart')

  if (!isDockerRunning()) {
    ui.error('Docker is not running.')
    process.exit(1)
  }

  const args = service ? ['restart', service] : ['restart']
  ui.info(service ? `Restarting ${service}...` : 'Restarting all services...')
  const result = runCompose(composeFile, args)
  if (!result.success) {
    ui.error('Restart failed')
    process.exit(1)
  }

  ui.success('Restart complete.')
}
