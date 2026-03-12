/**
 * POST /api/setup/config
 * 
 * Saves instance configuration during setup.
 * Requires authentication (admin only).
 * 
 * @module api/setup/config
 * @requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { saveInstanceConfig, getInstanceStatus } from "@/server/setup";
import { getSession } from "@/server/auth/session";
import { logger } from "@/lib/logger";
import { logAdminAction, createChange, filterChanges } from "@/server/audit";

/**
 * URL validation - accepts valid URLs or empty string
 */
const urlRegex = /^(https?:\/\/)?[\da-z.-]+(\.[a-z.]{2,6})([/\w .-]*)*\/?$/i;

/**
 * Request body schema
 */
const SaveConfigSchema = z.object({
  instanceName: z
    .string()
    .min(2, "Instance name must be at least 2 characters")
    .max(100, "Instance name must be less than 100 characters"),
  publicUrl: z
    .string()
    .max(255, "Public URL must be less than 255 characters")
    .refine(
      (val) => val === "" || urlRegex.test(val) || val.startsWith("http"),
      "Please enter a valid URL (e.g., https://app.example.com)"
    )
    .optional()
    .default(""),
  defaultMemberRole: z
    .enum(["WORKSPACE_VIEWER", "WORKSPACE_MEMBER", "WORKSPACE_EDITOR"])
    .optional(),
});

type SaveConfigInput = z.infer<typeof SaveConfigSchema>;

/**
 * POST /api/setup/config
 * 
 * Saves instance configuration (instance name, public URL).
 * Requires authenticated admin user.
 * 
 * Request body:
 * {
 *   "instanceName": "My UI SyncUp",
 *   "publicUrl": "https://app.example.com",  // optional
 *   "defaultMemberRole": "WORKSPACE_MEMBER"  // optional
 * }
 * 
 * Success response (200):
 * {
 *   "success": true,
 *   "message": "Instance configuration saved successfully"
 * }
 * 
 * Error responses:
 * - 400: Validation error (invalid input)
 * - 401: Unauthorized (not authenticated)
 * - 403: Forbidden (not admin)
 * - 500: Internal server error
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Require authentication
    const session = await getSession();
    if (!session) {
      logger.warn("setup.config.unauthorized", {
        requestId,
      });

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

    // Check if user is the admin (first user / setup admin)
    const status = await getInstanceStatus();
    if (status.adminEmail && status.adminEmail !== session.email) {
      logger.warn("setup.config.forbidden", {
        requestId,
        userId: session.id,
        adminEmail: status.adminEmail,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Only the instance admin can modify configuration",
          },
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    let body: SaveConfigInput;
    try {
      const rawBody = await request.json();
      body = SaveConfigSchema.parse(rawBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        logger.info("setup.config.validation_error", {
          requestId,
          errors: fieldErrors,
        });

        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid input",
              fields: fieldErrors,
            },
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: {
            code: "INVALID_REQUEST",
            message: "Invalid request body",
          },
        },
        { status: 400 }
      );
    }

    // Get current status for audit logging (before values)
    const currentStatus = await getInstanceStatus();

    // Save instance configuration
    await saveInstanceConfig({
      instanceName: body.instanceName,
      publicUrl: body.publicUrl || undefined,
      defaultMemberRole: body.defaultMemberRole,
    });

    // Audit log the configuration change
    const changes = filterChanges([
      createChange('instanceName', currentStatus.instanceName, body.instanceName),
      createChange('publicUrl', currentStatus.publicUrl, body.publicUrl || null),
      createChange('defaultMemberRole', currentStatus.defaultMemberRole, body.defaultMemberRole),
    ]);

    if (changes.length > 0) {
      logAdminAction('instance.settings.updated', {
        userId: session.id,
        userEmail: session.email,
        resourceType: 'instance',
        changes,
      });
    }

    logger.info("setup.config.success", {
      requestId,
      userId: session.id,
      instanceName: body.instanceName,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Instance configuration saved successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    logger.error("setup.config.error", {
      requestId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while saving configuration.",
        },
      },
      { status: 500 }
    );
  }
}
