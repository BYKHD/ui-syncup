/**
 * Notifications API Route
 *
 * GET /api/notifications - List notifications for authenticated user (paginated)
 *
 * @module api/notifications
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/server/auth/session";
import { getNotifications } from "@/server/notifications/notification-service";
import { logger } from "@/lib/logger";

/**
 * Query parameter schema for GET /api/notifications
 */
const GetNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
  unreadOnly: z
    .string()
    .transform((val) => val === "true")
    .optional()
    .default(false),
});

/**
 * GET /api/notifications
 *
 * Returns a paginated list of notifications for the authenticated user.
 * Ordered by created_at DESC (newest first).
 *
 * Query Parameters:
 * - limit: Number of notifications to return (1-100, default: 20)
 * - cursor: ISO timestamp for cursor-based pagination
 * - unreadOnly: If "true", only return unread notifications
 *
 * Success response (200):
 * {
 *   "notifications": [...],
 *   "nextCursor": "2024-01-01T00:00:00.000Z" | null,
 *   "hasMore": boolean,
 *   "totalUnread": number
 * }
 *
 * Error responses:
 * - 401: Not authenticated
 * - 400: Invalid query parameters
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
    const queryResult = GetNotificationsQuerySchema.safeParse({
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      unreadOnly: searchParams.get("unreadOnly") ?? undefined,
    });

    if (!queryResult.success) {
      logger.warn("api.notifications.list.validation_error", {
        requestId,
        userId: user.id,
        errors: queryResult.error.flatten(),
      });

      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Invalid query parameters",
            details: queryResult.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const { limit, cursor, unreadOnly } = queryResult.data;

    // Fetch notifications from service layer
    const result = await getNotifications(user.id, {
      limit,
      cursor,
      unreadOnly,
    });

    logger.info("api.notifications.list.success", {
      requestId,
      userId: user.id,
      count: result.notifications.length,
      hasMore: result.hasMore,
      unreadOnly,
    });

    // Serialize dates to ISO strings for API response
    const serializedNotifications = result.notifications.map((notification) => ({
      ...notification,
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    }));

    return NextResponse.json(
      {
        notifications: serializedNotifications,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
        totalUnread: result.totalUnread,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("api.notifications.list.error", {
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
