/**
 * GET /api/setup/export
 * 
 * Export instance configuration as JSON.
 * Requires admin authentication.
 * 
 * @module api/setup/export
 * @requirements 10.7
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { getInstanceStatus } from "@/server/setup";
import { logger } from "@/lib/logger";
import { logAdminAction } from "@/server/audit";

/**
 * Export version for forward compatibility
 */
const EXPORT_VERSION = "1.0";

/**
 * GET /api/setup/export
 * 
 * Returns instance configuration as downloadable JSON.
 * Excludes sensitive data (passwords, tokens, user IDs).
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Authenticate user
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        },
        { status: 401 }
      );
    }

    // Get instance status to check admin
    const instanceStatus = await getInstanceStatus();

    // Only allow instance admin to export
    if (instanceStatus.adminEmail !== session.email) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Only the instance administrator can export settings",
          },
        },
        { status: 403 }
      );
    }

    // Build export payload (excluding sensitive data)
    const exportData = {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      instanceSettings: {
        instanceName: instanceStatus.instanceName,
        publicUrl: instanceStatus.publicUrl,
        defaultMemberRole: instanceStatus.defaultMemberRole,
      },
    };

    // Audit log the export
    logAdminAction("instance.settings.exported", {
      userId: session.id,
      userEmail: session.email,
      resourceType: "instance",
    });

    logger.info("setup.export.success", {
      requestId,
      userId: session.id,
    });

    // Return as downloadable JSON
    const response = NextResponse.json(exportData, { status: 200 });
    response.headers.set(
      "Content-Disposition",
      `attachment; filename="instance-settings-${new Date().toISOString().split("T")[0]}.json"`
    );

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    logger.error("setup.export.error", {
      requestId,
      error: errorMessage,
    });

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to export settings",
        },
      },
      { status: 500 }
    );
  }
}
