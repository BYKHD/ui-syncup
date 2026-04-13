/**
 * USE DELETE NOTIFICATION HOOK
 * React Query mutation for dismissing (deleting) a notification
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteNotification } from "../api";
import { notificationKeys } from "./use-notifications";
import type { DeleteNotificationResponse, GetNotificationsResponse } from "../api";

// ============================================================================
// HOOK
// ============================================================================

export interface UseDeleteNotificationOptions {
  onSuccess?: (data: DeleteNotificationResponse) => void;
  onError?: (error: Error) => void;
}

export interface DeleteNotificationVariables {
  notificationId: string;
  wasUnread?: boolean;
}

export interface UseDeleteNotificationResult {
  mutate: (notificationId: string, options?: { wasUnread?: boolean }) => void;
  mutateAsync: (notificationId: string, options?: { wasUnread?: boolean }) => Promise<DeleteNotificationResponse>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * Mutation hook for deleting (dismissing) a notification.
 *
 * Features optimistic updates for instant UI feedback.
 *
 * @example
 * const { mutate: deleteNotification } = useDeleteNotification()
 * deleteNotification('notification-id-123', { wasUnread: true })
 */
export function useDeleteNotification(
  options?: UseDeleteNotificationOptions
): UseDeleteNotificationResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ notificationId }: DeleteNotificationVariables) =>
      deleteNotification(notificationId),

    onMutate: async ({ notificationId, wasUnread }) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      // Snapshot all list query variants for rollback
      const previousEntries = queryClient.getQueriesData<GetNotificationsResponse>(
        { queryKey: notificationKeys.all }
      );

      // Optimistically remove the notification from every cached list variant
      queryClient.setQueriesData<GetNotificationsResponse>(
        { queryKey: notificationKeys.all },
        (old) => {
          if (!old || !old.notifications) return old;
          return {
            ...old,
            notifications: old.notifications.filter(
              (n) => n.id !== notificationId
            ),
            totalUnread: wasUnread
              ? Math.max(0, old.totalUnread - 1)
              : old.totalUnread,
          };
        }
      );

      // Optimistically decrement unread count if the notification was unread
      if (wasUnread) {
        queryClient.setQueryData<number>(notificationKeys.unreadCount(), (old) =>
          Math.max(0, (old ?? 0) - 1)
        );
      }

      return { previousEntries };
    },

    onError: (_err, _variables, context) => {
      // Restore all list variants from snapshot
      if (context?.previousEntries) {
        for (const [queryKey, data] of context.previousEntries) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      options?.onError?.(_err);
    },

    onSuccess: (data) => {
      options?.onSuccess?.(data);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  return {
    mutate: (notificationId, opts) =>
      mutation.mutate({ notificationId, wasUnread: opts?.wasUnread }),
    mutateAsync: (notificationId, opts) =>
      mutation.mutateAsync({ notificationId, wasUnread: opts?.wasUnread }),
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    reset: mutation.reset,
  };
}
