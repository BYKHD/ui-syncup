import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { confirm } from '@inquirer/prompts'
import { ui } from '../lib/ui.js'
import { isDockerRunning, runCompose } from '../lib/docker.js'
import { parseEnv } from '../lib/env.js'

export async function restoreCommand(composeFile: string, archivePath: string): Promise<void> {
  ui.header('UI SyncUp — Restore')

  if (!isDockerRunning()) {
    ui.error('Docker is not running.')
    process.exit(1)
  }

  const resolvedArchive = resolve(archivePath)
  if (!existsSync(resolvedArchive)) {
    ui.error(`Archive not found: ${resolvedArchive}`)
    process.exit(1)
  }

  ui.warn('Restore will overwrite current data. The app container will be stopped briefly.')
  const confirmed = await confirm({ message: 'Continue with restore?' })
  if (!confirmed) {
    ui.info('Aborted.')
    return
  }

  const tmpDir = `/tmp/ui-syncup-restore-${Date.now()}`
  mkdirSync(tmpDir, { recursive: true })

  ui.step(1, 3, 'Extracting archive...')
  const extract = spawnSync('tar', ['-xzf', resolvedArchive, '-C', tmpDir])
  if (extract.status !== 0) {
    ui.error('Failed to extract archive')
    rmSync(tmpDir, { recursive: true })
    process.exit(1)
  }

  const entries = readdirSync(tmpDir)
  const backupDir = join(tmpDir, entries[0])
  const vars = existsSync('.env') ? parseEnv('.env') : {}
  const profiles = (vars['COMPOSE_PROFILES'] ?? '').split(',').filter(Boolean)

  // Stop app before restore to prevent writes during restore
  runCompose(composeFile, ['stop', 'app'])

  // Restore PostgreSQL
  const sqlFile = join(backupDir, 'postgres.sql')
  if (existsSync(sqlFile) && profiles.includes('db')) {
    ui.step(2, 3, 'Restoring PostgreSQL...')
    const result = spawnSync(
      'bash',
      ['-c', `docker compose -f ${composeFile} exec -T postgres psql -U postgres < "${sqlFile}"`],
      { stdio: 'inherit' }
    )
    if (result.status === 0) {
      ui.success('PostgreSQL restored')
    } else {
      ui.error('PostgreSQL restore failed — check: ui-syncup logs postgres')
    }
  }

  // Restore MinIO
  const minioArchive = join(backupDir, 'minio_data.tar.gz')
  if (existsSync(minioArchive) && profiles.includes('storage')) {
    ui.step(3, 3, 'Restoring MinIO volume...')
    spawnSync('docker', [
      'run', '--rm',
      '-v', 'ui-syncup_minio_data:/volume',
      '-v', `${backupDir}:/backup`,
      'alpine',
      'sh', '-c', 'tar xzf /backup/minio_data.tar.gz -C /volume',
    ], { stdio: 'inherit' })
    ui.success('MinIO volume restored')
  }

  rmSync(tmpDir, { recursive: true })

  ui.step(3, 3, 'Restarting stack...')
  runCompose(composeFile, ['up', '-d'])
  ui.success('Restore complete. Stack is running.')
}
