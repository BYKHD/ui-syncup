/**
 * POST /api/setup/import
 * 
 * Import instance configuration from JSON backup.
 * Requires admin authentication.
 * 
 * @module api/setup/import
 * @requirements 10.8
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/server/auth/session";
import { getInstanceStatus, saveInstanceConfig } from "@/server/setup";
import { logger } from "@/lib/logger";
import { logAdminAction, createChange, filterChanges } from "@/server/audit";

/**
 * Schema for validating imported settings
 */
const ImportSettingsSchema = z.object({
  version: z.string(),
  exportedAt: z.string().optional(),
  instanceSettings: z.object({
    instanceName: z.string().min(1).max(100),
    publicUrl: z.string().url().nullable().optional(),
    defaultMemberRole: z.enum([
      "WORKSPACE_VIEWER",
      "WORKSPACE_MEMBER",
      "WORKSPACE_EDITOR",
    ]),
  }),
});

/**
 * POST /api/setup/import
 * 
 * Imports instance configuration from a JSON backup.
 * Validates the structure and applies settings.
 */
export async function POST(request: NextRequest) {
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
    const currentStatus = await getInstanceStatus();

    // Only allow instance admin to import
    if (currentStatus.adminEmail !== session.email) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Only the instance administrator can import settings",
          },
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = ImportSettingsSchema.safeParse(body);

    if (!validation.success) {
      logger.warn("setup.import.validation_error", {
        requestId,
        errors: validation.error.errors,
      });

      return NextResponse.json(
        {
          error: {
            code: "INVALID_FORMAT",
            message: "Invalid settings format",
            details: validation.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { instanceSettings } = validation.data;

    // Apply imported settings
    await saveInstanceConfig({
      instanceName: instanceSettings.instanceName,
      publicUrl: instanceSettings.publicUrl ?? undefined,
      defaultMemberRole: instanceSettings.defaultMemberRole,
    });

    // Audit log the import with changes
    const changes = filterChanges([
      createChange("instanceName", currentStatus.instanceName, instanceSettings.instanceName),
      createChange("publicUrl", currentStatus.publicUrl, instanceSettings.publicUrl ?? null),
      createChange("defaultMemberRole", currentStatus.defaultMemberRole, instanceSettings.defaultMemberRole),
    ]);

    logAdminAction("instance.settings.imported", {
      userId: session.id,
      userEmail: session.email,
      resourceType: "instance",
      changes: changes.length > 0 ? changes : undefined,
      metadata: {
        importVersion: validation.data.version,
        exportedAt: validation.data.exportedAt,
      },
    });

    logger.info("setup.import.success", {
      requestId,
      userId: session.id,
      changesApplied: changes.length,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Settings imported successfully",
        changesApplied: changes.length,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    logger.error("setup.import.error", {
      requestId,
      error: errorMessage,
    });

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to import settings",
        },
      },
      { status: 500 }
    );
  }
}
