/**
 * USE NOTIFICATION SUBSCRIPTION HOOK
 * Supabase Realtime subscription for instant notification updates
 *
 * Subscribes to INSERT events on the notifications table filtered by recipient_id.
 * When a new notification arrives, it invalidates the React Query cache to trigger
 * a refetch and shows a toast notification.
 *
 * Falls back to polling if Realtime connection fails.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase-client";
import { notificationKeys } from "./use-notifications";
import type { Notification, NotificationMetadata } from "../api";

// ============================================================================
// TYPES
// ============================================================================

export interface UseNotificationSubscriptionOptions {
  /** User ID to subscribe to notifications for */
  userId: string | null;
  /** Whether the subscription is enabled */
  enabled?: boolean;
  /** Callback when a new notification arrives */
  onNewNotification?: (notification: Notification) => void;
  /** Polling interval in ms when Realtime is disconnected (default: 30000) */
  fallbackPollingInterval?: number;
}

export interface UseNotificationSubscriptionResult {
  /** Whether the Realtime connection is active */
  isConnected: boolean;
  /** Whether we're using polling fallback */
  isPolling: boolean;
  /** Any connection error */
  error: Error | null;
  /** Manually reconnect */
  reconnect: () => void;
}

/** Database row shape (snake_case from Postgres) */
interface NotificationRow {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: Notification["type"];
  entity_type: Notification["entityType"];
  entity_id: string;
  metadata: NotificationMetadata;
  read_at: string | null;
  created_at: string;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Subscribe to real-time notification updates via Supabase Realtime
 *
 * @example
 * const { isConnected, isPolling } = useNotificationSubscription({
 *   userId: session?.user?.id,
 *   enabled: !!session,
 *   onNewNotification: (notification) => {
 *     console.log('New notification:', notification)
 *   }
 * })
 */
export function useNotificationSubscription({
  userId,
  enabled = true,
  onNewNotification,
  fallbackPollingInterval = 30000,
}: UseNotificationSubscriptionOptions): UseNotificationSubscriptionResult {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Transform database row to API type (snake_case -> camelCase)
  const transformRow = useCallback((row: NotificationRow): Notification => {
    return {
      id: row.id,
      recipientId: row.recipient_id,
      actorId: row.actor_id,
      type: row.type,
      entityType: row.entity_type,
      entityId: row.entity_id,
      metadata: row.metadata,
      readAt: row.read_at,
      createdAt: row.created_at,
    };
  }, []);

  // Handle new notification from Realtime
  const handleNewNotification = useCallback(
    (payload: { new: NotificationRow }) => {
      const notification = transformRow(payload.new);

      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({
        queryKey: notificationKeys.all,
      });

      // Call the callback if provided
      onNewNotification?.(notification);
    },
    [queryClient, onNewNotification, transformRow]
  );

  // Start polling fallback
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;

    setIsPolling(true);
    pollingIntervalRef.current = setInterval(() => {
      queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(),
      });
    }, fallbackPollingInterval);
  }, [queryClient, fallbackPollingInterval]);

  // Stop polling fallback
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Connect to Realtime
  const connect = useCallback(() => {
    if (!userId || !enabled || !isSupabaseConfigured()) {
      return;
    }

    // Clean up existing channel
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    try {
      const supabase = getSupabaseClient();

      // Create channel with unique name per user
      const channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${userId}`,
          },
          handleNewNotification
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setIsConnected(true);
            setError(null);
            stopPolling();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setIsConnected(false);
            setError(new Error(`Realtime connection failed: ${status}`));
            // Fall back to polling
            startPolling();
          } else if (status === "CLOSED") {
            setIsConnected(false);
            // Fall back to polling
            startPolling();
          }
        });

      channelRef.current = channel;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to connect"));
      setIsConnected(false);
      startPolling();
    }
  }, [
    userId,
    enabled,
    handleNewNotification,
    startPolling,
    stopPolling,
  ]);

  // Reconnect function for manual retry
  const reconnect = useCallback(() => {
    setError(null);
    stopPolling();
    connect();
  }, [connect, stopPolling]);

  // Set up subscription on mount and when dependencies change
  useEffect(() => {
    if (!enabled || !userId) {
      // Clean up if disabled
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      stopPolling();
      setIsConnected(false);
      return;
    }

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      // Fall back to polling if Supabase is not configured
      startPolling();
      return;
    }

    connect();

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      stopPolling();
    };
  }, [userId, enabled, connect, startPolling, stopPolling]);

  return {
    isConnected,
    isPolling,
    error,
    reconnect,
  };
}
