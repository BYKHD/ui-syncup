/**
 * USE UNREAD COUNT HOOK
 * React Query hook for fetching unread notification count
 */

import { useQuery } from "@tanstack/react-query";
import { getUnreadCount } from "../api";
import { notificationKeys } from "./use-notifications";

// ============================================================================
// HOOK
// ============================================================================

export interface UseUnreadCountParams {
  enabled?: boolean;
  /** Polling interval in milliseconds (for realtime fallback) */
  refetchInterval?: number | false;
}

export interface UseUnreadCountResult {
  count: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Query hook for fetching unread notification count
 *
 * Used for notification bell badge display.
 * Supports polling interval for realtime fallback.
 *
 * @example
 * const { count, isLoading } = useUnreadCount({
 *   refetchInterval: 30000 // Poll every 30s as realtime fallback
 * })
 */
export function useUnreadCount({
  enabled = true,
  refetchInterval = false,
}: UseUnreadCountParams = {}): UseUnreadCountResult {
  const query = useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const response = await getUnreadCount();
      return response.count;
    },
    enabled,
    staleTime: 10 * 1000, // 10 seconds - count can change frequently
    refetchInterval,
    retry: 1,
  });

  return {
    count: query.data ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
