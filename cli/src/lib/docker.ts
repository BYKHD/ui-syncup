import { execSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

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
  quiet = false,
  overrideFile?: string,
): { success: boolean } {
  const overrideFlags =
    overrideFile && existsSync(overrideFile) ? ['-f', overrideFile] : []
  const profileFlags = profiles.flatMap(p => ['--profile', p])
  const cmd = ['docker', 'compose', '-f', composeFile, ...overrideFlags, ...profileFlags, ...args]
  const result = spawnSync(cmd[0], cmd.slice(1), { stdio: quiet ? 'pipe' : 'inherit' })
  return { success: result.status === 0 }
}
