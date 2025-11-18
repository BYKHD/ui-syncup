/**
 * Health Check API Endpoint
 * 
 * Provides system health status for monitoring and deployment verification.
 * Validates external service connections (database, storage, auth) and
 * returns deployment metadata.
 * 
 * @route GET /api/health
 * 
 * @example
 * ```bash
 * # Check system health
 * curl https://ui-syncup.com/api/health
 * 
 * # Response (healthy)
 * {
 *   "status": "healthy",
 *   "services": [
 *     { "name": "database", "status": "healthy", "responseTime": 45 },
 *     { "name": "storage", "status": "healthy", "responseTime": 120 },
 *     { "name": "auth", "status": "healthy", "responseTime": 2 }
 *   ],
 *   "deployment": {
 *     "environment": "production",
 *     "branch": "main",
 *     "commitSha": "abc123",
 *     ...
 *   },
 *   "timestamp": "2024-01-15T10:30:00.000Z"
 * }
 * ```
 */

import { NextResponse } from 'next/server'
import { validateExternalServices } from '@/lib/health-check'
import { getDeploymentInfo } from '@/types/deployment'

/**
 * GET /api/health
 * 
 * Returns system health status with service checks and deployment info.
 * 
 * Status Codes:
 * - 200: All services healthy
 * - 207: Some services degraded (partial failure)
 * - 503: All services unhealthy (system down)
 */
export async function GET() {
  try {
    // Validate all external services
    const healthCheck = await validateExternalServices()
    
    // Get deployment metadata
    const deployment = getDeploymentInfo()
    
    // Determine HTTP status code based on health
    let statusCode: number
    if (healthCheck.status === 'healthy') {
      statusCode = 200
    } else if (healthCheck.status === 'degraded') {
      statusCode = 207 // Multi-Status (partial success)
    } else {
      statusCode = 503 // Service Unavailable
    }
    
    return NextResponse.json(
      {
        status: healthCheck.status,
        services: healthCheck.services,
        deployment,
        timestamp: healthCheck.timestamp,
      },
      { status: statusCode }
    )
  } catch (error) {
    // Handle unexpected errors during health check
    const deployment = getDeploymentInfo()
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        deployment,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}

/**
 * HEAD /api/health
 * 
 * Lightweight health check that only returns status code.
 * Useful for load balancers and monitoring tools that only need
 * to know if the service is up.
 * 
 * Status Codes:
 * - 200: System healthy
 * - 503: System unhealthy
 */
export async function HEAD() {
  try {
    const healthCheck = await validateExternalServices()
    
    const statusCode = healthCheck.status === 'unhealthy' ? 503 : 200
    
    return new NextResponse(null, { status: statusCode })
  } catch (error) {
    return new NextResponse(null, { status: 503 })
  }
}

