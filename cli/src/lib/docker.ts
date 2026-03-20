import { execSync, spawnSync } from 'node:child_process'

export function isDockerRunning(): boolean {
  try {
    execSync('docker info', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

export function runCompose(
  composeFile: string,
  args: string[],
  profiles: string[] = [],
  quiet = false
): { success: boolean } {
  const profileFlags = profiles.flatMap(p => ['--profile', p])
  const cmd = ['docker', 'compose', '-f', composeFile, ...profileFlags, ...args]
  const result = spawnSync(cmd[0], cmd.slice(1), { stdio: quiet ? 'pipe' : 'inherit' })
  return { success: result.status === 0 }
}
