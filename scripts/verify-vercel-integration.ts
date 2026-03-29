#!/usr/bin/env bun
/**
 * Vercel Integration Verification Script
 * 
 * This script helps verify that Vercel is properly configured for the CI/CD pipeline.
 * It checks:
 * - Git connection status
 * - Branch configuration
 * - Environment variables
 * 
 * Requirements validated: 2.2, 2.4, 3.3, 3.4, 5.5
 */

import { execSync } from 'child_process'

interface VerificationResult {
  check: string
  status: 'pass' | 'fail' | 'manual' | 'skip'
  message: string
  requirement?: string
}

const results: VerificationResult[] = []

function addResult(check: string, status: VerificationResult['status'], message: string, requirement?: string) {
  results.push({ check, status, message, requirement })
}

function printResults() {
  console.log('\n' + '='.repeat(80))
  console.log('VERCEL INTEGRATION VERIFICATION RESULTS')
  console.log('='.repeat(80) + '\n')

  const grouped = {
    pass: results.filter(r => r.status === 'pass'),
    fail: results.filter(r => r.status === 'fail'),
    manual: results.filter(r => r.status === 'manual'),
    skip: results.filter(r => r.status === 'skip'),
  }

  for (const [status, items] of Object.entries(grouped)) {
    if (items.length === 0) continue
    
    const icon = status === 'pass' ? '✓' : status === 'fail' ? '✗' : status === 'manual' ? '⚠' : '○'
    const color = status === 'pass' ? '\x1b[32m' : status === 'fail' ? '\x1b[31m' : status === 'manual' ? '\x1b[33m' : '\x1b[90m'
    const reset = '\x1b[0m'
    
    console.log(`${color}${status.toUpperCase()}${reset}`)
    items.forEach(item => {
      console.log(`  ${icon} ${item.check}`)
      console.log(`    ${item.message}`)
      if (item.requirement) {
        console.log(`    Validates: ${item.requirement}`)
      }
      console.log()
    })
  }

  console.log('='.repeat(80))
  console.log(`Summary: ${grouped.pass.length} passed, ${grouped.fail.length} failed, ${grouped.manual.length} require manual verification`)
  console.log('='.repeat(80) + '\n')
}

