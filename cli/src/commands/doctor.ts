import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { ui } from '../lib/ui.js'
import { parseEnv, getMissingVars, ENV_EXAMPLE_URL } from '../lib/env.js'
import { isDockerRunning } from '../lib/docker.js'

export async function doctorCommand(): Promise<void> {
  ui.header('UI SyncUp — Doctor')
  let allGood = true

  // Check 1: Docker daemon
  ui.info('Checking Docker daemon...')
  if (isDockerRunning()) {
    ui.success('Docker is running')
  } else {
    ui.error('Docker is not running')
    allGood = false
  }

  // Check 2: Required env vars
  ui.info('Checking .env required variables...')
  if (!existsSync('.env')) {
    ui.error('.env not found. Run: npx ui-syncup init')
    allGood = false
  } else {
    const vars = parseEnv('.env')
    const missing = getMissingVars(vars)
    if (missing.length === 0) {
      ui.success('All required env vars present')
    } else {
      for (const k of missing) {
        ui.error(`Missing: ${k} — see ${ENV_EXAMPLE_URL}`)
      }
      allGood = false
    }
  }

  // Check 3: Health endpoint
  ui.info('Checking /api/health...')
  try {
    const vars = existsSync('.env') ? parseEnv('.env') : {}
    const appUrl = vars['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000'
    const raw = execSync(`curl -sf "${appUrl}/api/health"`, {
      encoding: 'utf-8',
      timeout: 5000,
    })
    const json = JSON.parse(raw)
    if (json.status === 'ok') {
      ui.success(`Health OK — version: ${json.version}`)
    } else {
      ui.warn(`Health returned status: ${json.status}`)
    }
  } catch {
    ui.error('Health endpoint unreachable — is the stack running?')
    allGood = false
  }

  // Check 4: Disk space (require >= 2 GB free)
  ui.info('Checking disk space...')
  try {
    const dfOut = execSync("df -k . | awk 'NR==2{print $4}'", {
      encoding: 'utf-8',
    }).trim()
    const freeGB = parseInt(dfOut, 10) / 1024 / 1024
    if (freeGB >= 2) {
      ui.success(`Disk space OK — ${freeGB.toFixed(1)} GB free`)
    } else {
      ui.warn(`Low disk space — ${freeGB.toFixed(1)} GB free (recommend >= 2 GB)`)
      allGood = false
    }
  } catch {
    ui.warn('Could not check disk space')
  }

  console.log('')
  if (allGood) {
    ui.success('All checks passed.')
  } else {
    ui.error('Some checks failed — see above.')
    process.exit(1)
  }
}
