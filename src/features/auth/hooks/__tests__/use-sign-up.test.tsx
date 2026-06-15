import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSignUp } from "../use-sign-up";

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signUp: { email: vi.fn() },
    signIn: { social: vi.fn() },
  },
}));

import { authClient } from "@/lib/auth-client";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe("useSignUp handleOAuthSignIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults the OAuth callbackURL to '/' so the landing-view resolver picks the destination", async () => {
    const { result } = renderHook(() => useSignUp(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.handleOAuthSignIn();
    });

    await waitFor(() => {
      expect(authClient.signIn.social).toHaveBeenCalledWith(
        expect.objectContaining({ provider: "google", callbackURL: "/" })
      );
    });
  });

  it("uses the provided callbackUrl (e.g. an invitation deep-link) when present", async () => {
    const { result } = renderHook(
      () => useSignUp({ callbackUrl: "/join-team?token=abc" }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.handleOAuthSignIn();
    });

    await waitFor(() => {
      expect(authClient.signIn.social).toHaveBeenCalledWith(
        expect.objectContaining({ callbackURL: "/join-team?token=abc" })
      );
    });
  });
});
