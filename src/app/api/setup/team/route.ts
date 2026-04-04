/**
 * POST /api/setup/team
 *
 * Creates the first team during instance setup.
 * Requires authentication (admin only).
 *
 * @module api/setup/team
 * @requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/server/auth/session";
import { getInstanceStatus } from "@/server/setup";
import { db } from "@/lib/db";
import { instanceSettings, teams, teamMembers } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * Request body schema
 */
const CreateTeamSchema = z.object({
  teamName: z
    .string()
    .min(2, "Team name must be at least 2 characters")
    .max(50, "Team name must be less than 50 characters"),
});

type CreateTeamInput = z.infer<typeof CreateTeamSchema>;

/**
 * Generate a URL-safe slug from a name.
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove non-word chars except spaces and hyphens
    .replace(/[\s_-]+/g, "-") // Replace spaces, underscores, multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * POST /api/setup/team
 *
 * Creates the first team with admin as TEAM_OWNER.
 * Updates instance settings with the default team ID.
 *
 * Request body:
 * {
 *   "teamName": "My Team"
 * }
 *
 * Success response (201):
 * {
 *   "success": true,
 *   "teamId": "uuid",
 *   "teamSlug": "my-team"
 * }
 *
 * Error responses:
 * - 400: Validation error
 * - 401: Unauthorized
 * - 403: Forbidden (not admin)
 * - 409: Team already exists
 * - 500: Internal server error
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Require authentication
    const session = await getSession();
    if (!session) {
      logger.warn("setup.team.unauthorized", { requestId });

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

    // Check if user is the admin
    const status = await getInstanceStatus();
    if (status.adminEmail && status.adminEmail !== session.email) {
      logger.warn("setup.team.forbidden", {
        requestId,
        userId: session.id,
        adminEmail: status.adminEmail,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Only the instance admin can create the first team",
          },
        },
        { status: 403 }
      );
    }

    // Check if team already exists
    if (status.defaultWorkspaceId) {
      logger.warn("setup.team.already_exists", {
        requestId,
        teamId: status.defaultWorkspaceId,
      });

      return NextResponse.json(
        {
          error: {
            code: "TEAM_ALREADY_EXISTS",
            message: "First team has already been created",
          },
        },
        { status: 409 }
      );
    }

    // Parse and validate request body
    let body: CreateTeamInput;
    try {
      const rawBody = await request.json();
      body = CreateTeamSchema.parse(rawBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        logger.info("setup.team.validation_error", {
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

    // Generate slug
    const slug = generateSlug(body.teamName);

    // Create the team
    const [team] = await db.insert(teams).values({
      name: body.teamName,
      slug,
    }).returning({ id: teams.id });

    if (!team) {
      throw new Error("Failed to create team");
    }

    // Add admin as TEAM_OWNER with TEAM_EDITOR operational role
    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: session.id,
      managementRole: "TEAM_OWNER",
      operationalRole: "TEAM_EDITOR",
    });

    // Update instance settings with default team ID
    const settings = await db.query.instanceSettings.findFirst();
    if (settings) {
      await db.update(instanceSettings)
        .set({
          defaultWorkspaceId: team.id,
          updatedAt: new Date(),
        })
        .where(eq(instanceSettings.id, settings.id));
    }

    logger.info("setup.team.success", {
      requestId,
      userId: session.id,
      teamId: team.id,
      teamName: body.teamName,
      teamSlug: slug,
    });

    return NextResponse.json(
      {
        success: true,
        teamId: team.id,
        teamSlug: slug,
      },
      { status: 201 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Handle duplicate slug error
    if (errorMessage.includes("duplicate") || errorMessage.includes("unique")) {
      logger.warn("setup.team.duplicate_slug", {
        requestId,
        error: errorMessage,
      });

      return NextResponse.json(
        {
          error: {
            code: "DUPLICATE_TEAM",
            message: "A team with this name already exists",
          },
        },
        { status: 409 }
      );
    }

    logger.error("setup.team.error", {
      requestId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while creating team.",
        },
      },
      { status: 500 }
    );
  }
}
