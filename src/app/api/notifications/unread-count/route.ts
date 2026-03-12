/**
 * Notifications Unread Count API Route
 *
 * GET /api/notifications/unread-count - Get unread notification count
 *
 * Lightweight endpoint for badge display and polling fallback.
 * Performance target: < 100ms
 *
 * @module api/notifications/unread-count
 */

import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { getUnreadCount } from "@/server/notifications/notification-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/notifications/unread-count
 *
 * Returns the count of unread notifications for the authenticated user.
 * Used for notification bell badge and as polling fallback when
 * Supabase Realtime is unavailable.
 *
 * Success response (200):
 * { "count": number }
 *
 * Error responses:
 * - 401: Not authenticated
 * - 500: Internal server error
 */
export async function GET() {
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

    // Fetch unread count from service layer
    const count = await getUnreadCount(user.id);

    logger.debug("api.notifications.unread_count.success", {
      requestId,
      userId: user.id,
      count,
    });

    return NextResponse.json({ count }, { status: 200 });
  } catch (error) {
    logger.error("api.notifications.unread_count.error", {
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
