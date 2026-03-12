import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

describe("Auth Configuration", () => {
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
    process.env.GOOGLE_CLIENT_ID = "test-google-client-id"
    process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret"
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/auth/callback/google"
    process.env.BETTER_AUTH_SECRET = "test-secret-key-with-32-characters-minimum"
    process.env.BETTER_AUTH_URL = "http://localhost:3000"
    process.env.RESEND_API_KEY = "re_test_key"
    process.env.RESEND_FROM_EMAIL = "test@example.com"

    // Explicitly clear optional OAuth providers to ensure test isolation
    delete process.env.MICROSOFT_CLIENT_ID
    delete process.env.MICROSOFT_CLIENT_SECRET
    delete process.env.MICROSOFT_TENANT_ID
    delete process.env.ATLASSIAN_CLIENT_ID
    delete process.env.ATLASSIAN_CLIENT_SECRET
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe("Google OAuth", () => {
    it("should create Google OAuth configuration from environment variables", async () => {
      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.google).toBeDefined()
      expect(authConfig.providers.google.clientId).toBe("test-google-client-id")
      expect(authConfig.providers.google.clientSecret).toBe("test-google-client-secret")
      expect(authConfig.providers.google.redirectUri).toBe("http://localhost:3000/api/auth/callback/google")
      expect(authConfig.providers.google.enabled).toBe(true)
    })

    it("should include required OAuth scopes for Google", async () => {
      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.google.scope).toContain("openid")
      expect(authConfig.providers.google.scope).toContain("https://www.googleapis.com/auth/userinfo.email")
      expect(authConfig.providers.google.scope).toContain("https://www.googleapis.com/auth/userinfo.profile")
    })
  })

  describe("Microsoft OAuth", () => {
    it("should be disabled when environment variables are not set", async () => {
      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.microsoft.enabled).toBe(false)
      expect(authConfig.providers.microsoft.clientId).toBe("")
    })

    it("should be enabled when environment variables are set", async () => {
      process.env.MICROSOFT_CLIENT_ID = "ms-client-id"
      process.env.MICROSOFT_CLIENT_SECRET = "ms-client-secret"
      process.env.MICROSOFT_TENANT_ID = "test-tenant"

      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.microsoft.enabled).toBe(true)
      expect(authConfig.providers.microsoft.clientId).toBe("ms-client-id")
      expect(authConfig.providers.microsoft.clientSecret).toBe("ms-client-secret")
      expect(authConfig.providers.microsoft.tenantId).toBe("test-tenant")
    })

    it("should default tenantId to 'common' when not specified", async () => {
      process.env.MICROSOFT_CLIENT_ID = "ms-client-id"
      process.env.MICROSOFT_CLIENT_SECRET = "ms-client-secret"

      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.microsoft.tenantId).toBe("common")
    })

    it("should construct correct redirect URI", async () => {
      process.env.MICROSOFT_CLIENT_ID = "ms-client-id"
      process.env.MICROSOFT_CLIENT_SECRET = "ms-client-secret"

      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.microsoft.redirectUri).toBe(
        "http://localhost:3000/api/auth/callback/microsoft"
      )
    })
  })

  describe("Atlassian OAuth", () => {
    it("should be disabled when environment variables are not set", async () => {
      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.atlassian.enabled).toBe(false)
      expect(authConfig.providers.atlassian.clientId).toBe("")
    })

    it("should be enabled when environment variables are set", async () => {
      process.env.ATLASSIAN_CLIENT_ID = "atlassian-client-id"
      process.env.ATLASSIAN_CLIENT_SECRET = "atlassian-client-secret"

      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.atlassian.enabled).toBe(true)
      expect(authConfig.providers.atlassian.clientId).toBe("atlassian-client-id")
      expect(authConfig.providers.atlassian.clientSecret).toBe("atlassian-client-secret")
    })

    it("should construct correct redirect URI", async () => {
      process.env.ATLASSIAN_CLIENT_ID = "atlassian-client-id"
      process.env.ATLASSIAN_CLIENT_SECRET = "atlassian-client-secret"

      const { authConfig } = await import("../auth-config")

      expect(authConfig.providers.atlassian.redirectUri).toBe(
        "http://localhost:3000/api/auth/callback/atlassian"
      )
    })
  })

  describe("getEnabledProviders", () => {
    it("should return only Google when others are not configured", async () => {
      const { getEnabledProviders } = await import("../auth-config")

      const enabled = getEnabledProviders()
      expect(enabled).toContain("google")
      expect(enabled).not.toContain("microsoft")
      expect(enabled).not.toContain("atlassian")
    })

    it("should return all providers when all are configured", async () => {
      process.env.MICROSOFT_CLIENT_ID = "ms-client-id"
      process.env.MICROSOFT_CLIENT_SECRET = "ms-client-secret"
      process.env.ATLASSIAN_CLIENT_ID = "atlassian-client-id"
      process.env.ATLASSIAN_CLIENT_SECRET = "atlassian-client-secret"

      const { getEnabledProviders } = await import("../auth-config")

      const enabled = getEnabledProviders()
      expect(enabled).toContain("google")
      expect(enabled).toContain("microsoft")
      expect(enabled).toContain("atlassian")
      expect(enabled).toHaveLength(3)
    })
  })

  describe("Session Configuration", () => {
    it("should configure session settings from environment", async () => {
      const { authConfig } = await import("../auth-config")

      expect(authConfig.session.secret).toBe("test-secret-key-with-32-characters-minimum")
      expect(authConfig.session.baseUrl).toBe("http://localhost:3000")
    })
  })
})
