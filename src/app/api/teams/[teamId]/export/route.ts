/**
 * Team Data Export API Endpoint
 * POST /api/teams/:teamId/export
 * 
 * Implements Requirements 5A.1, 5A.3, 5A.5
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queueTeamExport } from "@/server/teams";
import { db } from "@/lib/db";
import { teamMembers } from "@/server/db/schema/team-members";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    // 1. Authenticate user
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const { teamId } = await params;
    const userId = session.user.id;

    // 2. Verify user is team owner
    const member = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ),
    });

    if (!member || member.managementRole !== "TEAM_OWNER") {
      logger.warn("team.export.unauthorized", {
        userId,
        teamId,
        role: member?.managementRole,
      });

      return NextResponse.json(
        {
          error: {
            code: "NOT_TEAM_OWNER",
            message: "Only team owners can export team data",
          },
        },
        { status: 403 }
      );
    }

    // 3. Queue export job
    const jobId = await queueTeamExport(teamId, userId);

    // 4. Return success response
    return NextResponse.json(
      {
        message: "Export queued successfully",
        jobId,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("team.export.api.error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    // Handle rate limit error
    if (error instanceof Error && error.message.includes("rate limit")) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMIT_EXPORTS",
            message: error.message,
          },
        },
        { status: 429 }
      );
    }

    // Handle not found error
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        {
          error: {
            code: "TEAM_NOT_FOUND",
            message: "Team not found",
          },
        },
        { status: 404 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: {
          code: "EXPORT_ERROR",
          message: "Failed to queue export",
        },
      },
      { status: 500 }
    );
  }
}
