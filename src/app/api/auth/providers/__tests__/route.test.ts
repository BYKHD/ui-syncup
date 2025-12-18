import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { NextRequest } from "next/server"

/**
 * **Feature: social-login-integration, Property 9: Provider visibility based on config**
 * **Validates: Requirements 5.3**
 *
 * Tests for the GET /api/auth/providers endpoint that returns
 * OAuth provider enabled status for client-side rendering.
 */

// Mock logger to avoid side effects
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe("GET /api/auth/providers", () => {
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

    // Clear optional OAuth providers
    delete process.env.MICROSOFT_CLIENT_ID
    delete process.env.MICROSOFT_CLIENT_SECRET
    delete process.env.MICROSOFT_TENANT_ID
    delete process.env.ATLASSIAN_CLIENT_ID
    delete process.env.ATLASSIAN_CLIENT_SECRET
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  describe("Successful Responses", () => {
    it("should return 200 status code", async () => {
      const { GET } = await import("../route")
      const response = await GET()

      expect(response.status).toBe(200)
    })

    it("should return JSON content type", async () => {
      const { GET } = await import("../route")
      const response = await GET()

      expect(response.headers.get("content-type")).toContain("application/json")
    })

    it("should include cache headers for performance", async () => {
      const { GET } = await import("../route")
      const response = await GET()

      const cacheControl = response.headers.get("cache-control")
      expect(cacheControl).toContain("max-age=300")
    })

    it("should return providers object with all three providers", async () => {
      const { GET } = await import("../route")
      const response = await GET()
      const data = await response.json()

      expect(data.providers).toBeDefined()
      expect(data.providers).toHaveProperty("google")
      expect(data.providers).toHaveProperty("microsoft")
      expect(data.providers).toHaveProperty("atlassian")
    })

    it("should return enabled status for each provider", async () => {
      const { GET } = await import("../route")
      const response = await GET()
      const data = await response.json()

      expect(data.providers.google).toHaveProperty("enabled")
      expect(data.providers.microsoft).toHaveProperty("enabled")
      expect(data.providers.atlassian).toHaveProperty("enabled")
    })
  })

  describe("Provider Enabled/Disabled States", () => {
    it("should show Google as enabled (always required)", async () => {
      const { GET } = await import("../route")
      const response = await GET()
      const data = await response.json()

      expect(data.providers.google.enabled).toBe(true)
    })

    it("should show Microsoft as disabled when credentials not set", async () => {
      const { GET } = await import("../route")
      const response = await GET()
      const data = await response.json()

      expect(data.providers.microsoft.enabled).toBe(false)
    })

    it("should show Atlassian as disabled when credentials not set", async () => {
      const { GET } = await import("../route")
      const response = await GET()
      const data = await response.json()

      expect(data.providers.atlassian.enabled).toBe(false)
    })

    it("should show Microsoft as enabled when credentials are set", async () => {
      process.env.MICROSOFT_CLIENT_ID = "ms-client-id"
      process.env.MICROSOFT_CLIENT_SECRET = "ms-client-secret"

      const { GET } = await import("../route")
      const response = await GET()
      const data = await response.json()

      expect(data.providers.microsoft.enabled).toBe(true)
    })

    it("should show Atlassian as enabled when credentials are set", async () => {
      process.env.ATLASSIAN_CLIENT_ID = "atlassian-client-id"
      process.env.ATLASSIAN_CLIENT_SECRET = "atlassian-client-secret"

      const { GET } = await import("../route")
      const response = await GET()
      const data = await response.json()

      expect(data.providers.atlassian.enabled).toBe(true)
    })

    it("should show all providers enabled when all credentials are set", async () => {
      process.env.MICROSOFT_CLIENT_ID = "ms-client-id"
      process.env.MICROSOFT_CLIENT_SECRET = "ms-client-secret"
      process.env.ATLASSIAN_CLIENT_ID = "atlassian-client-id"
      process.env.ATLASSIAN_CLIENT_SECRET = "atlassian-client-secret"

      const { GET } = await import("../route")
      const response = await GET()
      const data = await response.json()

      expect(data.providers.google.enabled).toBe(true)
      expect(data.providers.microsoft.enabled).toBe(true)
      expect(data.providers.atlassian.enabled).toBe(true)
    })
  })

  describe("Response Structure", () => {
    it("should not expose sensitive configuration data", async () => {
      process.env.MICROSOFT_CLIENT_ID = "secret-ms-client-id"
      process.env.MICROSOFT_CLIENT_SECRET = "secret-ms-client-secret"

      const { GET } = await import("../route")
      const response = await GET()
      const data = await response.json()
      const responseText = JSON.stringify(data)

      // Should not contain any secrets
      expect(responseText).not.toContain("secret-ms-client-id")
      expect(responseText).not.toContain("secret-ms-client-secret")
      expect(responseText).not.toContain("clientId")
      expect(responseText).not.toContain("clientSecret")
      expect(responseText).not.toContain("redirectUri")
    })

    it("should only return boolean enabled status", async () => {
      const { GET } = await import("../route")
      const response = await GET()
      const data = await response.json()

      // Each provider should only have the enabled property
      expect(Object.keys(data.providers.google)).toEqual(["enabled"])
      expect(Object.keys(data.providers.microsoft)).toEqual(["enabled"])
      expect(Object.keys(data.providers.atlassian)).toEqual(["enabled"])

      // enabled should be boolean
      expect(typeof data.providers.google.enabled).toBe("boolean")
      expect(typeof data.providers.microsoft.enabled).toBe("boolean")
      expect(typeof data.providers.atlassian.enabled).toBe("boolean")
    })

    it("should match the ProvidersResponse interface structure", async () => {
      const { GET } = await import("../route")
      const response = await GET()
      const data = await response.json()

      // Validate structure matches ProvidersResponse
      expect(data).toEqual({
        providers: {
          google: { enabled: expect.any(Boolean) },
          microsoft: { enabled: expect.any(Boolean) },
          atlassian: { enabled: expect.any(Boolean) },
        },
      })
    })
  })

  describe("Public Access", () => {
    it("should be accessible without authentication", async () => {
      // No session/auth headers needed
      const { GET } = await import("../route")
      const response = await GET()

      expect(response.status).toBe(200)
    })

    it("should not require any cookies or headers", async () => {
      const { GET } = await import("../route")
      // Called without any request object - should still work
      const response = await GET()

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.providers).toBeDefined()
    })
  })
})
