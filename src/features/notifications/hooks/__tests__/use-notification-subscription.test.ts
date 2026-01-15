/**
 * USE NOTIFICATION SUBSCRIPTION HOOK TESTS
 *
 * Tests for the Supabase Realtime subscription hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

// Mock Supabase client
const mockSubscribe = vi.fn();
const mockUnsubscribe = vi.fn();
const mockOn = vi.fn();
const mockChannel = vi.fn();

vi.mock("@/lib/supabase-client", () => ({
  getSupabaseClient: () => ({
    channel: mockChannel,
  }),
  isSupabaseConfigured: () => true,
}));

// Set up mock chain
mockChannel.mockReturnValue({
  on: mockOn,
});
mockOn.mockReturnValue({
  subscribe: mockSubscribe,
});
mockSubscribe.mockImplementation((callback) => {
  // Simulate successful subscription
  setTimeout(() => callback("SUBSCRIBED"), 0);
  return { unsubscribe: mockUnsubscribe };
});

// Import after mocks are set up
import { useNotificationSubscription } from "../use-notification-subscription";

describe("useNotificationSubscription", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    // Reset mock chain
    mockChannel.mockReturnValue({
      on: mockOn,
    });
    mockOn.mockReturnValue({
      subscribe: mockSubscribe,
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it("should not subscribe when userId is null", () => {
    const { result } = renderHook(
      () =>
        useNotificationSubscription({
          userId: null,
          enabled: true,
        }),
      { wrapper }
    );

    expect(result.current.isConnected).toBe(false);
    expect(mockChannel).not.toHaveBeenCalled();
  });

  it("should not subscribe when disabled", () => {
    const { result } = renderHook(
      () =>
        useNotificationSubscription({
          userId: "user-123",
          enabled: false,
        }),
      { wrapper }
    );

    expect(result.current.isConnected).toBe(false);
    expect(mockChannel).not.toHaveBeenCalled();
  });

  it("should subscribe when enabled with valid userId", async () => {
    const { result } = renderHook(
      () =>
        useNotificationSubscription({
          userId: "user-123",
          enabled: true,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalledWith("notifications:user-123");
    });

    expect(mockOn).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: "recipient_id=eq.user-123",
      }),
      expect.any(Function)
    );
  });

  it("should set isConnected to true when subscription succeeds", async () => {
    const { result } = renderHook(
      () =>
        useNotificationSubscription({
          userId: "user-123",
          enabled: true,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });

  it("should unsubscribe on unmount", async () => {
    const { unmount } = renderHook(
      () =>
        useNotificationSubscription({
          userId: "user-123",
          enabled: true,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalled();
    });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("should call onNewNotification callback when notification arrives", async () => {
    const onNewNotification = vi.fn();
    let notificationHandler: ((payload: { new: unknown }) => void) | null = null;

    // Capture the notification handler
    mockOn.mockImplementation((_event, _config, handler) => {
      notificationHandler = handler;
      return { subscribe: mockSubscribe };
    });

    renderHook(
      () =>
        useNotificationSubscription({
          userId: "user-123",
          enabled: true,
          onNewNotification,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(notificationHandler).not.toBeNull();
    });

    // Simulate a new notification
    const mockNotificationRow = {
      id: "notif-1",
      recipient_id: "user-123",
      actor_id: "actor-456",
      type: "mention",
      entity_type: "issue",
      entity_id: "issue-789",
      metadata: { target_url: "/test" },
      read_at: null,
      created_at: new Date().toISOString(),
    };

    notificationHandler!({ new: mockNotificationRow });

    expect(onNewNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "notif-1",
        recipientId: "user-123",
        actorId: "actor-456",
        type: "mention",
        entityType: "issue",
        entityId: "issue-789",
      })
    );
  });
});
