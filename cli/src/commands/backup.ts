import { execSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { ui } from '../lib/ui.js'
import { isDockerRunning } from '../lib/docker.js'
import { parseEnv } from '../lib/env.js'

export async function backupCommand(composeFile: string, outputDir: string): Promise<void> {
  ui.header('UI SyncUp — Backup')

  if (!isDockerRunning()) {
    ui.error('Docker is not running.')
    process.exit(1)
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const label = `ui-syncup-backup-${timestamp}`
  const backupDir = resolve(outputDir, label)
  mkdirSync(backupDir, { recursive: true })

  const vars = existsSync('.env') ? parseEnv('.env') : {}
  const profiles = (vars['COMPOSE_PROFILES'] ?? '').split(',').filter(Boolean)
  let backedUp = false

  // PostgreSQL
  if (profiles.includes('db')) {
    ui.info('Dumping PostgreSQL...')
    try {
      const dump = execSync(
        `docker compose -f ${composeFile} exec -T postgres pg_dumpall -U postgres`,
        { encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024 }
      )
      writeFileSync(`${backupDir}/postgres.sql`, dump)
      ui.success('PostgreSQL dump saved')
      backedUp = true
    } catch {
      ui.warn('PostgreSQL backup failed — is the db container running?')
    }
  } else {
    ui.info('Skipping PostgreSQL (db profile not active)')
  }

  // MinIO — tar the Docker volume directly via alpine helper container
  if (profiles.includes('storage')) {
    ui.info('Exporting MinIO volume...')
    const result = spawnSync('docker', [
      'run', '--rm',
      '-v', 'ui-syncup_minio_data:/volume',
      '-v', `${backupDir}:/backup`,
      'alpine',
      'tar', 'czf', '/backup/minio_data.tar.gz', '-C', '/volume', '.',
    ], { stdio: 'inherit' })
    if (result.status === 0) {
      ui.success('MinIO volume exported')
      backedUp = true
    } else {
      ui.warn('MinIO backup failed — is the storage profile running?')
    }
  } else {
    ui.info('Skipping MinIO (storage profile not active)')
  }

  if (!backedUp) {
    ui.warn('No data services active. Set COMPOSE_PROFILES=db,storage in .env to enable backups.')
    rmSync(backupDir, { recursive: true })
    return
  }

  // Create final archive
  const archivePath = resolve(outputDir, `${label}.tar.gz`)
  spawnSync('tar', ['-czf', archivePath, '-C', resolve(outputDir), label], { stdio: 'inherit' })
  rmSync(backupDir, { recursive: true })

  ui.success(`Backup saved → ${archivePath}`)
  console.log('')
  ui.info(`To restore: ui-syncup restore ${archivePath}`)
}
