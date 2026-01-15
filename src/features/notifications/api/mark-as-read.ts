/**
 * MARK AS READ API
 * Marks a specific notification as read
 */

import {
  MarkAsReadResponseSchema,
  type MarkAsReadResponse,
} from "./types";

// ============================================================================
// API CALLER
// ============================================================================

/**
 * Marks a notification as read
 *
 * @example
 * const { success } = await markAsRead('notification-id-123')
 */
export async function markAsRead(notificationId: string): Promise<MarkAsReadResponse> {
  if (!notificationId) {
    throw new Error("Notification ID is required");
  }

  const response = await fetch(`/api/notifications/${notificationId}/read`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error?.message || `Failed to mark notification as read: ${response.statusText}`);
  }

  const data = await response.json();
  return MarkAsReadResponseSchema.parse(data);
}
