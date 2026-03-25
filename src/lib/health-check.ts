/**
 * Health Check Utilities
 * 
 * Validates external service connections for deployment health monitoring.
 * Used by the /api/health endpoint to verify system readiness.
 * 
 * @module lib/health-check
 */

import { db } from './db'
import { getStorageClient, getBucketName } from './storage'
import { authConfig } from './auth-config'
import { HeadBucketCommand } from '@aws-sdk/client-s3'

/**
 * Health check result for a single service
 */
export interface ServiceHealthResult {
  name: string
  status: 'healthy' | 'unhealthy'
  message?: string
  responseTime?: number
  error?: string
}

/**
 * Overall health check result
 */
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  services: ServiceHealthResult[]
  timestamp: string
}

/**
 * Validate database connection
 * 
 * Executes a simple query to verify PostgreSQL connectivity
 * and measure response time.
 */
export async function checkDatabase(): Promise<ServiceHealthResult> {
  const startTime = Date.now()
  
  try {
    // Execute simple query to verify connection
    await db.execute('SELECT 1 as health_check')
    
    const responseTime = Date.now() - startTime
    
    return {
      name: 'database',
      status: 'healthy',
      message: 'PostgreSQL connection successful',
      responseTime,
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    return {
      name: 'database',
      status: 'unhealthy',
      message: 'Failed to connect to PostgreSQL',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Validate storage connection
 *
 * Verifies the storage bucket is accessible by sending a HeadBucket request.
 */
export async function checkStorage(): Promise<ServiceHealthResult> {
  const startTime = Date.now()

  try {
    const command = new HeadBucketCommand({ Bucket: getBucketName() })
    await getStorageClient().send(command)

    const responseTime = Date.now() - startTime

    return {
      name: 'storage',
      status: 'healthy',
      message: `Storage bucket accessible (${getBucketName()})`,
      responseTime,
    }
  } catch (error) {
    const responseTime = Date.now() - startTime

    return {
      name: 'storage',
      status: 'unhealthy',
      message: 'Failed to access storage bucket',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Validate authentication configuration
 * 
 * Verifies that all required OAuth credentials are present
 * and properly configured. Does not make external API calls.
 */
export async function checkAuth(): Promise<ServiceHealthResult> {
  const startTime = Date.now()
  
  try {
    // Validate OAuth configuration
    const hasGoogleClientId = !!authConfig.providers.google.clientId
    const hasGoogleClientSecret = !!authConfig.providers.google.clientSecret
    const hasGoogleRedirectUri = !!authConfig.providers.google.redirectUri
    const hasAuthSecret = !!authConfig.session.secret
    const hasAuthUrl = !!authConfig.session.baseUrl
    
    if (!hasGoogleClientId || !hasGoogleClientSecret || !hasGoogleRedirectUri) {
      throw new Error('Missing Google OAuth credentials')
    }
    
    if (!hasAuthSecret || !hasAuthUrl) {
      throw new Error('Missing better-auth configuration')
    }
    
    // Validate secret length
    if (authConfig.session.secret.length < 32) {
      throw new Error('BETTER_AUTH_SECRET must be at least 32 characters')
    }
    
    const responseTime = Date.now() - startTime
    
    return {
      name: 'auth',
      status: 'healthy',
      message: 'Authentication configuration valid',
      responseTime,
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    return {
      name: 'auth',
      status: 'unhealthy',
      message: 'Invalid authentication configuration',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Validate all external services
 * 
 * Runs health checks for database, storage, and auth in parallel.
 * Returns overall health status based on individual service results.
 * 
 * @returns Health check result with status for all services
 * 
 * @example
 * ```ts
 * const health = await validateExternalServices()
 * 
 * if (health.status === 'unhealthy') {
 *   console.error('System unhealthy:', health.services)
 * }
 * ```
 */
export async function validateExternalServices(): Promise<HealthCheckResult> {
  // Run all health checks in parallel
  const results = await Promise.allSettled([
    checkDatabase(),
    checkStorage(),
    checkAuth(),
  ])
  
  // Extract service results
  const services: ServiceHealthResult[] = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    }
    
    // Handle unexpected errors during health check execution
    const serviceName = ['database', 'storage', 'auth'][index]
    return {
      name: serviceName,
      status: 'unhealthy' as const,
      message: 'Health check failed to execute',
      error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
    }
  })
  
  // Determine overall status
  const unhealthyCount = services.filter(s => s.status === 'unhealthy').length
  
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy'
  if (unhealthyCount === 0) {
    overallStatus = 'healthy'
  } else if (unhealthyCount === services.length) {
    overallStatus = 'unhealthy'
  } else {
    overallStatus = 'degraded'
  }
  
  return {
    status: overallStatus,
    services,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Quick health check (auth only)
 * 
 * Performs a fast health check that only validates configuration
 * without making network calls. Useful for readiness probes.
 */
export async function quickHealthCheck(): Promise<ServiceHealthResult> {
  return checkAuth()
}

