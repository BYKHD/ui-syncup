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
  enabled: boolean
  tenantId?: string // Microsoft-specific
}

export interface AuthConfig {
  providers: {
    google: OAuthProvider
    microsoft: OAuthProvider
    atlassian: OAuthProvider
  }
  session: {
    secret: string
    baseUrl: string
  }
}

/**
 * Construct OAuth callback URI from base URL
 */
function buildCallbackUri(provider: string): string {
  return `${env.BETTER_AUTH_URL}/api/auth/callback/${provider}`
}

/**
 * Google OAuth Configuration
 * Reads credentials from environment variables and constructs redirect URI
 * based on the current environment's app URL
 * 
 * In development, Google OAuth is optional - if not configured, the app
 * will run in email/password only mode
 */
function createGoogleOAuthConfig(): OAuthProvider {
  const clientId = env.GOOGLE_CLIENT_ID ?? ""
  const clientSecret = env.GOOGLE_CLIENT_SECRET ?? ""
  const redirectUri = env.GOOGLE_REDIRECT_URI ?? ""
  const enabled = Boolean(clientId && clientSecret && redirectUri)

  return {
    clientId,
    clientSecret,
    redirectUri,
    scope: [
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
    enabled,
  }
}

/**
 * Microsoft OAuth Configuration
 * Enabled only when MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET are set
 */
function createMicrosoftOAuthConfig(): OAuthProvider {
  const clientId = env.MICROSOFT_CLIENT_ID ?? ""
  const clientSecret = env.MICROSOFT_CLIENT_SECRET ?? ""
  const enabled = Boolean(clientId && clientSecret)

  return {
    clientId,
    clientSecret,
    redirectUri: buildCallbackUri("microsoft"),
    scope: ["openid", "email", "profile"],
    enabled,
    tenantId: env.MICROSOFT_TENANT_ID ?? "common",
  }
}

/**
 * Atlassian OAuth Configuration
 * Enabled only when ATLASSIAN_CLIENT_ID and ATLASSIAN_CLIENT_SECRET are set
 */
function createAtlassianOAuthConfig(): OAuthProvider {
  const clientId = env.ATLASSIAN_CLIENT_ID ?? ""
  const clientSecret = env.ATLASSIAN_CLIENT_SECRET ?? ""
  const enabled = Boolean(clientId && clientSecret)

  return {
    clientId,
    clientSecret,
    redirectUri: buildCallbackUri("atlassian"),
    scope: ["read:me"],
    enabled,
  }
}

/**
 * Complete authentication configuration
 * Exports a typed configuration object for use with better-auth or custom auth
 */
export const authConfig: AuthConfig = {
  providers: {
    google: createGoogleOAuthConfig(),
    microsoft: createMicrosoftOAuthConfig(),
    atlassian: createAtlassianOAuthConfig(),
  },
  session: {
    secret: env.BETTER_AUTH_SECRET,
    baseUrl: env.BETTER_AUTH_URL,
  },
}

/**
 * Get list of enabled OAuth providers
 */
export function getEnabledProviders(): Array<keyof AuthConfig["providers"]> {
  return (
    Object.entries(authConfig.providers) as [
      keyof AuthConfig["providers"],
      OAuthProvider,
    ][]
  )
    .filter(([, config]) => config.enabled)
    .map(([name]) => name)
}
