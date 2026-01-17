/**
 * GET /api/setup/status
 * 
 * Returns the current instance setup status.
 * Used by the proxy to determine routing and by the setup wizard
 * to check if setup is complete.
 * 
 * @module api/setup/status
 * @requirements 1.1, 1.2, 11.4
 */

import { NextResponse } from "next/server";
import { getInstanceStatus } from "@/server/setup";
import { logger } from "@/lib/logger";

/**
 * GET /api/setup/status
 * 
 * No authentication required (public endpoint).
 * 
 * Success response (200):
 * {
 *   "isSetupComplete": boolean,
 *   "instanceName": string | null,
 *   "publicUrl": string | null,
 *   "defaultWorkspaceId": string | null,
 *   "defaultMemberRole": "WORKSPACE_VIEWER" | "WORKSPACE_MEMBER" | "WORKSPACE_EDITOR",
 *   "isMultiWorkspaceMode": boolean,
 *   "skipEmailVerification": boolean
 * }
 * 
 * Error responses:
 * - 500: Internal server error (database unreachable)
 */
export async function GET() {
  const requestId = crypto.randomUUID();

  try {
    const status = await getInstanceStatus();

    logger.info("setup.status.success", {
      requestId,
      isSetupComplete: status.isSetupComplete,
    });

    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    logger.error("setup.status.error", {
      requestId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Check if it's a database connection error
    const isDatabaseError = errorMessage.toLowerCase().includes("database") ||
      errorMessage.toLowerCase().includes("connect") ||
      errorMessage.toLowerCase().includes("postgres");

    if (isDatabaseError) {
      return NextResponse.json(
        {
          error: {
            code: "DATABASE_CONNECTION_ERROR",
            message: "Cannot connect to database. Please check your DATABASE_URL configuration.",
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while checking instance status.",
        },
      },
      { status: 500 }
    );
  }
}
