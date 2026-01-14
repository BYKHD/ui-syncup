/**
 * GET NOTIFICATIONS API
 * Fetches a paginated list of notifications for the current user
 */

import {
  GetNotificationsParamsSchema,
  GetNotificationsResponseSchema,
  type GetNotificationsParams,
  type GetNotificationsResponse,
} from "./types";

// ============================================================================
// API CALLER
// ============================================================================

/**
 * Fetches notifications for the authenticated user
 *
 * @example
 * const { notifications, nextCursor, hasMore, totalUnread } = await getNotifications({
 *   limit: 20,
 *   cursor: '2024-01-01T00:00:00.000Z',
 *   unreadOnly: true
 * })
 */
export async function getNotifications(
  params: Partial<GetNotificationsParams> = {}
): Promise<GetNotificationsResponse> {
  // Validate and apply defaults
  const validatedParams = GetNotificationsParamsSchema.parse(params);

  // Build query string
  const queryParams = new URLSearchParams();
  queryParams.append("limit", validatedParams.limit.toString());
  if (validatedParams.cursor) {
    queryParams.append("cursor", validatedParams.cursor);
  }
  if (validatedParams.unreadOnly) {
    queryParams.append("unreadOnly", "true");
  }

  const response = await fetch(`/api/notifications?${queryParams.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error?.message || `Failed to fetch notifications: ${response.statusText}`);
  }

  const data = await response.json();
  return GetNotificationsResponseSchema.parse(data);
}
