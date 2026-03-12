/**
 * MARK ALL AS READ API
 * Marks all notifications as read for the current user
 */

import {
  MarkAllAsReadResponseSchema,
  type MarkAllAsReadResponse,
} from "./types";

// ============================================================================
// API CALLER
// ============================================================================

/**
 * Marks all notifications as read for the authenticated user
 *
 * @example
 * const { updated } = await markAllAsRead()
 */
export async function markAllAsRead(): Promise<MarkAllAsReadResponse> {
  const response = await fetch("/api/notifications/read-all", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error?.message || `Failed to mark all as read: ${response.statusText}`);
  }

  const data = await response.json();
  return MarkAllAsReadResponseSchema.parse(data);
}
