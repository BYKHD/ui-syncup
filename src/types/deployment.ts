/**
 * Deployment metadata types for Vercel environment
 */

export type DeploymentEnvironment = 'production' | 'preview' | 'development'

export interface DeploymentInfo {
  environment: DeploymentEnvironment
  branch: string
  commitSha: string
  commitMessage: string
  deploymentUrl: string
  timestamp: string
  vercelEnv: string
  vercelUrl: string
  vercelGitCommitRef: string
  vercelGitCommitSha: string
}

/**
 * Get deployment information from Vercel system environment variables
 * @returns Deployment metadata object
 */
export function getDeploymentInfo(): DeploymentInfo {
  return {
    environment: (process.env.VERCEL_ENV as DeploymentEnvironment) || 'development',
    branch: process.env.VERCEL_GIT_COMMIT_REF || 'local',
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    commitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE || '',
    deploymentUrl: process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000',
    timestamp: new Date().toISOString(),
    vercelEnv: process.env.VERCEL_ENV || 'development',
    vercelUrl: process.env.VERCEL_URL || '',
    vercelGitCommitRef: process.env.VERCEL_GIT_COMMIT_REF || '',
    vercelGitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA || '',
  }
}
