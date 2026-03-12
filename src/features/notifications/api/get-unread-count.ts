/**
 * GET UNREAD COUNT API
 * Fetches the count of unread notifications for badge display
 */

import {
  GetUnreadCountResponseSchema,
  type GetUnreadCountResponse,
} from "./types";

// ============================================================================
// API CALLER
// ============================================================================

/**
 * Fetches unread notification count for the authenticated user
 *
 * @example
 * const { count } = await getUnreadCount()
 */
export async function getUnreadCount(): Promise<GetUnreadCountResponse> {
  const response = await fetch("/api/notifications/unread-count", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error?.message || `Failed to fetch unread count: ${response.statusText}`);
  }

  const data = await response.json();
  return GetUnreadCountResponseSchema.parse(data);
}
