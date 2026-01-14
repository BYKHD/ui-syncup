/**
 * Mark All Notifications as Read API Route
 *
 * POST /api/notifications/read-all - Mark all notifications as read
 *
 * @module api/notifications/read-all
 */

import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { markAllAsRead } from "@/server/notifications/notification-service";
import { logger } from "@/lib/logger";

/**
 * POST /api/notifications/read-all
 *
 * Marks all unread notifications as read for the authenticated user.
 *
 * Success response (200):
 * { "updated": number }
 *
 * Error responses:
 * - 401: Not authenticated
 * - 500: Internal server error
 */
export async function POST() {
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

    // Mark all notifications as read
    const updated = await markAllAsRead(user.id);

    logger.info("api.notifications.mark_all_read.success", {
      requestId,
      userId: user.id,
      updated,
    });

    return NextResponse.json({ updated }, { status: 200 });
  } catch (error) {
    logger.error("api.notifications.mark_all_read.error", {
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
