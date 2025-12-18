/**
 * GET /api/auth/providers
 *
 * Returns the enabled status of each OAuth provider for client-side rendering.
 * This endpoint is public (no auth required) since it only exposes which
 * providers are available, not any sensitive configuration.
 *
 * @module api/auth/providers
 *
 * @example
 * ```bash
 * # Get available OAuth providers
 * curl https://ui-syncup.com/api/auth/providers
 *
 * # Response
 * {
 *   "providers": {
 *     "google": { "enabled": true },
 *     "microsoft": { "enabled": true },
 *     "atlassian": { "enabled": false }
 *   }
 * }
 * ```
 */

import { NextResponse } from "next/server"
import { authConfig } from "@/lib/auth-config"
import { logger } from "@/lib/logger"

/**
 * Provider status response interface
 */
export interface ProviderStatus {
  enabled: boolean
}

export interface ProvidersResponse {
  providers: {
    google: ProviderStatus
    microsoft: ProviderStatus
    atlassian: ProviderStatus
  }
}

/**
 * GET /api/auth/providers
 *
 * Returns the enabled status for each OAuth provider.
 * Used by the client to determine which social login buttons to display.
 *
 * This endpoint:
 * - Does NOT require authentication (public)
 * - Does NOT expose sensitive data (only enabled/disabled status)
 * - Is safe to cache (provider availability rarely changes)
 *
 * @returns {ProvidersResponse} Provider availability status
 *
 * Success response (200):
 * {
 *   "providers": {
 *     "google": { "enabled": true },
 *     "microsoft": { "enabled": true },
 *     "atlassian": { "enabled": false }
 *   }
 * }
 *
 * Error response (500):
 * {
 *   "error": {
 *     "code": "INTERNAL_SERVER_ERROR",
 *     "message": "Failed to retrieve provider configuration"
 *   }
 * }
 */
export async function GET() {
  const requestId = crypto.randomUUID()

  try {
    // Build provider status from auth configuration
    const response: ProvidersResponse = {
      providers: {
        google: { enabled: authConfig.providers.google.enabled },
        microsoft: { enabled: authConfig.providers.microsoft.enabled },
        atlassian: { enabled: authConfig.providers.atlassian.enabled },
      },
    }

    logger.debug("auth.providers.success", {
      requestId,
      enabledProviders: Object.entries(response.providers)
        .filter(([, status]) => status.enabled)
        .map(([name]) => name),
    })

    return NextResponse.json(response, {
      status: 200,
      headers: {
        // Cache for 5 minutes - provider availability rarely changes
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    })
  } catch (error) {
    logger.error("auth.providers.error", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve provider configuration",
        },
      },
      { status: 500 }
    )
  }
}
