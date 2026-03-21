/**
 * Project Issues API Routes
 *
 * GET /api/projects/[id]/issues - List issues with filters and pagination
 * POST /api/projects/[id]/issues - Create a new issue
 *
 * @module api/projects/[id]/issues
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/rbac";
import { PERMISSIONS } from "@/config/roles";
import { getIssuesByProject, createIssue } from "@/server/issues/issue-service";
import { canAccessProject } from "@/server/projects/project-service";
import { db } from "@/lib/db";
import { projects } from "@/server/db/schema/projects";
import { eq, or } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { z } from "zod";
import type {
  IssueStatus,
  IssueType,
  IssuePriority,
} from "@/server/issues/types";

/**
 * Zod schema for issue list query parameters
 */
const ListIssuesQuerySchema = z.object({
  status: z.enum(["open", "in_progress", "in_review", "resolved", "archived"]).optional(),
  type: z.enum(["bug", "visual", "accessibility", "content", "other"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assigneeId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Zod schema for issue creation
 */
const CreateIssueBodySchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title must be 255 characters or less"),
  description: z.string().max(10000).optional().nullable(),
  type: z.enum(["bug", "visual", "accessibility", "content", "other"]).default("bug"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: z.enum(["open", "in_progress", "in_review", "resolved", "archived"]).default("open"),
  assigneeId: z.string().uuid().optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable(),
  page: z.string().max(255).optional().nullable(),
  figmaLink: z.string().url().optional().nullable(),
  jiraLink: z.string().url().optional().nullable(),
});

/**
 * GET /api/projects/[id]/issues
 *
 * List issues for a project with filters and pagination.
 *
 * Query parameters:
 * - status: "open" | "in_progress" | "in_review" | "resolved" | "archived"
 * - type: "bug" | "visual" | "accessibility" | "content" | "other"
 * - priority: "low" | "medium" | "high" | "critical"
 * - assigneeId: UUID (optional)
 * - search: string (optional)
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 *
 * Success response (200):
 * {
 *   "issues": [...],
 *   "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
 * }
 *
 * Error responses:
 * - 400: Invalid query parameters
 * - 401: Not authenticated
 * - 403: Insufficient permissions
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

    // Get project to check visibility-aware access
    // This ensures consistent access control with the project detail page:
    // - Public projects: all team members can view issues
    // - Private projects: only project members can view issues
    // Get project to check visibility-aware access
    // Look up by ID, slug, or key to support all route patterns
    const idOrSlug = projectId;
    const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrSlug);

    const project = await db.query.projects.findFirst({
      where: isId 
        ? eq(projects.id, idOrSlug)
        : or(eq(projects.slug, idOrSlug), eq(projects.key, idOrSlug)),
      columns: { id: true, teamId: true, visibility: true },
    });

    if (!project) {
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

    const canView = await canAccessProject(user.id, project);

    if (!canView) {
      logger.warn("api.issues.list.forbidden", {
        requestId,
        userId: user.id,
        projectId,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to view issues in this project",
          },
        },
        { status: 403 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      status: searchParams.get("status") || undefined,
      type: searchParams.get("type") || undefined,
      priority: searchParams.get("priority") || undefined,
      assigneeId: searchParams.get("assigneeId") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    };

    const validation = ListIssuesQuerySchema.safeParse(queryParams);

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

    const { status, type, priority, assigneeId, search, page, limit } =
      validation.data;

    // List issues with filters and pagination
    const result = await getIssuesByProject({
      projectId: project.id,
      status: status as IssueStatus | undefined,
      type: type as IssueType | undefined,
      priority: priority as IssuePriority | undefined,
      assigneeId,
      search,
      page,
      limit,
    });

    logger.info("api.issues.list.success", {
      requestId,
      userId: user.id,
      projectId,
      issueCount: result.items.length,
      total: result.total,
      page: result.page,
    });

    // Serialize dates to strings
    const serializedResult = {
      issues: result.items.map((issue) => ({
        ...issue,
        createdAt: issue.createdAt.toISOString(),
        updatedAt: issue.updatedAt.toISOString(),
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
    console.error("GET issues error:", error);
    logger.error("api.issues.list.error", {
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
 * POST /api/projects/[id]/issues
 *
 * Create a new issue in a project.
 * Requires ISSUE_CREATE permission (PROJECT_EDITOR+).
 *
 * Request body:
 * {
 *   "title": "Issue Title",
 *   "description": "Optional description",
 *   "type": "bug",
 *   "priority": "medium",
 *   "status": "open",
 *   "assigneeId": "uuid",
 *   "page": "Homepage",
 *   "figmaLink": "https://figma.com/...",
 *   "jiraLink": "https://jira.com/..."
 * }
 *
 * Success response (201):
 * {
 *   "issue": { ... }
 * }
 *
 * Error responses:
 * - 400: Invalid input
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 500: Internal server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const { id: projectIdOrKey } = await params;
  let resolvedProjectId = projectIdOrKey;

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

    // Resolve project ID if key/slug is passed
    const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectIdOrKey);
    
    if (!isId) {
       const project = await db.query.projects.findFirst({
        where: or(eq(projects.slug, projectIdOrKey), eq(projects.key, projectIdOrKey)),
        columns: { id: true },
      });

      if (!project) {
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
      resolvedProjectId = project.id;
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = CreateIssueBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "Invalid issue data",
            details: validation.error.issues,
          },
        },
        { status: 400 }
      );
    }

    // Check ISSUE_CREATE permission
    const canCreate = await hasPermission({
      userId: user.id,
      permission: PERMISSIONS.ISSUE_CREATE,
      resourceId: resolvedProjectId,
      resourceType: "project",
    });

    if (!canCreate) {
      logger.warn("api.issues.create.forbidden", {
        requestId,
        userId: user.id,
        projectId: resolvedProjectId,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to create issues in this project",
          },
        },
        { status: 403 }
      );
    }

    const {
      title,
      description,
      type,
      priority,
      status,
      assigneeId,
      coverImageUrl,
      page,
      figmaLink,
      jiraLink,
    } = validation.data;

    // Create issue
    const issue = await createIssue({
      projectId: resolvedProjectId,
      reporterId: user.id,
      title,
      description,
      type: type as IssueType,
      priority: priority as IssuePriority,
      status: status as IssueStatus,
      assigneeId,
      coverImageUrl,
      page,
      figmaLink,
      jiraLink,
    });

    logger.info("api.issues.create.success", {
      requestId,
      userId: user.id,
      projectId: resolvedProjectId,
      issueId: issue.id,
      issueKey: issue.issueKey,
    });

    // Serialize dates to strings
    const serializedIssue = {
      ...issue,
      createdAt: issue.createdAt.toISOString(),
      updatedAt: issue.updatedAt.toISOString(),
    };

    return NextResponse.json({ issue: serializedIssue }, { status: 201 });
  } catch (error) {
    console.error("POST issues error:", error);
    logger.error("api.issues.create.error", {
      requestId,
      projectId: resolvedProjectId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes("Issue title is required")) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_TITLE",
              message: error.message,
            },
          },
          { status: 400 }
        );
      }

      if (error.message.includes("Project not found")) {
        return NextResponse.json(
          {
            error: {
              code: "PROJECT_NOT_FOUND",
              message: "The specified project was not found",
            },
          },
          { status: 404 }
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
