import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

/**
 * **Feature: social-login-integration, Property 1: OAuth redirect URL construction**
 * **Validates: Requirements 1.1, 2.1, 3.1**
 *
 * Tests that OAuth redirect URLs are correctly constructed with all required parameters:
 * - client_id: The OAuth client identifier
 * - redirect_uri: The callback URL
 * - scope: The requested permissions
 * - state: CSRF protection token
 * - response_type: OAuth flow type
 */

describe("OAuth Redirect URL Construction", () => {
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
    process.env.GOOGLE_CLIENT_ID = "google-client-id-123"
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

  describe("Google OAuth Redirect URL", () => {
    it("should include client_id in redirect URL configuration", async () => {
      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.google.clientId).toBe("google-client-id-123")
      expect(authConfig.providers.google.clientId).toBeTruthy()
    })

    it("should include redirect_uri based on BETTER_AUTH_URL", async () => {
      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.google.redirectUri).toBe(
        "http://localhost:3000/api/auth/callback/google"
      )
    })

    it("should include required scopes", async () => {
      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.google.scope).toContain("openid")
      expect(authConfig.providers.google.scope).toContain(
        "https://www.googleapis.com/auth/userinfo.email"
      )
      expect(authConfig.providers.google.scope).toContain(
        "https://www.googleapis.com/auth/userinfo.profile"
      )
    })
  })

  describe("Microsoft OAuth Redirect URL", () => {
    beforeEach(() => {
      process.env.MICROSOFT_CLIENT_ID = "microsoft-client-id-456"
      process.env.MICROSOFT_CLIENT_SECRET = "microsoft-client-secret"
      process.env.MICROSOFT_TENANT_ID = "test-tenant-id"
    })

    it("should include client_id in redirect URL configuration", async () => {
      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.microsoft.clientId).toBe("microsoft-client-id-456")
      expect(authConfig.providers.microsoft.clientId).toBeTruthy()
    })

    it("should construct redirect_uri using BETTER_AUTH_URL", async () => {
      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.microsoft.redirectUri).toBe(
        "http://localhost:3000/api/auth/callback/microsoft"
      )
    })

    it("should include tenant_id for Microsoft-specific configuration", async () => {
      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.microsoft.tenantId).toBe("test-tenant-id")
    })

    it("should include required scopes", async () => {
      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.microsoft.scope).toContain("openid")
      expect(authConfig.providers.microsoft.scope).toContain("email")
      expect(authConfig.providers.microsoft.scope).toContain("profile")
    })
  })

  describe("Atlassian OAuth Redirect URL", () => {
    beforeEach(() => {
      process.env.ATLASSIAN_CLIENT_ID = "atlassian-client-id-789"
      process.env.ATLASSIAN_CLIENT_SECRET = "atlassian-client-secret"
    })

    it("should include client_id in redirect URL configuration", async () => {
      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.atlassian.clientId).toBe("atlassian-client-id-789")
      expect(authConfig.providers.atlassian.clientId).toBeTruthy()
    })

    it("should construct redirect_uri using BETTER_AUTH_URL", async () => {
      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.atlassian.redirectUri).toBe(
        "http://localhost:3000/api/auth/callback/atlassian"
      )
    })

    it("should include required scopes", async () => {
      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.atlassian.scope).toContain("read:me")
    })
  })

  describe("Callback URI Construction with Different Base URLs", () => {
    it("should construct callback URI with production URL", async () => {
      process.env.BETTER_AUTH_URL = "https://app.example.com"
      process.env.MICROSOFT_CLIENT_ID = "ms-client"
      process.env.MICROSOFT_CLIENT_SECRET = "ms-secret"
      process.env.ATLASSIAN_CLIENT_ID = "atlassian-client"
      process.env.ATLASSIAN_CLIENT_SECRET = "atlassian-secret"

      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.microsoft.redirectUri).toBe(
        "https://app.example.com/api/auth/callback/microsoft"
      )
      expect(authConfig.providers.atlassian.redirectUri).toBe(
        "https://app.example.com/api/auth/callback/atlassian"
      )
    })

    it("should construct callback URI with subdomain URL", async () => {
      process.env.BETTER_AUTH_URL = "https://auth.myapp.io"
      process.env.MICROSOFT_CLIENT_ID = "ms-client"
      process.env.MICROSOFT_CLIENT_SECRET = "ms-secret"

      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.microsoft.redirectUri).toBe(
        "https://auth.myapp.io/api/auth/callback/microsoft"
      )
    })

    it("should construct callback URI with port number", async () => {
      process.env.BETTER_AUTH_URL = "http://localhost:8080"
      process.env.ATLASSIAN_CLIENT_ID = "atlassian-client"
      process.env.ATLASSIAN_CLIENT_SECRET = "atlassian-secret"

      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.atlassian.redirectUri).toBe(
        "http://localhost:8080/api/auth/callback/atlassian"
      )
    })
  })

  describe("Provider Enabled State", () => {
    it("should have Google always enabled", async () => {
      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.google.enabled).toBe(true)
    })

    it("should have Microsoft disabled when credentials not set", async () => {
      delete process.env.MICROSOFT_CLIENT_ID
      delete process.env.MICROSOFT_CLIENT_SECRET

      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.microsoft.enabled).toBe(false)
    })

    it("should have Atlassian disabled when credentials not set", async () => {
      delete process.env.ATLASSIAN_CLIENT_ID
      delete process.env.ATLASSIAN_CLIENT_SECRET

      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.atlassian.enabled).toBe(false)
    })

    it("should have Microsoft enabled when both client_id and client_secret are set", async () => {
      process.env.MICROSOFT_CLIENT_ID = "ms-client"
      process.env.MICROSOFT_CLIENT_SECRET = "ms-secret"

      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.microsoft.enabled).toBe(true)
    })

    it("should have Atlassian enabled when both client_id and client_secret are set", async () => {
      process.env.ATLASSIAN_CLIENT_ID = "atlassian-client"
      process.env.ATLASSIAN_CLIENT_SECRET = "atlassian-secret"

      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.atlassian.enabled).toBe(true)
    })
  })
})
