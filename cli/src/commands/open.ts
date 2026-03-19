import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { ui } from '../lib/ui.js'
import { parseEnv } from '../lib/env.js'

export async function openCommand(): Promise<void> {
  const vars = existsSync('.env') ? parseEnv('.env') : {}
  const port = vars['PORT'] || '3000'
  const url = vars['NEXT_PUBLIC_APP_URL'] || `http://localhost:${port}`

  ui.info(`Opening ${url}...`)

  const cmd =
    process.platform === 'darwin' ? 'open' :
    process.platform === 'win32'  ? 'start' :
    'xdg-open'

  try {
    execSync(`${cmd} "${url}"`, { stdio: 'ignore' })
  } catch {
    ui.warn(`Could not open browser automatically. Visit: ${url}`)
  }
}
