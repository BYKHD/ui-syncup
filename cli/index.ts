#!/usr/bin/env node
import { Command } from 'commander'
import { initCommand } from './src/commands/init.js'
import { upgradeCommand } from './src/commands/upgrade.js'
import { doctorCommand } from './src/commands/doctor.js'

const DEFAULT_COMPOSE = 'compose.yml'

const program = new Command()
  .name('ui-syncup')
  .description('Self-host UI SyncUp with a single command')
  .version('0.2.4')

program
  .command('init')
  .description('Guided setup: download compose file, configure services, start the stack')
  .action(initCommand)

program
  .command('upgrade')
  .description('Pull latest image and restart the stack (migrations run automatically)')
  .option('-f, --file <path>', 'Path to compose file', DEFAULT_COMPOSE)
  .action(({ file }) => upgradeCommand(file))

program
  .command('doctor')
  .description('Validate environment, service health, and disk space')
  .action(doctorCommand)

program.parse()
