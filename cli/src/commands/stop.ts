import { ui } from '../lib/ui.js'
import { isDockerRunning, runCompose } from '../lib/docker.js'

export async function stopCommand(composeFile: string): Promise<void> {
  ui.header('UI SyncUp — Stop')

  if (!isDockerRunning()) {
    ui.error('Docker is not running.')
    process.exit(1)
  }

  ui.info('Stopping stack...')
  const result = runCompose(composeFile, ['stop'])
  if (!result.success) {
    ui.error('Failed to stop stack')
    process.exit(1)
  }

  ui.success('Stack stopped. Data preserved — run: ui-syncup start to resume.')
}
