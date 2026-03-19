import { confirm } from '@inquirer/prompts'
import { ui } from '../lib/ui.js'
import { isDockerRunning, runCompose } from '../lib/docker.js'

export async function removeCommand(composeFile: string, withVolumes: boolean): Promise<void> {
  ui.header('UI SyncUp — Remove')

  if (!isDockerRunning()) {
    ui.error('Docker is not running.')
    process.exit(1)
  }

  if (withVolumes) {
    ui.warn('This permanently deletes ALL data: database, storage, and cache volumes.')
  } else {
    ui.warn('This stops and removes containers. Data volumes will be preserved.')
  }

  const confirmed = await confirm({
    message: withVolumes
      ? 'Delete all data and remove the stack?'
      : 'Remove the stack (keep data volumes)?',
  })

  if (!confirmed) {
    ui.info('Aborted.')
    return
  }

  const args = ['down']
  if (withVolumes) args.push('--volumes')

  const result = runCompose(composeFile, args)
  if (!result.success) {
    ui.error('Remove failed')
    process.exit(1)
  }

  ui.success(
    withVolumes
      ? 'Stack and all data removed.'
      : 'Stack removed. Data volumes preserved. Run: ui-syncup start to restart.'
  )
}
