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
  teamId: z.string().uuid("Invalid team ID"),
  createSampleData: z.boolean().optional().default(false),
});

type CompleteSetupInput = z.infer<typeof CompleteSetupSchema>;

/**
 * POST /api/setup/complete
 * 
 * Marks setup as complete for an existing team.
 * The team should have been created in a previous step.
 *
 * Request body:
 * {
 *   "teamId": "uuid",
 *   "createSampleData": true  // optional, defaults to false
 * }
 *
 * Success response (200):
 * {
 *   "success": true,
 *   "teamId": "uuid",
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
        const fieldErrors = error.issues.map((err) => ({
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
    const { users } = await import("@/server/db/schema/users");
    const { eq } = await import("drizzle-orm");
    
    const settings = await db.query.instanceSettings.findFirst();
    if (settings) {
      await db.update(instanceSettings)
        .set({
          setupCompletedAt: new Date(),
          defaultWorkspaceId: body.teamId,
          updatedAt: new Date(),
        })
        .where(eq(instanceSettings.id, settings.id));
    }

    // Optionally create sample data
    let sampleDataCreated = false;
    if (body.createSampleData) {
      try {
        await createSampleProject({
          teamId: body.teamId,
          userId: session.id,
        });
        sampleDataCreated = true;
        
        logger.info("setup.complete.sample_data_created", {
          requestId,
          teamId: body.teamId,
        });
      } catch (sampleError) {
        // Log but don't fail the setup if sample data creation fails
        logger.warn("setup.complete.sample_data_failed", {
          requestId,
          teamId: body.teamId,
          error: sampleError instanceof Error ? sampleError.message : "Unknown error",
        });
      }
    }

    // Activate the workspace as the admin's active team so /team/* routes work immediately
    await db
      .update(users)
      .set({ lastActiveTeamId: body.teamId })
      .where(eq(users.id, session.id));

    logger.info("setup.complete.success", {
      requestId,
      userId: session.id,
      teamId: body.teamId,
      sampleDataCreated,
    });

    const response = NextResponse.json(
      {
        success: true,
        teamId: body.teamId,
        sampleDataCreated,
        redirectUrl: "/projects",
        message: "Setup completed successfully",
      },
      { status: 200 }
    );

    // Cache setup completion in the browser so middleware takes the fast path
    response.cookies.set("setup-complete", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });

    // Set active team cookie so /team/settings and other protected routes
    // resolve immediately without redirecting to /onboarding
    response.cookies.set("team_id", body.teamId, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });

    return response;
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
