/**
 * Project Archive API Routes
 *
 * POST   /api/projects/[id]/archive - Archive a project
 * DELETE /api/projects/[id]/archive - Unarchive a project
 */

import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { PERMISSIONS } from "@/config/roles";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { hasPermission } from "@/server/auth/rbac";
import { getSession } from "@/server/auth/session";
import {
  archiveProject,
  unarchiveProject,
} from "@/server/projects/project-service";
import { projectMembers, projects, teamMembers } from "@/server/db/schema";
import type { Project } from "@/server/projects/types";

function serializeProject(project: Project) {
  return {
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    deletedAt: project.deletedAt?.toISOString() ?? null,
  };
}

async function canArchiveProject(userId: string, projectId: string) {
  return hasPermission({
    userId,
    permission: PERMISSIONS.PROJECT_ARCHIVE,
    resourceId: projectId,
    resourceType: "project",
  });
}

async function activeProjectExists(projectId: string) {
  const row = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), isNull(projects.deletedAt)),
    columns: { id: true },
  });

  return Boolean(row);
}

async function userHasKnownWorkspaceRelationship(userId: string) {
  const teamMembership = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId))
    .limit(1);

  if (teamMembership.length > 0) {
    return true;
  }

  const projectMembership = await db
    .select({ id: projectMembers.id })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId))
    .limit(1);

  return projectMembership.length > 0;
}

async function permissionDeniedResponse({
  requestId,
  userId,
  projectId,
  action,
  message,
}: {
  requestId: string;
  userId: string;
  projectId: string;
  action: "archive" | "unarchive";
  message: string;
}) {
  const exists = await activeProjectExists(projectId);

  if (!exists && await userHasKnownWorkspaceRelationship(userId)) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Project not found",
        },
      },
      { status: 404 }
    );
  }

  logger.warn(`api.projects.${action}.forbidden`, {
    requestId,
    userId,
    projectId,
  });

  return NextResponse.json(
    {
      error: {
        code: "FORBIDDEN",
        message,
      },
    },
    { status: 403 }
  );
}

async function projectNotFoundResponse(userId: string, _projectId: string) {
  if (await userHasKnownWorkspaceRelationship(userId)) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Project not found",
        },
      },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      error: {
        code: "FORBIDDEN",
        message: "You do not have permission to archive this project",
      },
    },
    { status: 403 }
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const { id: projectId } = await params;

  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Not authenticated",
          },
        },
        { status: 401 }
      );
    }

    if (!(await canArchiveProject(user.id, projectId))) {
      return permissionDeniedResponse({
        requestId,
        userId: user.id,
        projectId,
        action: "archive",
        message: "You do not have permission to archive this project",
      });
    }

    try {
      const project = await archiveProject(projectId, user.id);

      logger.info("api.projects.archive.success", {
        requestId,
        userId: user.id,
        projectId,
      });

      return NextResponse.json(
        { project: serializeProject(project) },
        { status: 200 }
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Project not found") {
          return projectNotFoundResponse(user.id, projectId);
        }

        if (error.message === "All issues must be resolved before archiving") {
          return NextResponse.json(
            {
              error: {
                code: "PROJECT_INCOMPLETE",
                message: error.message,
              },
            },
            { status: 400 }
          );
        }
      }

      throw error;
    }
  } catch (error) {
    console.error("POST archive project error:", error);
    logger.error("api.projects.archive.error", {
      requestId,
      projectId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred. Please try again later.",
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const { id: projectId } = await params;

  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Not authenticated",
          },
        },
        { status: 401 }
      );
    }

    if (!(await canArchiveProject(user.id, projectId))) {
      return permissionDeniedResponse({
        requestId,
        userId: user.id,
        projectId,
        action: "unarchive",
        message: "You do not have permission to unarchive this project",
      });
    }

    try {
      const project = await unarchiveProject(projectId, user.id);

      logger.info("api.projects.unarchive.success", {
        requestId,
        userId: user.id,
        projectId,
      });

      return NextResponse.json(
        { project: serializeProject(project) },
        { status: 200 }
      );
    } catch (error) {
      if (error instanceof Error && error.message === "Project not found") {
        return projectNotFoundResponse(user.id, projectId);
      }

      throw error;
    }
  } catch (error) {
    console.error("DELETE archive project error:", error);
    logger.error("api.projects.unarchive.error", {
      requestId,
      projectId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred. Please try again later.",
        },
      },
      { status: 500 }
    );
  }
}
