/**
 * USE MARK AS READ HOOK
 * React Query mutation for marking a notification as read
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markAsRead } from "../api";
import { notificationKeys } from "./use-notifications";
import type { MarkAsReadResponse, GetNotificationsResponse } from "../api";

// ============================================================================
// HOOK
// ============================================================================

export interface UseMarkAsReadOptions {
  onSuccess?: (data: MarkAsReadResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseMarkAsReadResult {
  mutate: (notificationId: string) => void;
  mutateAsync: (notificationId: string) => Promise<MarkAsReadResponse>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * Mutation hook for marking a notification as read
 *
 * Features optimistic updates for instant UI feedback.
 *
 * @example
 * const { mutate } = useMarkAsRead({
 *   onSuccess: () => console.log('Marked as read!')
 * })
 * mutate('notification-id-123')
 */
export function useMarkAsRead(options?: UseMarkAsReadOptions): UseMarkAsReadResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (notificationId: string) => markAsRead(notificationId),
    onMutate: async (notificationId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      // Snapshot previous value
      const previousNotifications = queryClient.getQueryData<GetNotificationsResponse>(
        notificationKeys.list({})
      );

      // Optimistically update the notification
      queryClient.setQueryData<GetNotificationsResponse>(
        notificationKeys.list({}),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            notifications: old.notifications.map((n) =>
              n.id === notificationId
                ? { ...n, readAt: new Date().toISOString() }
                : n
            ),
            totalUnread: Math.max(0, old.totalUnread - 1),
          };
        }
      );

      // Optimistically decrement unread count
      queryClient.setQueryData<number>(notificationKeys.unreadCount(), (old) =>
        Math.max(0, (old ?? 0) - 1)
      );

      return { previousNotifications };
    },
    onError: (_err, _notificationId, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          notificationKeys.list({}),
          context.previousNotifications
        );
      }
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      options?.onError?.(_err);
    },
    onSuccess: (data) => {
      options?.onSuccess?.(data);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    reset: mutation.reset,
  };
}