async function checkVercelCLI(): Promise<boolean> {
  try {
    execSync('vercel --version', { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

async function checkGitRemote(): Promise<void> {
  try {
    const remote = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim()
    if (remote.includes('github.com')) {
      addResult(
        'Git Remote',
        'pass',
        `Repository is hosted on GitHub: ${remote}`,
        'Requirements 2.2, 3.3'
      )
    } else {
      addResult(
        'Git Remote',
        'fail',
        `Repository is not on GitHub: ${remote}`,
        'Requirements 2.2, 3.3'
      )
    }
  } catch {
    addResult(
      'Git Remote',
      'fail',
      'Could not determine git remote',
      'Requirements 2.2, 3.3'
    )
  }
}

async function checkVercelProject(): Promise<void> {
  const hasVercelCLI = await checkVercelCLI()
  
  if (!hasVercelCLI) {
    addResult(
      'Vercel CLI',
      'manual',
      'Vercel CLI not installed. Install with: npm i -g vercel\nOr verify manually in Vercel dashboard',
      'Requirements 2.2, 3.3'
    )
    return
  }

  try {
    // Check if project is linked
    execSync('vercel project ls --json 2>/dev/null || echo "[]"', {
      encoding: 'utf-8',
      stdio: 'pipe'
    })
    
    addResult(
      'Vercel Project Link',
      'manual',
      'Please verify in Vercel dashboard:\n' +
      '    1. Go to https://vercel.com/dashboard\n' +
      '    2. Select your project\n' +
      '    3. Go to Settings → Git\n' +
      '    4. Verify GitHub repository is connected',
      'Requirements 2.2, 3.3'
    )
  } catch {
    addResult(
      'Vercel Project Link',
      'manual',
      'Could not check Vercel project. Please verify manually in Vercel dashboard',
      'Requirements 2.2, 3.3'
    )
  }
}

async function checkBranchConfiguration(): Promise<void> {
  addResult(
    'Production Branch Configuration',
    'manual',
    'Please verify in Vercel dashboard:\n' +
    '    1. Go to Settings → Git\n' +
    '    2. Confirm "Production Branch" is set to "main"\n' +
    '    3. Confirm "Preview Deployments" is enabled for all branches',
    'Requirements 2.2, 3.3'
  )
}

async function checkEnvironmentVariables(): Promise<void> {
  const requiredEnvVars = {
    preview: [
      'DEV_DATABASE_URL',
      'DEV_DIRECT_URL',
    ],
    production: [
      'PROD_DATABASE_URL',
      'PROD_DIRECT_URL',
    ],
  }

  addResult(
    'Preview Environment Variables',
    'manual',
    'Please verify in Vercel dashboard:\n' +
    '    1. Go to Settings → Environment Variables\n' +
    '    2. For "Preview" environment, confirm these variables exist:\n' +
    `       ${requiredEnvVars.preview.map(v => `- ${v}`).join('\n       ')}\n` +
    '    3. Verify all other required environment variables are configured',
    'Requirements 2.4, 5.5'
  )

  addResult(
    'Production Environment Variables',
    'manual',
    'Please verify in Vercel dashboard:\n' +
    '    1. Go to Settings → Environment Variables\n' +
    '    2. For "Production" environment, confirm these variables exist:\n' +
    `       ${requiredEnvVars.production.map(v => `- ${v}`).join('\n       ')}\n` +
    '    3. Verify all other required environment variables are configured',
    'Requirements 3.4, 5.5'
  )
}

async function checkLocalEnvFiles(): Promise<void> {
  const envFiles = [
    '.env.development',
    '.env.production',
    '.env.local',
    '.env.example',
  ]

  const existingFiles: string[] = []
  
  for (const file of envFiles) {
    try {
      const fs = await import('fs')
      if (fs.existsSync(file)) {
        existingFiles.push(file)
      }
    } catch {
      // File doesn't exist
    }
  }

  if (existingFiles.length > 0) {
    addResult(
      'Local Environment Files',
      'pass',
      `Found local environment files: ${existingFiles.join(', ')}\n` +
      '    Ensure these are referenced when configuring Vercel environment variables',
      'Requirements 2.4, 3.4, 5.5'
    )
  } else {
    addResult(
      'Local Environment Files',
      'manual',
      'No local environment files found. Ensure Vercel environment variables are configured correctly',
      'Requirements 2.4, 3.4, 5.5'
    )
  }
}

async function checkGitHubWorkflows(): Promise<void> {
  try {
    const fs = await import('fs')
    const ciExists = fs.existsSync('.github/workflows/ci.yml')
    const deployExists = fs.existsSync('.github/workflows/deploy.yml')

    if (ciExists && deployExists) {
      addResult(
        'GitHub Workflows',
        'pass',
        'CI and Deploy workflows are configured. These will trigger Vercel deployments',
        'Requirements 2.2, 3.3'
      )
    } else {
      const missing = []
      if (!ciExists) missing.push('ci.yml')
      if (!deployExists) missing.push('deploy.yml')
      
      addResult(
        'GitHub Workflows',
        'fail',
        `Missing workflow files: ${missing.join(', ')}`,
        'Requirements 2.2, 3.3'
      )
    }
  } catch {
    addResult(
      'GitHub Workflows',
      'fail',
      'Could not check GitHub workflows',
      'Requirements 2.2, 3.3'
    )
  }
}

async function main() {
  console.log('\n🔍 Starting Vercel Integration Verification...\n')

  // Run all checks
  await checkGitRemote()
  await checkGitHubWorkflows()
  await checkVercelProject()
  await checkBranchConfiguration()
  await checkEnvironmentVariables()
  await checkLocalEnvFiles()

  // Print results
  printResults()

  // Provide next steps
  console.log('NEXT STEPS:')
  console.log('1. Complete all manual verification steps in the Vercel dashboard')
  console.log('2. If any checks failed, address them before proceeding')
  console.log('3. Test the integration by pushing to a feature branch')
  console.log('4. Verify preview deployment is created automatically')
  console.log('5. Merge to main and verify production deployment\n')

  // Exit with appropriate code
  const hasFailed = results.some(r => r.status === 'fail')
  process.exit(hasFailed ? 1 : 0)
}

main().catch(error => {
  console.error('Error running verification:', error)
  process.exit(1)
})
