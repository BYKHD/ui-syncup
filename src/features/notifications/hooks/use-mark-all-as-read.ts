/**
 * USE MARK ALL AS READ HOOK
 * React Query mutation for marking all notifications as read
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { markAllAsRead } from "../api";
import { notificationKeys } from "./use-notifications";
import type { MarkAllAsReadResponse, GetNotificationsResponse } from "../api";

// ============================================================================
// HOOK
// ============================================================================

export interface UseMarkAllAsReadOptions {
  onSuccess?: (data: MarkAllAsReadResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseMarkAllAsReadResult {
  mutate: () => void;
  mutateAsync: () => Promise<MarkAllAsReadResponse>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * Mutation hook for marking all notifications as read
 *
 * Features optimistic updates for instant UI feedback.
 *
 * @example
 * const { mutate, isPending } = useMarkAllAsRead()
 * <Button onClick={mutate} disabled={isPending}>Mark all as read</Button>
 */
export function useMarkAllAsRead(options?: UseMarkAllAsReadOptions): UseMarkAllAsReadResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => markAllAsRead(),
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      // Snapshot previous value
      const previousNotifications = queryClient.getQueryData<GetNotificationsResponse>(
        notificationKeys.list({})
      );

      // Optimistically update all notifications to read
      queryClient.setQueryData<GetNotificationsResponse>(
        notificationKeys.list({}),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            notifications: old.notifications.map((n) => ({
              ...n,
              readAt: n.readAt ?? new Date().toISOString(),
            })),
            totalUnread: 0,
          };
        }
      );

      // Optimistically set unread count to 0
      queryClient.setQueryData<number>(notificationKeys.unreadCount(), 0);

      return { previousNotifications };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          notificationKeys.list({}),
          context.previousNotifications
        );
      }
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      toast.error("Failed to mark notifications as read");
      options?.onError?.(_err);
    },
    onSuccess: (data) => {
      if (data.updated > 0) {
        toast.success(`Marked ${data.updated} notification${data.updated > 1 ? "s" : ""} as read`);
      }
      options?.onSuccess?.(data);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
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
