/**
 * Annotations API Route
 *
 * GET /api/issues/[issueId]/attachments/[attachmentId]/annotations - List annotations
 * POST /api/issues/[issueId]/attachments/[attachmentId]/annotations - Create annotation
 *
 * Requirements: 1.2, 1.3, 1.4, 2.1, 2.2, 7.1, 10.1, 10.2
 *
 * @module api/issues/[issueId]/attachments/[attachmentId]/annotations
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { getIssueById } from "@/server/issues/issue-service";
import { getAttachment } from "@/server/issues/attachment-service";
import {
  getAnnotationsByAttachment,
  createAnnotation,
  getAnnotationPermissions,
  canPerformAction,
  AnnotationLimitError,
  AttachmentNotFoundError,
} from "@/server/annotations";
import { logAnnotationCreated } from "@/server/issues/activity-service";
import { logger } from "@/lib/logger";
import { CreateAnnotationSchema } from "@/features/annotations/api/schemas";
import { users } from "@/server/db/schema/users";
import { db } from "@/lib/db";
import { inArray } from "drizzle-orm";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Enriches annotations with author information
 */
async function enrichAnnotationsWithAuthors(
  annotations: Array<{
    id: string;
    authorId: string;
    x: number;
    y: number;
    shape: unknown;
    label: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    comments: Array<{
      id: string;
      authorId: string;
      message: string;
      createdAt: string;
      updatedAt: string;
    }>;
  }>
) {
  if (annotations.length === 0) {
    return [];
  }

  // Collect all unique author IDs from annotations and comments
  const authorIds = new Set<string>();
  for (const annotation of annotations) {
    authorIds.add(annotation.authorId);
    for (const comment of annotation.comments) {
      authorIds.add(comment.authorId);
    }
  }

  // Fetch all authors in a single query
  const authorsList = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.image,
    })
    .from(users)
    .where(inArray(users.id, Array.from(authorIds)));

  // Create lookup map for O(1) access
  const authorMap = new Map(authorsList.map((a) => [a.id, a]));

  // Enrich annotations and comments with author info
  return annotations.map((annotation) => ({
    ...annotation,
    author: authorMap.get(annotation.authorId) || {
      id: annotation.authorId,
      name: "Unknown User",
      email: null,
      avatarUrl: null,
    },
    comments: annotation.comments.map((comment) => ({
      ...comment,
      author: authorMap.get(comment.authorId) || {
        id: comment.authorId,
        name: "Unknown User",
        email: null,
        avatarUrl: null,
      },
    })),
  }));
}

// ============================================================================
// GET - List annotations
// ============================================================================

