#!/usr/bin/env node
import { Command } from 'commander'
import { initCommand } from './src/commands/init.js'
import { startCommand } from './src/commands/start.js'
import { stopCommand } from './src/commands/stop.js'
import { restartCommand } from './src/commands/restart.js'
import { statusCommand } from './src/commands/status.js'
import { logsCommand } from './src/commands/logs.js'
import { upgradeCommand } from './src/commands/upgrade.js'
import { backupCommand } from './src/commands/backup.js'
import { restoreCommand } from './src/commands/restore.js'
import { openCommand } from './src/commands/open.js'
import { removeCommand } from './src/commands/remove.js'
import { doctorCommand } from './src/commands/doctor.js'

const DEFAULT_COMPOSE = 'compose.yml'

const program = new Command()
  .name('ui-syncup')
  .description('Self-host UI SyncUp with a single command')
  .version('0.3.0')

program
  .command('init')
  .description('Guided setup: download compose file, configure services, start the stack')
  .action(initCommand)

program
  .command('start')
  .description('Start the stack (reads COMPOSE_PROFILES from .env)')
  .option('-f, --file <path>', 'Path to compose file', DEFAULT_COMPOSE)
  .action(({ file }) => startCommand(file))

program
  .command('stop')
  .description('Stop the stack gracefully (data is preserved)')
  .option('-f, --file <path>', 'Path to compose file', DEFAULT_COMPOSE)
  .action(({ file }) => stopCommand(file))

program
  .command('restart [service]')
  .description('Restart all services or a single one (app|postgres|redis|minio)')
  .option('-f, --file <path>', 'Path to compose file', DEFAULT_COMPOSE)
  .action((service, { file }) => restartCommand(file, service))

program
  .command('status')
  .description('Show container states, health, and app URL')
  .option('-f, --file <path>', 'Path to compose file', DEFAULT_COMPOSE)
  .action(({ file }) => statusCommand(file))

program
  .command('logs [service]')
  .description('Tail logs for all services or a single one (app|postgres|redis|minio)')
  .option('-f, --file <path>', 'Path to compose file', DEFAULT_COMPOSE)
  .option('-F, --follow', 'Stream logs (Ctrl+C to stop)', false)
  .action((service, { file, follow }) => logsCommand(file, service, follow))

program
  .command('upgrade')
  .description('Pull latest image and restart the stack (migrations run automatically)')
  .option('-f, --file <path>', 'Path to compose file', DEFAULT_COMPOSE)
  .action(({ file }) => upgradeCommand(file))

program
  .command('backup')
  .description('Dump PostgreSQL and MinIO to a timestamped .tar.gz archive')
  .option('-f, --file <path>', 'Path to compose file', DEFAULT_COMPOSE)
  .option('-o, --output <dir>', 'Directory to write the archive into', '.')
  .action(({ file, output }) => backupCommand(file, output))

program
  .command('restore <archive>')
  .description('Restore from a backup archive (stops app briefly during restore)')
  .option('-f, --file <path>', 'Path to compose file', DEFAULT_COMPOSE)
  .action((archive, { file }) => restoreCommand(file, archive))

program
  .command('open')
  .description('Open the app in your default browser')
  .action(openCommand)

program
  .command('remove')
  .description('Remove containers (add --volumes to also wipe all data)')
  .option('-f, --file <path>', 'Path to compose file', DEFAULT_COMPOSE)
  .option('--volumes', 'Also delete all data volumes (irreversible)', false)
  .action(({ file, volumes }) => removeCommand(file, volumes))

program
  .command('doctor')
  .description('Validate environment, service health, and disk space')
  .action(doctorCommand)

program.parse()
