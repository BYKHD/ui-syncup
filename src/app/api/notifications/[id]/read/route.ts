/**
 * Mark Notification as Read API Route
 *
 * PATCH /api/notifications/[id]/read - Mark a specific notification as read
 *
 * @module api/notifications/[id]/read
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/server/auth/session";
import { markAsRead } from "@/server/notifications/notification-service";
import { logger } from "@/lib/logger";

/**
 * Path parameter schema
 */
const ParamsSchema = z.object({
  id: z.string().uuid("Invalid notification ID"),
});

/**
 * PATCH /api/notifications/[id]/read
 *
 * Marks a specific notification as read for the authenticated user.
 * Only the notification owner can mark it as read (enforced by RLS).
 *
 * Path Parameters:
 * - id: UUID of the notification to mark as read
 *
 * Success response (200):
 * { "success": true }
 *
 * Error responses:
 * - 401: Not authenticated
 * - 400: Invalid notification ID
 * - 404: Notification not found or not owned by user
 * - 500: Internal server error
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const { id: notificationId } = await params;

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

    // Validate notification ID
    const paramsResult = ParamsSchema.safeParse({ id: notificationId });

    if (!paramsResult.success) {
      logger.warn("api.notifications.mark_read.validation_error", {
        requestId,
        userId: user.id,
        notificationId,
        errors: paramsResult.error.flatten(),
      });

      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Invalid notification ID",
          },
        },
        { status: 400 }
      );
    }

    // Mark notification as read
    const updated = await markAsRead(user.id, [notificationId]);

    if (updated === 0) {
      logger.warn("api.notifications.mark_read.not_found", {
        requestId,
        userId: user.id,
        notificationId,
      });

      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Notification not found",
          },
        },
        { status: 404 }
      );
    }

    logger.info("api.notifications.mark_read.success", {
      requestId,
      userId: user.id,
      notificationId,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error("api.notifications.mark_read.error", {
      requestId,
      notificationId,
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
