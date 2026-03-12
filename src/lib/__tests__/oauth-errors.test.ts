/**
 * OAuth Error Mapping Tests (Tasks 8.1, 8.3)
 *
 * Tests for OAuth error code mapping and URL parsing utilities.
 *
 * @module lib/__tests__/oauth-errors
 */

import { describe, test, expect } from "vitest";
import {
  mapOAuthError,
  parseOAuthErrorFromURL,
  getOAuthErrorFromURL,
  isUserCancellation,
  isTemporaryError,
  OAUTH_ERROR_MESSAGES,
  DEFAULT_ERROR_MESSAGE,
} from "../oauth-errors";

describe("OAuth Error Mapping", () => {
  describe("mapOAuthError", () => {
    test("should map access_denied to user-friendly message", () => {
      const message = mapOAuthError("access_denied");
      expect(message).toBe(OAUTH_ERROR_MESSAGES.access_denied);
      expect(message).toContain("cancelled");
    });

    test("should map server_error to user-friendly message", () => {
      const message = mapOAuthError("server_error");
      expect(message).toBe(OAUTH_ERROR_MESSAGES.server_error);
      expect(message).toContain("unavailable");
    });

    test("should map invalid_state to session expired message", () => {
      const message = mapOAuthError("invalid_state");
      expect(message).toBe(OAUTH_ERROR_MESSAGES.invalid_state);
      expect(message).toContain("expired");
    });

    test("should map invalid_request to generic message", () => {
      const message = mapOAuthError("invalid_request");
      expect(message).toBe(OAUTH_ERROR_MESSAGES.invalid_request);
    });

    test("should return default message for unknown error codes", () => {
      const message = mapOAuthError("unknown_weird_error");
      expect(message).toBe(DEFAULT_ERROR_MESSAGE);
    });

    test("should handle null error code", () => {
      const message = mapOAuthError(null);
      expect(message).toBe(DEFAULT_ERROR_MESSAGE);
    });

    test("should handle undefined error code", () => {
      const message = mapOAuthError(undefined);
      expect(message).toBe(DEFAULT_ERROR_MESSAGE);
    });

    test("should handle empty string error code", () => {
      const message = mapOAuthError("");
      expect(message).toBe(DEFAULT_ERROR_MESSAGE);
    });

    test("should normalize uppercase error codes", () => {
      const message = mapOAuthError("ACCESS_DENIED");
      expect(message).toBe(OAUTH_ERROR_MESSAGES.access_denied);
    });

    test("should trim whitespace from error codes", () => {
      const message = mapOAuthError("  access_denied  ");
      expect(message).toBe(OAUTH_ERROR_MESSAGES.access_denied);
    });
  });

  describe("parseOAuthErrorFromURL", () => {
    test("should parse error from URL with search params", () => {
      const result = parseOAuthErrorFromURL("/sign-in?error=access_denied");
      expect(result.error).toBe("access_denied");
      expect(result.errorDescription).toBeNull();
    });

    test("should parse error and description", () => {
      const result = parseOAuthErrorFromURL(
        "/sign-in?error=access_denied&error_description=User+cancelled"
      );
      expect(result.error).toBe("access_denied");
      expect(result.errorDescription).toBe("User cancelled");
    });

    test("should return null for URL without error", () => {
      const result = parseOAuthErrorFromURL("/sign-in");
      expect(result.error).toBeNull();
      expect(result.errorDescription).toBeNull();
    });

    test("should handle full URLs", () => {
      const result = parseOAuthErrorFromURL(
        "https://example.com/sign-in?error=server_error"
      );
      expect(result.error).toBe("server_error");
    });

    test("should handle invalid URLs gracefully", () => {
      const result = parseOAuthErrorFromURL("not a valid url %%");
      expect(result.error).toBeNull();
      expect(result.errorDescription).toBeNull();
    });
  });

  describe("getOAuthErrorFromURL", () => {
    test("should return mapped error message from URL", () => {
      const message = getOAuthErrorFromURL("?error=access_denied");
      expect(message).toBe(OAUTH_ERROR_MESSAGES.access_denied);
    });

    test("should return null if no error in URL", () => {
      const message = getOAuthErrorFromURL("?foo=bar");
      expect(message).toBeNull();
    });
  });

  describe("isUserCancellation", () => {
    test("should return true for access_denied", () => {
      expect(isUserCancellation("access_denied")).toBe(true);
    });

    test("should return true for consent_required", () => {
      expect(isUserCancellation("consent_required")).toBe(true);
    });

    test("should return false for server_error", () => {
      expect(isUserCancellation("server_error")).toBe(false);
    });

    test("should return false for null", () => {
      expect(isUserCancellation(null)).toBe(false);
    });
  });

  describe("isTemporaryError", () => {
    test("should return true for server_error", () => {
      expect(isTemporaryError("server_error")).toBe(true);
    });

    test("should return true for temporarily_unavailable", () => {
      expect(isTemporaryError("temporarily_unavailable")).toBe(true);
    });

    test("should return false for access_denied", () => {
      expect(isTemporaryError("access_denied")).toBe(false);
    });

    test("should return false for null", () => {
      expect(isTemporaryError(null)).toBe(false);
    });
  });
});

// Task 8.3: Specific error scenarios
describe("OAuth Error Scenarios (Task 8.3)", () => {
  test("consent denied - should provide helpful message", () => {
    const message = mapOAuthError("access_denied");
    expect(message).toContain("cancelled");
    expect(message).toContain("try again");
  });

  test("server error - should indicate temporary issue", () => {
    const message = mapOAuthError("server_error");
    expect(message).toContain("temporarily unavailable");
    expect(message).toContain("try again");
  });

  test("invalid state - should explain session expiry", () => {
    const message = mapOAuthError("invalid_state");
    expect(message).toContain("expired");
    expect(message).toContain("try");
  });

  test("account already linked - should explain clearly", () => {
    const message = mapOAuthError("account_exists");
    expect(message).toContain("already linked");
  });
});
