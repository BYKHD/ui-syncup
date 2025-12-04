/**
 * Project Detail API Routes
 * 
 * GET /api/projects/[id] - Get project details
 * PATCH /api/projects/[id] - Update project settings
 * DELETE /api/projects/[id] - Soft delete project
 * 
 * @module api/projects/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/rbac";
import { PERMISSIONS } from "@/config/roles";
import {
  getProject,
  updateProject,
  deleteProject,
} from "@/server/projects/project-service";
import { logger } from "@/lib/logger";
import { z } from "zod";
import type {
  ProjectStatus,
  ProjectVisibility,
} from "@/server/projects/types";

/**
 * Zod schema for project update
 */
const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  icon: z.string().max(255).optional().nullable(),
  visibility: z.enum(["public", "private"]).optional(),
  status: z.enum(["active", "archived"]).optional(),
});

/**
 * GET /api/projects/[id]
 * 
 * Get project details with user context.
 * Requires PROJECT_VIEW permission.
 * 
 * Success response (200):
 * {
 *   "project": {
 *     "id": "uuid",
 *     "teamId": "uuid",
 *     "name": "Project Name",
 *     "key": "PRJ",
 *     "slug": "project-name",
 *     "description": "Description",
 *     "icon": "icon-url",
 *     "visibility": "public",
 *     "status": "active",
 *     "createdAt": "2024-01-01T00:00:00.000Z",
 *     "updatedAt": "2024-01-01T00:00:00.000Z",
 *     "deletedAt": null,
 *     "stats": {
 *       "totalTickets": 0,
 *       "completedTickets": 0,
 *       "progressPercent": 0,
 *       "memberCount": 1
 *     },
 *     "userRole": "owner",
 *     "canJoin": false
 *   }
 * }
 * 
 * Error responses:
 * - 401: Not authenticated
 * - 403: Insufficient permissions (no PROJECT_VIEW permission)
 * - 404: Project not found
 * - 500: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const { id: projectId } = await params;

  try {
    // Authenticate user
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

    // Get project (includes access control check)
    try {
      const project = await getProject(projectId, user.id);

      logger.info("api.projects.get.success", {
        requestId,
        userId: user.id,
        projectId,
      });

      // Serialize dates to strings for API response
      const serializedProject = {
        ...project,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        deletedAt: project.deletedAt?.toISOString() ?? null,
      };

      return NextResponse.json(
        { project: serializedProject },
        { status: 200 }
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Project not found") {
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

        if (error.message === "Access denied") {
          logger.warn("api.projects.get.forbidden", {
            requestId,
            userId: user.id,
            projectId,
          });

          return NextResponse.json(
            {
              error: {
                code: "FORBIDDEN",
                message: "You do not have permission to view this project",
              },
            },
            { status: 403 }
          );
        }
      }

      throw error;
    }
  } catch (error) {
    console.error("GET project error:", error);
    logger.error("api.projects.get.error", {
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

/**
 * PATCH /api/projects/[id]
 * 
 * Update project settings.
 * Requires PROJECT_UPDATE permission.
 * 
 * Request body:
 * {
 *   "name": "Updated Name",
 *   "description": "Updated description",
 *   "icon": "icon-url",
 *   "visibility": "public",
 *   "status": "archived"
 * }
 * 
 * Success response (200):
 * {
 *   "project": {
 *     "id": "uuid",
 *     "teamId": "uuid",
 *     "name": "Updated Name",
 *     ...
 *   }
 * }
 * 
 * Error responses:
 * - 400: Invalid input
 * - 401: Not authenticated
 * - 403: Insufficient permissions (no PROJECT_UPDATE permission)
 * - 404: Project not found
 * - 500: Internal server error
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const { id: projectId } = await params;

  try {
    // Authenticate user
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

    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateProjectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "Invalid project data",
            details: validation.error.errors,
          },
        },
        { status: 400 }
      );
    }

    // Check PROJECT_UPDATE permission
    const canUpdate = await hasPermission({
      userId: user.id,
      permission: PERMISSIONS.PROJECT_UPDATE,
      resourceId: projectId,
      resourceType: "project",
    });

    if (!canUpdate) {
      logger.warn("api.projects.update.forbidden", {
        requestId,
        userId: user.id,
        projectId,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to update this project",
          },
        },
        { status: 403 }
      );
    }

    // Update project
    const { name, description, icon, visibility, status } = validation.data;

    try {
      const project = await updateProject(projectId, {
        name,
        description,
        icon,
        visibility: visibility as ProjectVisibility | undefined,
        status: status as ProjectStatus | undefined,
      });

      logger.info("api.projects.update.success", {
        requestId,
        userId: user.id,
        projectId,
        updates: Object.keys(validation.data),
      });

      // Serialize dates to strings for API response
      const serializedProject = {
        ...project,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        deletedAt: project.deletedAt?.toISOString() ?? null,
      };

      return NextResponse.json(
        { project: serializedProject },
        { status: 200 }
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Project not found") {
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

        if (error.message.includes("Invalid project name")) {
          return NextResponse.json(
            {
              error: {
                code: "INVALID_PROJECT_NAME",
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
    console.error("PATCH project error:", error);
    logger.error("api.projects.update.error", {
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

/**
 * DELETE /api/projects/[id]
 * 
 * Soft delete a project (sets deletedAt timestamp).
 * Requires PROJECT_DELETE permission.
 * 
 * Success response (204):
 * No content
 * 
 * Error responses:
 * - 401: Not authenticated
 * - 403: Insufficient permissions (no PROJECT_DELETE permission)
 * - 404: Project not found
 * - 500: Internal server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const { id: projectId } = await params;

  try {
    // Authenticate user
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

    // Check PROJECT_DELETE permission
    const canDelete = await hasPermission({
      userId: user.id,
      permission: PERMISSIONS.PROJECT_DELETE,
      resourceId: projectId,
      resourceType: "project",
    });

    if (!canDelete) {
      logger.warn("api.projects.delete.forbidden", {
        requestId,
        userId: user.id,
        projectId,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to delete this project",
          },
        },
        { status: 403 }
      );
    }

    // Delete project (soft delete or hard delete based on env)
    try {
      if (process.env.NEXT_PUBLIC_ENABLE_HARD_DELETE === 'true') {
        const { hardDeleteProject } = await import('@/server/projects/project-service');
        await hardDeleteProject(projectId);
        
        logger.info("api.projects.hard_delete.success", {
          requestId,
          userId: user.id,
          projectId,
        });
      } else {
        await deleteProject(projectId);

        logger.info("api.projects.delete.success", {
          requestId,
          userId: user.id,
          projectId,
        });
      }

      return new NextResponse(null, { status: 204 });
    } catch (error) {
      if (error instanceof Error && error.message === "Project not found") {
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

      throw error;
    }
  } catch (error) {
    console.error("DELETE project error:", error);
    logger.error("api.projects.delete.error", {
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
