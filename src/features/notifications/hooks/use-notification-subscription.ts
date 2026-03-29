/**
 * USE NOTIFICATION SUBSCRIPTION HOOK (SSE version)
 *
 * Subscribes to real-time notification events via Server-Sent Events.
 * Falls back to polling if EventSource is unavailable or connection fails.
 */
import { useEffect, useRef, useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { notificationKeys } from "./use-notifications"
import type { Notification } from "../api"

export interface UseNotificationSubscriptionOptions {
  userId: string | null
  enabled?: boolean
  onNewNotification?: (notification: Partial<Notification> & { id: string }) => void
  fallbackPollingInterval?: number
}

export interface UseNotificationSubscriptionResult {
  isConnected: boolean
  isPolling: boolean
  error: Error | null
  reconnect: () => void
}

const SSE_ENDPOINT = "/api/notifications/stream"

export function useNotificationSubscription({
  userId,
  enabled = true,
  onNewNotification,
  fallbackPollingInterval = 30000,
}: UseNotificationSubscriptionOptions): UseNotificationSubscriptionResult {
  const queryClient = useQueryClient()
  const esRef = useRef<EventSource | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const startPolling = useCallback(() => {
    if (pollingRef.current) return
    setIsPolling(true)
    pollingRef.current = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() })
    }, fallbackPollingInterval)
  }, [queryClient, fallbackPollingInterval])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    setIsPolling(false)
  }, [])

  const connect = useCallback(() => {
    if (!userId || !enabled) return

    if (typeof EventSource === "undefined") {
      startPolling()
      return
    }

    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }

    const es = new EventSource(SSE_ENDPOINT)
    esRef.current = es

    es.addEventListener("open", () => {
      setIsConnected(true)
      setError(null)
      stopPolling()
    })

    es.addEventListener("notification", (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as { id: string; user_id: string }
        queryClient.invalidateQueries({ queryKey: notificationKeys.all })
        onNewNotification?.({ id: payload.id })
      } catch { /* malformed */ }
    })

    es.addEventListener("error", () => {
      setIsConnected(false)
      setError(new Error("SSE connection failed"))
      startPolling()
    })
  }, [userId, enabled, queryClient, onNewNotification, startPolling, stopPolling])

  const reconnect = useCallback(() => {
    setError(null)
    stopPolling()
    connect()
  }, [connect, stopPolling])

  useEffect(() => {
    if (!enabled || !userId) {
      return
    }
    // connect() manages EventSource subscription and calls setState in async
    // callbacks (open/error/message events) — not synchronously. React 18
    // batches these updates, so no cascading render risk.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    connect()
    return () => {
      if (esRef.current) { esRef.current.close(); esRef.current = null }
      stopPolling()
      setIsConnected(false)
    }
  }, [userId, enabled, connect, stopPolling])

  return { isConnected, isPolling, error, reconnect }
}
