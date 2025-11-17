import { env } from "./env"

/**
 * OAuth Provider Configuration
 * Configures authentication providers with environment-specific settings
 * 
 * @example
 * ```typescript
 * import { authConfig } from '@/lib/auth-config'
 * 
 * // Use with better-auth or custom auth implementation
 * const auth = createAuth({
 *   providers: [
 *     google({
 *       clientId: authConfig.providers.google.clientId,
 *       clientSecret: authConfig.providers.google.clientSecret,
 *       redirectUri: authConfig.providers.google.redirectUri,
 *     })
 *   ],
 *   secret: authConfig.session.secret,
 *   baseUrl: authConfig.session.baseUrl,
 * })
 * ```
 */

export interface OAuthProvider {
  clientId: string
  clientSecret: string
  redirectUri: string
  scope?: string[]
}

export interface AuthConfig {
  providers: {
    google: OAuthProvider
  }
  session: {
    secret: string
    baseUrl: string
  }
}

/**
 * Google OAuth Configuration
 * Reads credentials from environment variables and constructs redirect URI
 * based on the current environment's app URL
 */
function createGoogleOAuthConfig(): OAuthProvider {
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_REDIRECT_URI,
    scope: [
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
  }
}

/**
 * Complete authentication configuration
 * Exports a typed configuration object for use with better-auth or custom auth
 */
export const authConfig: AuthConfig = {
  providers: {
    google: createGoogleOAuthConfig(),
  },
  session: {
    secret: env.BETTER_AUTH_SECRET,
    baseUrl: env.BETTER_AUTH_URL,
  },
}
