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
