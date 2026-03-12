/**
 * POST /api/setup/complete
 * 
 * Creates the first workspace and marks setup as complete.
 * Optionally creates sample data for the workspace.
 * Requires authentication (admin only).
 * 
 * @module api/setup/complete
 * @requirements 5.1, 5.2, 5.3, 5.4, 5.7, 6.4, 6.5, 12.6
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getInstanceStatus, isSetupComplete } from "@/server/setup";
import { createSampleProject } from "@/server/setup/sample-data-service";
import { getSession } from "@/server/auth/session";
import { logger } from "@/lib/logger";

/**
 * Request body schema
 */
const CompleteSetupSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  createSampleData: z.boolean().optional().default(false),
});

type CompleteSetupInput = z.infer<typeof CompleteSetupSchema>;

/**
 * POST /api/setup/complete
 * 
 * Marks setup as complete for an existing workspace.
 * The workspace should have been created in a previous step.
 * 
 * Request body:
 * {
 *   "workspaceId": "uuid",
 *   "createSampleData": true  // optional, defaults to false
 * }
 * 
 * Success response (200):
 * {
 *   "success": true,
 *   "workspaceId": "uuid",
 *   "sampleDataCreated": boolean,
 *   "message": "Setup completed successfully"
 * }
 * 
 * Error responses:
 * - 400: Validation error (invalid input)
 * - 401: Unauthorized (not authenticated)
 * - 403: Forbidden (not admin)
 * - 409: Setup already complete
 * - 500: Internal server error
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Require authentication
    const session = await getSession();
    if (!session) {
      logger.warn("setup.complete.unauthorized", {
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

    // Check if setup is already complete
    const setupComplete = await isSetupComplete();
    if (setupComplete) {
      logger.warn("setup.complete.already_done", {
        requestId,
        userId: session.id,
      });

      return NextResponse.json(
        {
          error: {
            code: "SETUP_ALREADY_COMPLETE",
            message: "Instance setup has already been completed.",
          },
        },
        { status: 409 }
      );
    }

    // Check if user is the admin
    const status = await getInstanceStatus();
    if (status.adminEmail && status.adminEmail !== session.email) {
      logger.warn("setup.complete.forbidden", {
        requestId,
        userId: session.id,
        adminEmail: status.adminEmail,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Only the instance admin can complete setup",
          },
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    let body: CompleteSetupInput;
    try {
      const rawBody = await request.json();
      body = CompleteSetupSchema.parse(rawBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        logger.info("setup.complete.validation_error", {
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

    // Mark setup as complete (workspace should already exist from previous step)
    const { db } = await import("@/lib/db");
    const { instanceSettings } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    
    const settings = await db.query.instanceSettings.findFirst();
    if (settings) {
      await db.update(instanceSettings)
        .set({
          setupCompletedAt: new Date(),
          defaultWorkspaceId: body.workspaceId,
          updatedAt: new Date(),
        })
        .where(eq(instanceSettings.id, settings.id));
    }

    // Optionally create sample data
    let sampleDataCreated = false;
    if (body.createSampleData) {
      try {
        await createSampleProject({
          workspaceId: body.workspaceId,
          userId: session.id,
        });
        sampleDataCreated = true;
        
        logger.info("setup.complete.sample_data_created", {
          requestId,
          workspaceId: body.workspaceId,
        });
      } catch (sampleError) {
        // Log but don't fail the setup if sample data creation fails
        logger.warn("setup.complete.sample_data_failed", {
          requestId,
          workspaceId: body.workspaceId,
          error: sampleError instanceof Error ? sampleError.message : "Unknown error",
        });
      }
    }

    logger.info("setup.complete.success", {
      requestId,
      userId: session.id,
      workspaceId: body.workspaceId,
      sampleDataCreated,
    });

    return NextResponse.json(
      {
        success: true,
        workspaceId: body.workspaceId,
        sampleDataCreated,
        message: "Setup completed successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    logger.error("setup.complete.error", {
      requestId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while completing setup.",
        },
      },
      { status: 500 }
    );
  }
}
