/**
 * DELETE NOTIFICATION
 * API fetcher for dismissing a single notification
 */

export interface DeleteNotificationResponse {
  success: boolean;
}

/**
 * Delete (dismiss) a notification by ID.
 *
 * @param notificationId - UUID of the notification to delete
 */
export async function deleteNotification(
  notificationId: string
): Promise<DeleteNotificationResponse> {
  const res = await fetch(`/api/notifications/${notificationId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error("Failed to delete notification");
  }

  return res.json();
}
