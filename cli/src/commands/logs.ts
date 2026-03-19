import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { ui } from '../lib/ui.js'
import { isDockerRunning } from '../lib/docker.js'

export async function logsCommand(
  composeFile: string,
  service: string | undefined,
  follow: boolean
): Promise<void> {
  if (!isDockerRunning()) {
    ui.error('Docker is not running.')
    process.exit(1)
  }

  if (!existsSync(composeFile)) {
    ui.error(`Compose file not found: ${composeFile}. Run: ui-syncup init`)
    process.exit(1)
  }

  const args = ['compose', '-f', composeFile, 'logs', '--tail=200']
  if (follow) args.push('--follow')
  if (service) args.push(service)

  spawnSync('docker', args, { stdio: 'inherit' })
}
