/**
 * USE NOTIFICATIONS HOOK
 * React Query hook for fetching paginated notifications
 */

import { useQuery } from "@tanstack/react-query";
import { getNotifications } from "../api";
import type { GetNotificationsResponse } from "../api";

// ============================================================================
// QUERY KEYS
// ============================================================================

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (params?: { unreadOnly?: boolean }) =>
    [...notificationKeys.all, "list", params] as const,
  unreadCount: () => [...notificationKeys.all, "unreadCount"] as const,
};

// ============================================================================
// HOOK
// ============================================================================

export interface UseNotificationsParams {
  limit?: number;
  cursor?: string;
  unreadOnly?: boolean;
  enabled?: boolean;
}

export interface UseNotificationsResult {
  data: GetNotificationsResponse | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
  hasNextPage: boolean;
  fetchNextPage: () => void;
}

/**
 * Query hook for fetching notifications
 *
 * @example
 * const { data, isLoading, hasNextPage, fetchNextPage } = useNotifications({
 *   limit: 20,
 *   unreadOnly: true
 * })
 */
export function useNotifications({
  limit = 20,
  cursor,
  unreadOnly = false,
  enabled = true,
}: UseNotificationsParams = {}): UseNotificationsResult {
  const query = useQuery({
    queryKey: notificationKeys.list({ unreadOnly }),
    queryFn: () => getNotifications({ limit, cursor, unreadOnly }),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    hasNextPage: query.data?.hasMore ?? false,
    fetchNextPage: () => {
      if (query.data?.nextCursor) {
        // For infinite scroll, would use useInfiniteQuery
        // This is simplified for basic pagination
        query.refetch();
      }
    },
  };
}
