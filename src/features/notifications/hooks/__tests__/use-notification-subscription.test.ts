import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createElement } from "react"

// Mock EventSource globally
const mocks = vi.hoisted(() => {
  let openCb: (() => void) | null = null
  let errorCb: ((e: Event) => void) | null = null
  const evtHandlers = new Map<string, (e: MessageEvent) => void>()
  const mock = {
    close: vi.fn(),
    addEventListener: vi.fn((type: string, h: unknown) => {
      if (type === "open") openCb = h as () => void
      else if (type === "error") errorCb = h as (e: Event) => void
      else evtHandlers.set(type, h as (e: MessageEvent) => void)
    }),
    removeEventListener: vi.fn(),
    readyState: 0,
    _open() { openCb?.() },
    _error(e: Event) { errorCb?.(e) },
    _msg(type: string, data: string) {
      evtHandlers.get(type)?.(new MessageEvent(type, { data }))
    },
    _reset() {
      openCb = null
      errorCb = null
      evtHandlers.clear()
    },
  }
  const MockES = vi.fn().mockImplementation(function () { return mock })
  return { MockES, mock }
})
vi.stubGlobal("EventSource", mocks.MockES)

import { useNotificationSubscription } from "../use-notification-subscription"

describe("useNotificationSubscription (SSE)", () => {
  let qc: QueryClient
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mock._reset()
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  })
  afterEach(() => qc.clear())

  const wrap = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)

  it("does not connect when userId is null", () => {
    renderHook(() => useNotificationSubscription({ userId: null }), { wrapper: wrap })
    expect(mocks.MockES).not.toHaveBeenCalled()
  })

  it("connects to /api/notifications/stream", () => {
    renderHook(() => useNotificationSubscription({ userId: "u-1" }), { wrapper: wrap })
    expect(mocks.MockES).toHaveBeenCalledWith("/api/notifications/stream")
  })

  it("isConnected becomes true on open", async () => {
    const { result } = renderHook(
      () => useNotificationSubscription({ userId: "u-1" }),
      { wrapper: wrap }
    )
    act(() => mocks.mock._open())
    await waitFor(() => expect(result.current.isConnected).toBe(true))
  })

  it("invalidates queries on notification event", async () => {
    const spy = vi.spyOn(qc, "invalidateQueries")
    renderHook(() => useNotificationSubscription({ userId: "u-1" }), { wrapper: wrap })
    act(() => mocks.mock._open())
    act(() => mocks.mock._msg("notification", JSON.stringify({ id: "n-1", user_id: "u-1" })))
    await waitFor(() => expect(spy).toHaveBeenCalled())
  })

  it("calls onNewNotification callback with id", async () => {
    const cb = vi.fn()
    renderHook(
      () => useNotificationSubscription({ userId: "u-1", onNewNotification: cb }),
      { wrapper: wrap }
    )
    act(() => mocks.mock._open())
    act(() => mocks.mock._msg("notification", JSON.stringify({ id: "n-1", user_id: "u-1" })))
    await waitFor(() => expect(cb).toHaveBeenCalledWith(expect.objectContaining({ id: "n-1" })))
  })

  it("falls back to polling on error", async () => {
    const { result } = renderHook(
      () => useNotificationSubscription({ userId: "u-1", fallbackPollingInterval: 100 }),
      { wrapper: wrap }
    )
    act(() => mocks.mock._error(new Event("error")))
    await waitFor(() => expect(result.current.isPolling).toBe(true))
    expect(result.current.isConnected).toBe(false)
  })

  it("closes EventSource on unmount", () => {
    const { unmount } = renderHook(
      () => useNotificationSubscription({ userId: "u-1" }),
      { wrapper: wrap }
    )
    unmount()
    expect(mocks.mock.close).toHaveBeenCalled()
  })

  it("reconnect() creates a new connection", async () => {
    const { result } = renderHook(
      () => useNotificationSubscription({ userId: "u-1" }),
      { wrapper: wrap }
    )
    act(() => mocks.mock._open())
    await waitFor(() => expect(result.current.isConnected).toBe(true))
    act(() => result.current.reconnect())
    expect(mocks.mock.close).toHaveBeenCalled()
    expect(mocks.MockES).toHaveBeenCalledTimes(2)
  })
})
