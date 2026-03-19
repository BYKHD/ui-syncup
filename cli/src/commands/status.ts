import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { ui } from '../lib/ui.js'
import { isDockerRunning } from '../lib/docker.js'
import { parseEnv } from '../lib/env.js'

export async function statusCommand(composeFile: string): Promise<void> {
  if (!isDockerRunning()) {
    ui.error('Docker is not running.')
    process.exit(1)
  }

  if (!existsSync(composeFile)) {
    ui.error(`Compose file not found: ${composeFile}. Run: ui-syncup init`)
    process.exit(1)
  }

  spawnSync('docker', ['compose', '-f', composeFile, 'ps'], { stdio: 'inherit' })

  const vars = existsSync('.env') ? parseEnv('.env') : {}
  const port = vars['PORT'] || '3000'
  const appUrl = vars['NEXT_PUBLIC_APP_URL'] || `http://localhost:${port}`
  console.log('')
  ui.info(`App → ${appUrl}`)
}
