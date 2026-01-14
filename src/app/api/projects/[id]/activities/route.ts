/**
 * Project Activities API Route
 *
 * GET /api/projects/[id]/activities - Get project activity log
 *
 * @module api/projects/[id]/activities
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/rbac";
import { PERMISSIONS } from "@/config/roles";
import { getProjectActivities } from "@/server/projects/activity-service";
import { logger } from "@/lib/logger";

// ============================================================================
// SECURITY: Email Masking for PII Protection
// ============================================================================

/**
 * Mask email address for privacy (preserves first/last char and domain)
 * Example: "john.doe@example.com" -> "j***e@example.com"
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const maskedLocal =
    local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : "***";
  return `${maskedLocal}@${domain}`;
}

/**
 * Activity types that contain email addresses in metadata
 */
const EMAIL_METADATA_TYPES = [
  "invitation_sent",
  "invitation_declined",
  "invitation_revoked",
  "invitation_email_failed",
];

/**
 * Sanitize activity metadata to mask PII before API response
 */
function sanitizeMetadata(
  metadata: Record<string, unknown>,
  type: string
): Record<string, unknown> {
  if (
    EMAIL_METADATA_TYPES.includes(type) &&
    typeof metadata.email === "string"
  ) {
    return {
      ...metadata,
      email: maskEmail(metadata.email),
    };
  }
  return metadata;
}

/**
 * GET /api/projects/[id]/activities
 *
 * Get project activities.
 * Requires PROJECT_VIEW permission.
 *
 * Success response (200):
 * {
 *   "activities": [
 *     {
 *       "id": "uuid",
 *       "teamId": "uuid",
 *       "projectId": "uuid",
 *       "actorId": "uuid" | null,
 *       "type": "invitation_sent",
 *       "metadata": {},
 *       "createdAt": "2024-01-01T00:00:00.000Z",
 *       "actor": { ... } | null
 *     }
 *   ]
 * }
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

    // Check PROJECT_VIEW permission
    // We check permission explicitly here since we're calling a service that might not check it
    // (Note: getProject in route.ts includes access control, but getProjectActivities might not)
    const canView = await hasPermission({
      userId: user.id,
      permission: PERMISSIONS.PROJECT_VIEW,
      resourceId: projectId,
      resourceType: "project",
    });

    if (!canView) {
      logger.warn("api.projects.activities.forbidden", {
        requestId,
        userId: user.id,
        projectId,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to view activities for this project",
          },
        },
        { status: 403 }
      );
    }

    // Get activities
    const result = await getProjectActivities({ projectId });
    const activities = result.items;

    logger.info("api.projects.activities.success", {
      requestId,
      userId: user.id,
      projectId,
      count: activities.length,
    });

    // Serialize dates to strings for API response and sanitize PII
    const serializedActivities = activities.map((activity) => ({
      ...activity,
      metadata: sanitizeMetadata(activity.metadata, activity.type),
      createdAt: activity.createdAt.toISOString(),
    }));

    return NextResponse.json(
      { activities: serializedActivities },
      { status: 200 }
    );
  } catch (error) {
    logger.error("api.projects.activities.error", {
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
