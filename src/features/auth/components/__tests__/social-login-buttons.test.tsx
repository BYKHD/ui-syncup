import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { SocialLoginButtons } from "../social-login-buttons";

/**
 * **Feature: social-login-integration, Property 9: Provider visibility based on config**
 * **Validates: Requirements 5.3, 6.1, 6.2**
 *
 * Tests for the SocialLoginButtons component that renders OAuth provider
 * buttons dynamically based on server configuration.
 */

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock authClient
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      social: vi.fn(),
    },
  },
}));

describe("SocialLoginButtons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Loading State", () => {
    it("should render skeleton loaders while fetching providers", () => {
      // Never resolve the fetch
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<SocialLoginButtons />);

      // Should show loading skeletons
      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("Provider Rendering", () => {
    it("should render only enabled providers", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          providers: {
            google: { enabled: true },
            microsoft: { enabled: false },
            atlassian: { enabled: false },
          },
        }),
      });

      render(<SocialLoginButtons />);

      await waitFor(() => {
        expect(screen.getByText("Continue with Google")).toBeInTheDocument();
      });

      expect(screen.queryByText("Continue with Microsoft")).not.toBeInTheDocument();
      expect(screen.queryByText("Continue with Atlassian")).not.toBeInTheDocument();
    });

    it("should render all providers when all are enabled", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          providers: {
            google: { enabled: true },
            microsoft: { enabled: true },
            atlassian: { enabled: true },
          },
        }),
      });

      render(<SocialLoginButtons />);

      await waitFor(() => {
        expect(screen.getByText("Continue with Google")).toBeInTheDocument();
        expect(screen.getByText("Continue with Microsoft")).toBeInTheDocument();
        expect(screen.getByText("Continue with Atlassian")).toBeInTheDocument();
      });
    });

    it("should fall back to Google only on API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<SocialLoginButtons />);

      await waitFor(() => {
        expect(screen.getByText("Continue with Google")).toBeInTheDocument();
      });

      // Only Google should be shown
      expect(screen.queryByText("Continue with Microsoft")).not.toBeInTheDocument();
      expect(screen.queryByText("Continue with Atlassian")).not.toBeInTheDocument();
    });
  });

  describe("Button States", () => {
    it("should disable buttons when disabled prop is true", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          providers: {
            google: { enabled: true },
            microsoft: { enabled: false },
            atlassian: { enabled: false },
          },
        }),
      });

      render(<SocialLoginButtons disabled />);

      await waitFor(() => {
        const button = screen.getByRole("button", { name: /sign in with google/i });
        expect(button).toBeDisabled();
      });
    });

    it("should show loading state when signing in", async () => {
      const { authClient } = await import("@/lib/auth-client");
      
      // Make signIn.social take a while
      vi.mocked(authClient.signIn.social).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          providers: {
            google: { enabled: true },
            microsoft: { enabled: false },
            atlassian: { enabled: false },
          },
        }),
      });

      render(<SocialLoginButtons />);

      await waitFor(() => {
        expect(screen.getByText("Continue with Google")).toBeInTheDocument();
      });

      // Click the Google button
      fireEvent.click(screen.getByRole("button", { name: /sign in with google/i }));

      // Should show loading text
      await waitFor(() => {
        expect(screen.getByText("Signing in with Google…")).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper aria labels for buttons", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          providers: {
            google: { enabled: true },
            microsoft: { enabled: true },
            atlassian: { enabled: false },
          },
        }),
      });

      render(<SocialLoginButtons />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /sign in with google/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /sign in with microsoft/i })).toBeInTheDocument();
      });
    });

    it("should have accessible group role", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          providers: {
            google: { enabled: true },
            microsoft: { enabled: false },
            atlassian: { enabled: false },
          },
        }),
      });

      render(<SocialLoginButtons />);

      await waitFor(() => {
        expect(screen.getByRole("group", { name: /social login options/i })).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("should call onError callback when sign-in fails", async () => {
      const { authClient } = await import("@/lib/auth-client");
      const onError = vi.fn();

      vi.mocked(authClient.signIn.social).mockRejectedValueOnce(
        new Error("OAuth failed")
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          providers: {
            google: { enabled: true },
            microsoft: { enabled: false },
            atlassian: { enabled: false },
          },
        }),
      });

      render(<SocialLoginButtons onError={onError} />);

      await waitFor(() => {
        expect(screen.getByText("Continue with Google")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /sign in with google/i }));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith("OAuth failed");
      });
    });

    it("should display error alert when sign-in fails", async () => {
      const { authClient } = await import("@/lib/auth-client");

      vi.mocked(authClient.signIn.social).mockRejectedValueOnce(
        new Error("OAuth failed")
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          providers: {
            google: { enabled: true },
            microsoft: { enabled: false },
            atlassian: { enabled: false },
          },
        }),
      });

      render(<SocialLoginButtons />);

      await waitFor(() => {
        expect(screen.getByText("Continue with Google")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /sign in with google/i }));

      await waitFor(() => {
        expect(screen.getByText("OAuth failed")).toBeInTheDocument();
      });
    });
  });

  describe("Layout", () => {
    it("should render vertically by default", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          providers: {
            google: { enabled: true },
            microsoft: { enabled: true },
            atlassian: { enabled: false },
          },
        }),
      });

      render(<SocialLoginButtons />);

      await waitFor(() => {
        const group = screen.getByRole("group", { name: /social login options/i });
        expect(group).toHaveClass("flex-col");
      });
    });

    it("should render horizontally when layout is horizontal", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          providers: {
            google: { enabled: true },
            microsoft: { enabled: true },
            atlassian: { enabled: false },
          },
        }),
      });

      render(<SocialLoginButtons layout="horizontal" />);

      await waitFor(() => {
        const group = screen.getByRole("group", { name: /social login options/i });
        expect(group).toHaveClass("flex-row");
      });
    });
  });
});
