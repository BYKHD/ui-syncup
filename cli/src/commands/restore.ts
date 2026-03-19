import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { confirm } from '@inquirer/prompts'
import ora from 'ora'
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

  const extractSpinner = ora('Extracting archive...').start()
  const extractResult = spawnSync('tar', ['-xzf', resolvedArchive, '-C', tmpDir])
  if (extractResult.status !== 0) {
    extractSpinner.fail('Failed to extract archive')
    rmSync(tmpDir, { recursive: true })
    process.exit(1)
  }
  extractSpinner.succeed('Archive extracted')

  const entries = readdirSync(tmpDir)
  const backupDir = join(tmpDir, entries[0])
  const vars = existsSync('.env') ? parseEnv('.env') : {}
  const profiles = (vars['COMPOSE_PROFILES'] ?? '').split(',').filter(Boolean)

  const stopSpinner = ora('Stopping app container...').start()
  runCompose(composeFile, ['stop', 'app'], [], true)
  stopSpinner.succeed('App container stopped')

  // Restore PostgreSQL
  const sqlFile = join(backupDir, 'postgres.sql')
  if (existsSync(sqlFile) && profiles.includes('db')) {
    const spinner = ora('Restoring PostgreSQL...').start()
    const result = spawnSync(
      'bash',
      ['-c', `docker compose -f ${composeFile} exec -T postgres psql -U postgres < "${sqlFile}"`],
      { stdio: 'pipe' }
    )
    if (result.status === 0) {
      spinner.succeed('PostgreSQL restored')
    } else {
      spinner.fail('PostgreSQL restore failed — check: ui-syncup logs postgres')
    }
  }

  // Restore MinIO
  const minioArchive = join(backupDir, 'minio_data.tar.gz')
  if (existsSync(minioArchive) && profiles.includes('storage')) {
    const spinner = ora('Restoring MinIO volume...').start()
    spawnSync('docker', [
      'run', '--rm',
      '-v', 'ui-syncup_minio_data:/volume',
      '-v', `${backupDir}:/backup`,
      'alpine',
      'sh', '-c', 'tar xzf /backup/minio_data.tar.gz -C /volume',
    ], { stdio: 'pipe' })
    spinner.succeed('MinIO volume restored')
  }

  rmSync(tmpDir, { recursive: true })

  const restartSpinner = ora('Restarting stack...').start()
  runCompose(composeFile, ['up', '-d'], [], true)
  restartSpinner.succeed('Stack restarted')

  console.log('')
  ui.success('Restore complete.')
}
