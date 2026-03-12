import { env } from "./env"

/**
 * Validates that generated URLs are appropriate for the current environment
 * Prevents localhost URLs from being sent in emails on production/preview deployments
 *
 * @param url - The full URL to validate
 * @param context - Description of where the URL is used (for logging)
 * @throws Error if localhost URL is used in production environment
 */
export function validateEmailUrl(url: string, context: string): void {
  try {
    const urlObj = new URL(url)

    // Read VERCEL_ENV directly from process.env for testability
    const vercelEnv = process.env.VERCEL_ENV

    // Check if using localhost in non-development environment
    if (
      (vercelEnv === "production" || vercelEnv === "preview") &&
      (urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1")
    ) {
      const errorDetails = {
        context,
        generatedUrl: url,
        environment: vercelEnv,
        expectedBase: env.BETTER_AUTH_URL,
        hostname: urlObj.hostname,
      }

      console.error(
        `[URL_VALIDATION_ERROR] ${context}: Generated URL uses localhost in ${vercelEnv} environment`,
        errorDetails
      )

      // In production, this should throw to prevent sending bad emails
      if (vercelEnv === "production") {
        throw new Error(
          `Invalid email URL generated: localhost URLs not allowed in production. ` +
            `Check BETTER_AUTH_URL configuration in Vercel Dashboard. ` +
            `Expected base: ${env.BETTER_AUTH_URL}, Got: ${url}`
        )
      }
    }
  } catch (error) {
    // If URL parsing fails, log but don't throw (let the email sending fail naturally)
    if (error instanceof TypeError) {
      console.error(
        `[URL_VALIDATION_ERROR] ${context}: Invalid URL format: ${url}`,
        error
      )
    } else {
      // Re-throw our validation errors
      throw error
    }
  }
}

/**
 * List of allowed URL schemes for redirects
 */
const ALLOWED_SCHEMES = ["http:", "https:"] as const;

/**
 * Validates that a redirect URL is safe to use
 *
 * Checks:
 * 1. URL is well-formed
 * 2. Scheme is http or https (or relative path)
 * 3. If absolute, origin matches allowed origins
 * 4. No protocol-relative URLs (//evil.com)
 *
 * @param url - The URL to validate
 * @param allowedOrigins - List of allowed origins (e.g., ["https://example.com"])
 * @returns True if the URL is safe to redirect to
 *
 * @example
 * ```ts
 * isValidRedirectURL("/dashboard", ["https://app.example.com"]); // true
 * isValidRedirectURL("https://evil.com", ["https://app.example.com"]); // false
 * ```
 */
export function isValidRedirectURL(
  url: string,
  allowedOrigins: string[] = []
): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }

  const trimmedUrl = url.trim();

  if (trimmedUrl.length === 0) {
    return false;
  }

  // Block protocol-relative URLs (//evil.com)
  if (trimmedUrl.startsWith("//")) {
    return false;
  }

  // Block javascript: and data: URLs
  const lowerUrl = trimmedUrl.toLowerCase();
  if (
    lowerUrl.startsWith("javascript:") ||
    lowerUrl.startsWith("data:") ||
    lowerUrl.startsWith("vbscript:")
  ) {
    return false;
  }

  // Allow relative paths (starting with / but not //)
  if (trimmedUrl.startsWith("/") && !trimmedUrl.startsWith("//")) {
    return true;
  }

  // For absolute URLs, validate against allowed origins
  try {
    const parsed = new URL(trimmedUrl);

    if (!ALLOWED_SCHEMES.includes(parsed.protocol as typeof ALLOWED_SCHEMES[number])) {
      return false;
    }

    if (allowedOrigins.length === 0) {
      return false;
    }

    return allowedOrigins.some((origin) => {
      try {
        const allowedParsed = new URL(origin);
        return (
          parsed.protocol === allowedParsed.protocol &&
          parsed.host === allowedParsed.host
        );
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

/**
 * Sanitizes a redirect URL to ensure safety
 *
 * @param url - The URL to sanitize
 * @param fallback - Fallback URL if invalid (default: "/")
 * @param allowedOrigins - List of allowed origins
 * @returns A safe redirect URL
 */
export function sanitizeRedirectURL(
  url: string | null | undefined,
  fallback: string = "/",
  allowedOrigins: string[] = []
): string {
  if (!url) {
    return fallback;
  }

  if (isValidRedirectURL(url, allowedOrigins)) {
    return url;
  }

  return fallback;
}

