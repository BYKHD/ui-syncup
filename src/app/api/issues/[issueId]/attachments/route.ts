/**
 * Issue Attachments API Route
 *
 * GET /api/issues/[issueId]/attachments - List attachments for an issue
 * POST /api/issues/[issueId]/attachments - Create a new attachment record
 *
 * @module api/issues/[issueId]/attachments
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/rbac";
import { PERMISSIONS } from "@/config/roles";
import { getIssueById } from "@/server/issues/issue-service";
import {
  getAttachmentsByIssue,
  createAttachment,
} from "@/server/issues/attachment-service";
import { generateDownloadUrl } from "@/lib/storage";
import { logger } from "@/lib/logger";
import { z } from "zod";
import type { AttachmentReviewVariant } from "@/server/issues/types";

/**
 * Zod schema for attachment creation
 */
const CreateAttachmentBodySchema = z.object({
  fileName: z.string().min(1, "File name is required").max(255),
  fileSize: z.number().int().positive("File size must be positive"),
  fileType: z.string().min(1, "File type is required").max(50),
  url: z.string().min(1, "Storage key is required"),
  thumbnailUrl: z.string().url().optional().nullable(),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  reviewVariant: z.enum(["as_is", "to_be", "reference"]).default("as_is"),
  annotations: z.array(z.any()).optional(),
});

/**
 * GET /api/issues/[issueId]/attachments
 *
 * List all attachments for an issue.
 * Requires ISSUE_VIEW permission (PROJECT_VIEWER+).
 *
 * Success response (200):
 * {
 *   "attachments": [
 *     {
 *       "id": "uuid",
 *       "issueId": "uuid",
 *       "fileName": "screenshot.png",
 *       "fileSize": 123456,
 *       "fileType": "image/png",
 *       "url": "https://...",
 *       "uploadedBy": { "id": "uuid", "name": "User Name", ... },
 *       "createdAt": "2024-01-01T00:00:00.000Z"
 *     }
 *   ]
 * }
 *
 * Error responses:
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 404: Issue not found
 * - 500: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  const requestId = crypto.randomUUID();
  const { issueId } = await params;

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

    // Get issue first to get projectId for permission check
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

    // Check ISSUE_VIEW permission on the project
    const canView = await hasPermission({
      userId: user.id,
      permission: PERMISSIONS.ISSUE_VIEW,
      resourceId: issue.projectId,
      resourceType: "project",
    });

    if (!canView) {
      logger.warn("api.issue.attachments.list.forbidden", {
        requestId,
        userId: user.id,
        issueId,
        projectId: issue.projectId,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to view this issue's attachments",
          },
        },
        { status: 403 }
      );
    }

    // Get attachments
    const attachments = await getAttachmentsByIssue(issueId);

    logger.info("api.issue.attachments.list.success", {
      requestId,
      userId: user.id,
      issueId,
      attachmentCount: attachments.length,
    });

    // Generate presigned download URLs for each attachment so the client can
    // display files even when the bucket has Block Public Access enabled.
    // att.url is the full storage key (e.g. attachments/issues/{t}/{p}/{i}/{uuid}.png)
    const serializedAttachments = await Promise.all(
      attachments.map(async (att) => {
        let downloadUrl: string | null = null;
        try {
          downloadUrl = await generateDownloadUrl(att.url);
        } catch {
          // Non-fatal: client will fall back to the stored key
        }
        return {
          ...att,
          createdAt: att.createdAt.toISOString(),
          downloadUrl, // presigned GET URL; null if generation failed
        };
      })
    );

    return NextResponse.json({ attachments: serializedAttachments }, { status: 200 });
  } catch (error) {
    console.error("GET issue attachments error:", error);
    logger.error("api.issue.attachments.list.error", {
      requestId,
      issueId,
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
 * POST /api/issues/[issueId]/attachments
 *
 * Create a new attachment record for an issue.
 * The actual file should already be uploaded to R2 before calling this.
 * Requires ISSUE_CREATE or ISSUE_UPDATE permission (PROJECT_EDITOR+).
 *
 * Request body:
 * {
 *   "fileName": "screenshot.png",
 *   "fileSize": 123456,
 *   "fileType": "image/png",
 *   "url": "https://r2.example.com/path/to/file",
 *   "thumbnailUrl": "https://r2.example.com/path/to/thumb",
 *   "width": 1920,
 *   "height": 1080,
 *   "reviewVariant": "as_is"
 * }
 *
 * Success response (201):
 * {
 *   "attachment": { ... }
 * }
 *
 * Error responses:
 * - 400: Invalid input or file size limit exceeded
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 404: Issue not found
 * - 500: Internal server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  const requestId = crypto.randomUUID();
  const { issueId } = await params;

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
    const validation = CreateAttachmentBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "Invalid attachment data",
            details: validation.error.issues,
          },
        },
        { status: 400 }
      );
    }

    // Get issue first to get projectId for permission check
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

    // Check ISSUE_CREATE permission on the project (PROJECT_EDITOR+ can add attachments)
    const canCreate = await hasPermission({
      userId: user.id,
      permission: PERMISSIONS.ISSUE_CREATE,
      resourceId: issue.projectId,
      resourceType: "project",
    });

    if (!canCreate) {
      logger.warn("api.issue.attachments.create.forbidden", {
        requestId,
        userId: user.id,
        issueId,
        projectId: issue.projectId,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to add attachments to this issue",
          },
        },
        { status: 403 }
      );
    }

    const {
      fileName,
      fileSize,
      fileType,
      url,
      thumbnailUrl,
      width,
      height,
      reviewVariant,
      annotations,
    } = validation.data;

    // Create attachment with denormalized tenant fields from issue
    const attachment = await createAttachment(
      {
        teamId: issue.teamId,
        projectId: issue.projectId,
        issueId,
        uploadedById: user.id,
        fileName,
        fileSize,
        fileType,
        url,
        thumbnailUrl,
        width,
        height,
        reviewVariant: reviewVariant as AttachmentReviewVariant,
        annotations,
      },
      user.id
    );

    logger.info("api.issue.attachments.create.success", {
      requestId,
      userId: user.id,
      issueId,
      attachmentId: attachment.id,
      fileName,
      fileSize,
    });

    // Generate a presigned download URL so the client can preview the
    // attachment immediately without a separate GET request.
    let downloadUrl: string | null = null;
    try {
      downloadUrl = await generateDownloadUrl(attachment.url);
    } catch {
      // Non-fatal: client will retry on next GET
    }

    // Serialize dates
    const serializedAttachment = {
      ...attachment,
      createdAt: attachment.createdAt.toISOString(),
      downloadUrl,
    };

    return NextResponse.json({ attachment: serializedAttachment }, { status: 201 });
  } catch (error) {
    console.error("POST issue attachment error:", error);
    logger.error("api.issue.attachments.create.error", {
      requestId,
      issueId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes("exceeds maximum") || error.message.includes("limit per issue")) {
        return NextResponse.json(
          {
            error: {
              code: "FILE_SIZE_LIMIT_EXCEEDED",
              message: error.message,
            },
          },
          { status: 400 }
        );
      }

      if (error.message.includes("File size must be greater than 0")) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_FILE_SIZE",
              message: error.message,
            },
          },
          { status: 400 }
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
