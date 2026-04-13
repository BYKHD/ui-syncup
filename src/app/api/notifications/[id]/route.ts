/**
 * Notification by ID API Route
 *
 * DELETE /api/notifications/[id] - Delete (dismiss) a specific notification
 *
 * @module api/notifications/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/server/auth/session";
import { deleteNotification } from "@/server/notifications/notification-service";
import { logger } from "@/lib/logger";

/**
 * Path parameter schema
 */
const ParamsSchema = z.object({
  id: z.string().uuid("Invalid notification ID"),
});

/**
 * DELETE /api/notifications/[id]
 *
 * Deletes a specific notification for the authenticated user.
 * Only the notification owner can delete it (enforced by recipient check).
 *
 * Path Parameters:
 * - id: UUID of the notification to delete
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
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const { id: notificationId } = await params;

  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const paramsResult = ParamsSchema.safeParse({ id: notificationId });

    if (!paramsResult.success) {
      logger.warn("api.notifications.delete.validation_error", {
        requestId,
        userId: user.id,
        notificationId,
        errors: paramsResult.error.flatten(),
      });

      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid notification ID" } },
        { status: 400 }
      );
    }

    const deleted = await deleteNotification(user.id, notificationId);

    if (deleted === 0) {
      logger.warn("api.notifications.delete.not_found", {
        requestId,
        userId: user.id,
        notificationId,
      });

      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Notification not found" } },
        { status: 404 }
      );
    }

    logger.info("api.notifications.delete.success", {
      requestId,
      userId: user.id,
      notificationId,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error("api.notifications.delete.error", {
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
