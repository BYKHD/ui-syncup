/**
 * Projects API Routes
 * 
 * GET /api/projects - List projects with filters and pagination
 * POST /api/projects - Create a new project
 * 
 * @module api/projects
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/rbac";
import { PERMISSIONS } from "@/config/roles";
import {
  listProjects,
  createProject,
} from "@/server/projects/project-service";
import { logger } from "@/lib/logger";
import { z } from "zod";
import type {
  ProjectStatus,
  ProjectVisibility,
} from "@/server/projects/types";
import { CreateProjectBodySchema } from "@/server/projects/schemas";

/**
 * Zod schema for project list query parameters
 */
const ListProjectsQuerySchema = z.object({
  teamId: z.string().uuid(),
  status: z.enum(["active", "archived"]).optional(),
  visibility: z.enum(["public", "private"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Note: CreateProjectBodySchema is imported from @/server/projects/schemas
// This ensures a single source of truth for validation

/**
 * GET /api/projects
 * 
 * List projects with filters, pagination, and user-specific access control.
 * 
 * Query parameters:
 * - teamId: string (required) - Team ID to list projects for
 * - status: "active" | "archived" (optional) - Filter by project status
 * - visibility: "public" | "private" (optional) - Filter by visibility
 * - search: string (optional) - Search in name, key, or description
 * - page: number (optional, default: 1) - Page number for pagination
 * - limit: number (optional, default: 20, max: 100) - Items per page
 * 
 * Success response (200):
 * {
 *   "items": [
 *     {
 *       "id": "uuid",
 *       "teamId": "uuid",
 *       "name": "Project Name",
 *       "key": "PRJ",
 *       "slug": "project-name",
 *       "description": "Description",
 *       "icon": "icon-url",
 *       "visibility": "public",
 *       "status": "active",
 *       "createdAt": "2024-01-01T00:00:00.000Z",
 *       "updatedAt": "2024-01-01T00:00:00.000Z",
 *       "deletedAt": null,
 *       "stats": {
 *         "totalTickets": 0,
 *         "completedTickets": 0,
 *         "progressPercent": 0,
 *         "memberCount": 1
 *       },
 *       "userRole": "owner",
 *       "canJoin": false
 *     }
 *   ],
 *   "total": 1,
 *   "page": 1,
 *   "limit": 20,
 *   "totalPages": 1
 * }
 * 
 * Error responses:
 * - 400: Invalid query parameters
 * - 401: Not authenticated
 * - 500: Internal server error
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

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

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      teamId: searchParams.get("teamId"),
      status: searchParams.get("status") || undefined,
      visibility: searchParams.get("visibility") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    };

    const validation = ListProjectsQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "Invalid query parameters",
            details: validation.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { teamId, status, visibility, search, page, limit } =
      validation.data;

    // List projects with filters and pagination
    // Access control is handled by listProjects() via userId
    const result = await listProjects({
      teamId,
      userId: user.id,
      status: status as ProjectStatus | undefined,
      visibility: visibility as ProjectVisibility | undefined,
      search,
      page,
      limit,
    });

    logger.info("api.projects.list.success", {
      requestId,
      userId: user.id,
      teamId,
      projectCount: result.items.length,
      total: result.total,
      page: result.page,
    });

    // Serialize dates to strings and transform to match frontend contract
    const serializedResult = {
      projects: result.items.map((project) => ({
        ...project,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        deletedAt: project.deletedAt?.toISOString() ?? null,
      })),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };

    return NextResponse.json(serializedResult, { status: 200 });
  } catch (error) {
    console.error("GET projects error:", error);
    logger.error("api.projects.list.error", {
      requestId,
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
 * POST /api/projects
 * 
 * Create a new project. Requires PROJECT_CREATE permission.
 * The creator is automatically assigned as PROJECT_OWNER and promoted to TEAM_EDITOR.
 * 
 * Request body:
 * {
 *   "teamId": "uuid",
 *   "name": "Project Name",
 *   "key": "PRJ",
 *   "description": "Optional description",
 *   "icon": "icon-url",
 *   "visibility": "private",
 *   "status": "active"
 * }
 * 
 * Success response (201):
 * {
 *   "project": {
 *     "id": "uuid",
 *     "teamId": "uuid",
 *     "name": "Project Name",
 *     "key": "PRJ",
 *     "slug": "project-name",
 *     "description": "Description",
 *     "icon": "icon-url",
 *     "visibility": "private",
 *     "status": "active",
 *     "createdAt": "2024-01-01T00:00:00.000Z",
 *     "updatedAt": "2024-01-01T00:00:00.000Z",
 *     "deletedAt": null
 *   }
 * }
 * 
 * Error responses:
 * - 400: Invalid input
 * - 401: Not authenticated
 * - 403: Insufficient permissions (no PROJECT_CREATE permission)
 * - 409: Duplicate project key or slug
 * - 500: Internal server error
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

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
    const validation = CreateProjectBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "Invalid project data",
            details: validation.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { teamId, name, key, description, icon, visibility } =
      validation.data;

    // Check PROJECT_CREATE permission
    const canCreate = await hasPermission({
      userId: user.id,
      permission: PERMISSIONS.PROJECT_CREATE,
      resourceId: teamId,
      resourceType: "team",
    });

    if (!canCreate) {
      logger.warn("api.projects.create.forbidden", {
        requestId,
        userId: user.id,
        teamId,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to create projects",
          },
        },
        { status: 403 }
      );
    }

    // Create project
    const project = await createProject(
      {
        teamId,
        name,
        key,
        description: description ?? undefined,
        icon: icon ?? undefined,
        visibility: visibility as ProjectVisibility | undefined,
      },
      user.id
    );

    logger.info("api.projects.create.success", {
      requestId,
      userId: user.id,
      teamId,
      projectId: project.id,
      projectKey: project.key,
    });

    // Serialize dates to strings for API response
    const serializedProject = {
      ...project,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      deletedAt: project.deletedAt?.toISOString() ?? null,
    };

    return NextResponse.json(
      serializedProject,
      { status: 201 }
    );
  } catch (error) {
    console.error("POST projects error:", error);
    logger.error("api.projects.create.error", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Handle specific errors
    if (error instanceof Error) {
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

      if (error.message.includes("Invalid project key")) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_PROJECT_KEY",
              message: error.message,
            },
          },
          { status: 400 }
        );
      }

      if (error.message.includes("already exists")) {
        return NextResponse.json(
          {
            error: {
              code: "DUPLICATE_KEY",
              message: "A project with this key already exists in this team",
            },
          },
          { status: 409 }
        );
      }
    }

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