/**
 * GET /api/issues/[issueId]/attachments/[attachmentId]/annotations
 *
 * List all annotations for an attachment with author information.
 * Requires VIEW permission on the project.
 *
 * Success response (200):
 * {
 *   "annotations": [
 *     {
 *       "id": "uuid",
 *       "authorId": "uuid",
 *       "author": { "id": "uuid", "name": "User Name", "avatarUrl": "..." },
 *       "x": 0.5,
 *       "y": 0.3,
 *       "shape": { "type": "pin", "position": { "x": 0.5, "y": 0.3 } },
 *       "label": "1",
 *       "description": "Description text",
 *       "createdAt": "2024-01-01T00:00:00.000Z",
 *       "updatedAt": "2024-01-01T00:00:00.000Z",
 *       "comments": [...]
 *     }
 *   ]
 * }
 *
 * Error responses:
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 404: Issue or attachment not found
 * - 500: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string; attachmentId: string }> }
) {
  const requestId = crypto.randomUUID();
  const { issueId, attachmentId } = await params;

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

    // Validate issue exists
    const issue = await getIssueById(issueId);

    if (!issue) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Issue not found",
          },
        },
        { status: 404 }
      );
    }

    // Validate attachment exists and belongs to issue
    const attachment = await getAttachment(attachmentId);

    if (!attachment || attachment.issueId !== issueId) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Attachment not found",
          },
        },
        { status: 404 }
      );
    }

    // Check view permissions
    const permissions = await getAnnotationPermissions(
      user.id,
      issue.teamId,
      issue.projectId
    );

    if (!canPerformAction(permissions, "view")) {
      logger.warn("api.annotations.list.forbidden", {
        requestId,
        userId: user.id,
        attachmentId,
        issueId,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to view annotations",
          },
        },
        { status: 403 }
      );
    }

    // Get annotations
    const result = await getAnnotationsByAttachment(attachmentId);

    // Enrich with author information and inject attachmentId
    const enrichedAnnotations = await enrichAnnotationsWithAuthors(
      result.annotations
    );

    const baseAnnotations = enrichedAnnotations.map(annotation => ({
      ...annotation,
      attachmentId, // Explicitly inject attachmentId
    }));

    logger.info("api.annotations.list.success", {
      requestId,
      userId: user.id,
      attachmentId,
      annotationCount: result.annotations.length,
    });

    return NextResponse.json(
      { annotations: baseAnnotations },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET annotations error:", error);
    logger.error("api.annotations.list.error", {
      requestId,
      attachmentId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof AttachmentNotFoundError) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Attachment not found",
          },
        },
        { status: 404 }
      );
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

// ============================================================================
// POST - Create annotation
// ============================================================================

/**
 * POST /api/issues/[issueId]/attachments/[attachmentId]/annotations
 *
 * Create a new annotation on an attachment.
 * Requires CREATE permission (TEAM_MEMBER+).
 *
 * Request body:
 * {
 *   "shape": { "type": "pin", "position": { "x": 0.5, "y": 0.3 } },
 *   "description": "Optional description"
 * }
 *
 * Success response (201):
 * {
 *   "annotation": {
 *     "id": "uuid",
 *     "author": { ... },
 *     ...
 *   }
 * }
 *
 * Error responses:
 * - 400: Invalid input or annotation limit exceeded
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 404: Issue or attachment not found
 * - 500: Internal server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string; attachmentId: string }> }
) {
  const requestId = crypto.randomUUID();
  const { issueId, attachmentId } = await params;

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

    // Validate issue exists
    const issue = await getIssueById(issueId);

    if (!issue) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Issue not found",
          },
        },
        { status: 404 }
      );
    }

    // Validate attachment exists and belongs to issue
    const attachment = await getAttachment(attachmentId);

    if (!attachment || attachment.issueId !== issueId) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Attachment not found",
          },
        },
        { status: 404 }
      );
    }

    // Check create permissions
    const permissions = await getAnnotationPermissions(
      user.id,
      issue.teamId,
      issue.projectId
    );

    if (!canPerformAction(permissions, "create")) {
      logger.warn("api.annotations.create.forbidden", {
        requestId,
        userId: user.id,
        attachmentId,
        issueId,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to create annotations",
          },
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();

    // Use a subset of the schema for route-level validation
    const RouteCreateSchema = CreateAnnotationSchema.pick({
      shape: true,
      description: true,
    });

    const validation = RouteCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "Invalid annotation data",
            details: validation.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { shape, description } = validation.data;

    // Create annotation
    const result = await createAnnotation({
      attachmentId,
      authorId: user.id,
      shape,
      description,
    });

    // Log activity
    await logAnnotationCreated(
      issue.teamId,
      issue.projectId,
      issueId,
      user.id,
      {
        annotationId: result.annotation.id,
        attachmentId,
        annotationType: shape.type,
        label: result.annotation.label,
      }
    );

    // Fetch author info to return with response
    const [author] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.image,
      })
      .from(users)
      .where(inArray(users.id, [user.id]))
      .limit(1);

    const enrichedAnnotation = {
      ...result.annotation,
      attachmentId, // Explicitly inject attachmentId
      author: author || {
        id: user.id,
        name: "Unknown User",
        email: null,
        avatarUrl: null,
      },
    };

    logger.info("api.annotations.create.success", {
      requestId,
      userId: user.id,
      attachmentId,
      annotationId: result.annotation.id,
      shapeType: shape.type,
    });

    return NextResponse.json(
      { annotation: enrichedAnnotation },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST annotation error:", error);
    logger.error("api.annotations.create.error", {
      requestId,
      attachmentId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof AnnotationLimitError) {
      return NextResponse.json(
        {
          error: {
            code: "ANNOTATION_LIMIT_EXCEEDED",
            message: error.message,
          },
        },
        { status: 400 }
      );
    }

    if (error instanceof AttachmentNotFoundError) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Attachment not found",
          },
        },
        { status: 404 }
      );
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
