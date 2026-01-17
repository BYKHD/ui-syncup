/**
 * GET /api/setup/health
 * 
 * Returns the health status of all services.
 * Used by the setup wizard to display service connectivity status
 * and degraded behavior messages.
 * 
 * @module api/setup/health
 * @requirements 2.1, 2.2, 2.3, 2.4
 */

import { NextResponse } from "next/server";
import { checkAllServicesHealth } from "@/server/setup";
import { isMultiWorkspaceMode } from "@/config/workspace";
import { logger } from "@/lib/logger";

/**
 * GET /api/setup/health
 * 
 * No authentication required (public endpoint).
 * 
 * Success response (200):
 * {
 *   "database": { "status": "connected" | "not_configured" | "error", "message": string, "degradedBehavior"?: string },
 *   "email": { "status": "connected" | "not_configured" | "error", "message": string, "degradedBehavior"?: string },
 *   "storage": { "status": "connected" | "not_configured" | "error", "message": string, "degradedBehavior"?: string },
 *   "redis": { "status": "connected" | "not_configured" | "error", "message": string, "degradedBehavior"?: string },
 *   "isMultiWorkspaceMode": boolean
 * }
 * 
 * Error responses:
 * - 500: Internal server error
 */
export async function GET() {
  const requestId = crypto.randomUUID();

  try {
    const health = await checkAllServicesHealth();

    logger.info("setup.health.success", {
      requestId,
      database: health.database.status,
      email: health.email.status,
      storage: health.storage.status,
      redis: health.redis.status,
    });

    return NextResponse.json(
      {
        ...health,
        isMultiWorkspaceMode: isMultiWorkspaceMode(),
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    logger.error("setup.health.error", {
      requestId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while checking service health.",
        },
      },
      { status: 500 }
    );
  }
}
