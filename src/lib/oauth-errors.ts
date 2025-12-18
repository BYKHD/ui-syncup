/**
 * OAuth Error Mapping Utility
 *
 * Maps OAuth error codes to user-friendly messages.
 * Used for displaying meaningful error messages when OAuth flows fail.
 *
 * @module lib/oauth-errors
 */

/**
 * Standard OAuth error codes and their user-friendly messages
 *
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2.1
 */
export const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  // Standard OAuth 2.0 errors
  access_denied: "You cancelled the sign-in. Please try again if you'd like to continue.",
  invalid_request: "Something went wrong with the sign-in request. Please try again.",
  server_error: "The sign-in service is temporarily unavailable. Please try again later.",
  temporarily_unavailable: "The sign-in service is temporarily unavailable. Please try again later.",
  unauthorized_client: "This application is not authorized for this sign-in method.",
  unsupported_response_type: "Something went wrong with the sign-in configuration.",
  invalid_scope: "Something went wrong with the sign-in permissions.",
  
  // Custom/extended errors
  invalid_state: "Your session has expired. Please try signing in again.",
  account_exists: "This account is already linked to another user.",
  oauth_error: "An error occurred during sign-in. Please try again.",
  
  // Provider-specific errors
  consent_required: "Please grant the required permissions to sign in.",
  login_required: "Please sign in to your account first.",
  interaction_required: "Additional interaction is required to complete sign-in.",
} as const;

/**
 * Default error message for unknown error codes
 */
export const DEFAULT_ERROR_MESSAGE = "An error occurred during sign-in. Please try again.";

/**
 * Maps an OAuth error code to a user-friendly message
 *
 * @param errorCode - The OAuth error code from the callback
 * @returns A user-friendly error message
 *
 * @example
 * ```ts
 * const message = mapOAuthError("access_denied");
 * // "You cancelled the sign-in. Please try again if you'd like to continue."
 *
 * const unknown = mapOAuthError("some_unknown_error");
 * // "An error occurred during sign-in. Please try again."
 * ```
 */
export function mapOAuthError(errorCode: string | null | undefined): string {
  if (!errorCode) {
    return DEFAULT_ERROR_MESSAGE;
  }

  // Normalize the error code (lowercase, trim)
  const normalizedCode = errorCode.toLowerCase().trim();

  return OAUTH_ERROR_MESSAGES[normalizedCode] || DEFAULT_ERROR_MESSAGE;
}

/**
 * Parses OAuth error parameters from a URL
 *
 * @param url - The URL to parse (can be full URL or just search params)
 * @returns Object with error code and description if present
 *
 * @example
 * ```ts
 * const result = parseOAuthErrorFromURL("/sign-in?error=access_denied&error_description=User+cancelled");
 * // { error: "access_denied", errorDescription: "User cancelled" }
 * ```
 */
export function parseOAuthErrorFromURL(url: string): {
  error: string | null;
  errorDescription: string | null;
} {
  try {
    // Handle both full URLs and just search params
    const searchParams = url.includes("?")
      ? new URLSearchParams(url.split("?")[1])
      : new URLSearchParams(url);

    return {
      error: searchParams.get("error"),
      errorDescription: searchParams.get("error_description"),
    };
  } catch {
    return { error: null, errorDescription: null };
  }
}

/**
 * Gets a display-ready error message from URL parameters
 *
 * @param url - The URL containing error parameters
 * @returns User-friendly error message or null if no error
 *
 * @example
 * ```ts
 * const message = getOAuthErrorFromURL("?error=access_denied");
 * // "You cancelled the sign-in. Please try again if you'd like to continue."
 * ```
 */
export function getOAuthErrorFromURL(url: string): string | null {
  const { error } = parseOAuthErrorFromURL(url);
  if (!error) return null;
  return mapOAuthError(error);
}

/**
 * Checks if an error code represents a user-initiated cancellation
 *
 * @param errorCode - The OAuth error code
 * @returns True if the user cancelled the flow
 */
export function isUserCancellation(errorCode: string | null | undefined): boolean {
  if (!errorCode) return false;
  const normalized = errorCode.toLowerCase().trim();
  return normalized === "access_denied" || normalized === "consent_required";
}

/**
 * Checks if an error code represents a server/temporary error
 *
 * @param errorCode - The OAuth error code
 * @returns True if the error is temporary and retry may help
 */
export function isTemporaryError(errorCode: string | null | undefined): boolean {
  if (!errorCode) return false;
  const normalized = errorCode.toLowerCase().trim();
  return normalized === "server_error" || normalized === "temporarily_unavailable";
}
