import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

/**
 * **Feature: social-login-integration, Property 15: Minimum scopes**
 * **Validates: Requirements 7.4**
 *
 * Tests that each OAuth provider requests only the minimum required scopes:
 * - Google: openid, email, profile (standard OIDC scopes)
 * - Microsoft: openid, email, profile (standard OIDC scopes)
 * - Atlassian: read:me (Atlassian-specific minimal scope)
 *
 * This ensures compliance with security best practices by not requesting
 * excessive permissions from OAuth providers.
 */

describe("OAuth Minimum Scopes", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }

    // Set all required environment variables
    // @ts-expect-error - NODE_ENV is read-only in types but writable at runtime in test
    process.env.NODE_ENV = "test"
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3000/api"
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db"
    process.env.SUPABASE_URL = "https://test.supabase.co"
    process.env.SUPABASE_ANON_KEY = "test-anon-key"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
    process.env.GOOGLE_CLIENT_ID = "google-client-id"
    process.env.GOOGLE_CLIENT_SECRET = "google-client-secret"
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/auth/callback/google"
    process.env.BETTER_AUTH_SECRET = "test-secret-key-with-32-characters-minimum"
    process.env.BETTER_AUTH_URL = "http://localhost:3000"
    process.env.RESEND_API_KEY = "re_test_key"
    process.env.RESEND_FROM_EMAIL = "test@example.com"
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe("Google OAuth Scopes", () => {
    it("should include openid scope for identity verification", async () => {
      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.google.scope).toContain("openid")
    })

    it("should include email scope for user email access", async () => {
      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.google.scope).toContain(
        "https://www.googleapis.com/auth/userinfo.email"
      )
    })

    it("should include profile scope for user profile access", async () => {
      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.google.scope).toContain(
        "https://www.googleapis.com/auth/userinfo.profile"
      )
    })

    it("should request exactly 3 scopes (minimum required)", async () => {
      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.google.scope).toHaveLength(3)
    })

    it("should not include any write or administrative scopes", async () => {
      const { authConfig } = await import("../auth-config")
      const scopes = authConfig.providers.google.scope || []

      // Verify no dangerous scopes are included
      const dangerousPatterns = [
        "admin",
        "write",
        "manage",
        "delete",
        "calendar",
        "drive",
        "gmail",
        "contacts",
      ]

      for (const scope of scopes) {
        for (const pattern of dangerousPatterns) {
          expect(scope.toLowerCase()).not.toContain(pattern)
        }
      }
    })
  })

  describe("Microsoft OAuth Scopes", () => {
    beforeEach(() => {
      process.env.MICROSOFT_CLIENT_ID = "microsoft-client-id"
      process.env.MICROSOFT_CLIENT_SECRET = "microsoft-client-secret"
    })

    it("should include openid scope for identity verification", async () => {
      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.microsoft.scope).toContain("openid")
    })

    it("should include email scope for user email access", async () => {
      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.microsoft.scope).toContain("email")
    })

    it("should include profile scope for user profile access", async () => {
      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.microsoft.scope).toContain("profile")
    })

    it("should request exactly 3 scopes (minimum required)", async () => {
      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.microsoft.scope).toHaveLength(3)
    })

    it("should not include any write or administrative scopes", async () => {
      const { authConfig } = await import("../auth-config")
      const scopes = authConfig.providers.microsoft.scope || []

      // Verify no dangerous scopes are included
      const dangerousPatterns = [
        "admin",
        "write",
        "manage",
        "delete",
        "mail.",
        "calendars.",
        "files.",
        "directory.",
        "user.readwrite",
      ]

      for (const scope of scopes) {
        for (const pattern of dangerousPatterns) {
          expect(scope.toLowerCase()).not.toContain(pattern)
        }
      }
    })

    it("should not include offline_access unless explicitly needed", async () => {
      const { authConfig } = await import("../auth-config")
      const scopes = authConfig.providers.microsoft.scope || []

      // offline_access is only needed if token refresh is required
      // For basic auth, it's not necessary
      expect(scopes).not.toContain("offline_access")
    })
  })

  describe("Atlassian OAuth Scopes", () => {
    beforeEach(() => {
      process.env.ATLASSIAN_CLIENT_ID = "atlassian-client-id"
      process.env.ATLASSIAN_CLIENT_SECRET = "atlassian-client-secret"
    })

    it("should include read:me scope for user profile access", async () => {
      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.atlassian.scope).toContain("read:me")
    })

    it("should request minimal scopes (1-2 scopes)", async () => {
      const { authConfig } = await import("../auth-config")
      const scopeCount = authConfig.providers.atlassian.scope?.length || 0

      // Atlassian requires at least read:me, may include offline_access
      expect(scopeCount).toBeGreaterThanOrEqual(1)
      expect(scopeCount).toBeLessThanOrEqual(2)
    })

    it("should not include write scopes for Jira or Confluence", async () => {
      const { authConfig } = await import("../auth-config")
      const scopes = authConfig.providers.atlassian.scope || []

      // Verify no write scopes are included
      const writePatterns = [
        "write:",
        "manage:",
        "delete:",
        "admin:",
        "create:",
        "edit:",
      ]

      for (const scope of scopes) {
        for (const pattern of writePatterns) {
          expect(scope.toLowerCase()).not.toContain(pattern)
        }
      }
    })

    it("should not include read:jira-user scope (not needed for basic auth)", async () => {
      const { authConfig } = await import("../auth-config")
      const scopes = authConfig.providers.atlassian.scope || []

      // read:jira-user provides more access than needed for authentication
      expect(scopes).not.toContain("read:jira-user")
    })
  })

  describe("Scope Enforcement Across All Providers", () => {
    beforeEach(() => {
      process.env.MICROSOFT_CLIENT_ID = "microsoft-client-id"
      process.env.MICROSOFT_CLIENT_SECRET = "microsoft-client-secret"
      process.env.ATLASSIAN_CLIENT_ID = "atlassian-client-id"
      process.env.ATLASSIAN_CLIENT_SECRET = "atlassian-client-secret"
    })

    it("should have scopes defined for all enabled providers", async () => {
      const { authConfig, getEnabledProviders } = await import("../auth-config")
      const enabledProviders = getEnabledProviders()

      for (const provider of enabledProviders) {
        const config = authConfig.providers[provider]
        expect(config.scope).toBeDefined()
        expect(config.scope?.length).toBeGreaterThan(0)
      }
    })

    it("should use array format for scopes (not space-separated string)", async () => {
      const { authConfig } = await import("../auth-config")

      expect(Array.isArray(authConfig.providers.google.scope)).toBe(true)
      expect(Array.isArray(authConfig.providers.microsoft.scope)).toBe(true)
      expect(Array.isArray(authConfig.providers.atlassian.scope)).toBe(true)
    })

    it("should not have duplicate scopes within any provider", async () => {
      const { authConfig } = await import("../auth-config")

      const providers = ["google", "microsoft", "atlassian"] as const

      for (const provider of providers) {
        const scopes = authConfig.providers[provider].scope || []
        const uniqueScopes = new Set(scopes)
        expect(scopes.length).toBe(uniqueScopes.size)
      }
    })

    it("should include identity-related scopes for proper user identification", async () => {
      const { authConfig } = await import("../auth-config")

      // Google uses full URLs for scope identification
      const googleScopes = authConfig.providers.google.scope || []
      expect(googleScopes.some(s => s.includes("email") || s.includes("userinfo"))).toBe(true)

      // Microsoft uses standard OIDC scope names
      const microsoftScopes = authConfig.providers.microsoft.scope || []
      expect(microsoftScopes).toContain("email")

      // Atlassian uses read:me for user identity
      const atlassianScopes = authConfig.providers.atlassian.scope || []
      expect(atlassianScopes).toContain("read:me")
    })
  })
})
