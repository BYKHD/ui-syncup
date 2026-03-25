import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

describe("Environment Variable Validation", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    // Reset environment per test
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("should validate required environment variables", async () => {
    // Set minimal required environment variables
    // @ts-expect-error - NODE_ENV is read-only in types but writable at runtime in test
    process.env.NODE_ENV = "test"
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3000/api"
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db"
    process.env.SUPABASE_URL = "https://test.supabase.co"
    process.env.SUPABASE_ANON_KEY = "test-anon-key"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
    process.env.STORAGE_BUCKET = "test-bucket"
    process.env.GOOGLE_CLIENT_ID = "test-client-id"
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret"
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/callback"
    process.env.BETTER_AUTH_SECRET = "test-secret-key-with-32-characters-min"
    process.env.BETTER_AUTH_URL = "http://localhost:3000"

    // This should not throw
    await expect(import("../env")).resolves.toBeDefined()
  })

  it("should allow Google redirect without OAuth credentials", async () => {
    // @ts-expect-error - NODE_ENV is read-only in types but writable at runtime in test
    process.env.NODE_ENV = "test"
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3000/api"
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db"
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/callback"
    process.env.BETTER_AUTH_SECRET = "test-secret-key-with-32-characters-min"
    process.env.BETTER_AUTH_URL = "http://localhost:3000"

    await expect(import("../env")).resolves.toBeDefined()
  })

  it("should provide helpful error messages for missing variables", async () => {
    // Clear all environment variables
    process.env = { NODE_ENV: "test" }

    await expect(import("../env")).rejects.toThrow("Environment validation failed")
  })

  it("should validate URL format for URL fields", async () => {
    // @ts-expect-error - NODE_ENV is read-only in types but writable at runtime in test
    process.env.NODE_ENV = "test"
    process.env.NEXT_PUBLIC_APP_URL = "not-a-valid-url"
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3000/api"
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db"
    process.env.SUPABASE_URL = "https://test.supabase.co"
    process.env.SUPABASE_ANON_KEY = "test-anon-key"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
    process.env.STORAGE_BUCKET = "test-bucket"
    process.env.GOOGLE_CLIENT_ID = "test-client-id"
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret"
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/callback"
    process.env.BETTER_AUTH_SECRET = "test-secret-key-with-32-characters-min"
    process.env.BETTER_AUTH_URL = "http://localhost:3000"

    await expect(import("../env")).rejects.toThrow()
  })

  it("should validate minimum length for BETTER_AUTH_SECRET", async () => {
    // @ts-expect-error - NODE_ENV is read-only in types but writable at runtime in test
    process.env.NODE_ENV = "test"
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3000/api"
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db"
    process.env.SUPABASE_URL = "https://test.supabase.co"
    process.env.SUPABASE_ANON_KEY = "test-anon-key"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
    process.env.STORAGE_BUCKET = "test-bucket"
    process.env.GOOGLE_CLIENT_ID = "test-client-id"
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret"
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/callback"
    process.env.BETTER_AUTH_SECRET = "too-short" // Less than 32 characters
    process.env.BETTER_AUTH_URL = "http://localhost:3000"

    await expect(import("../env")).rejects.toThrow()
  })

  it("should validate with Microsoft OAuth variables", async () => {
    // Set minimal required environment variables plus Microsoft OAuth
    // @ts-expect-error - NODE_ENV is read-only in types but writable at runtime in test
    process.env.NODE_ENV = "test"
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3000/api"
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db"
    process.env.SUPABASE_URL = "https://test.supabase.co"
    process.env.SUPABASE_ANON_KEY = "test-anon-key"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
    process.env.GOOGLE_CLIENT_ID = "test-client-id"
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret"
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/callback"
    process.env.BETTER_AUTH_SECRET = "test-secret-key-with-32-characters-min"
    process.env.BETTER_AUTH_URL = "http://localhost:3000"
    process.env.RESEND_API_KEY = "re_test_key"
    process.env.RESEND_FROM_EMAIL = "test@example.com"
    // Microsoft OAuth variables
    process.env.MICROSOFT_CLIENT_ID = "ms-client-id"
    process.env.MICROSOFT_CLIENT_SECRET = "ms-client-secret"
    process.env.MICROSOFT_TENANT_ID = "common"

    await expect(import("../env")).resolves.toBeDefined()
  })

  it("should validate with Atlassian OAuth variables", async () => {
    // Set minimal required environment variables plus Atlassian OAuth
    // @ts-expect-error - NODE_ENV is read-only in types but writable at runtime in test
    process.env.NODE_ENV = "test"
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3000/api"
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db"
    process.env.SUPABASE_URL = "https://test.supabase.co"
    process.env.SUPABASE_ANON_KEY = "test-anon-key"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
    process.env.GOOGLE_CLIENT_ID = "test-client-id"
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret"
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/callback"
    process.env.BETTER_AUTH_SECRET = "test-secret-key-with-32-characters-min"
    process.env.BETTER_AUTH_URL = "http://localhost:3000"
    process.env.RESEND_API_KEY = "re_test_key"
    process.env.RESEND_FROM_EMAIL = "test@example.com"
    // Atlassian OAuth variables
    process.env.ATLASSIAN_CLIENT_ID = "atlassian-client-id"
    process.env.ATLASSIAN_CLIENT_SECRET = "atlassian-client-secret"

    await expect(import("../env")).resolves.toBeDefined()
  })

  it("should validate without Microsoft or Atlassian OAuth variables (optional)", async () => {
    // Set minimal required environment variables without new OAuth providers
    // @ts-expect-error - NODE_ENV is read-only in types but writable at runtime in test
    process.env.NODE_ENV = "test"
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3000/api"
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db"
    process.env.SUPABASE_URL = "https://test.supabase.co"
    process.env.SUPABASE_ANON_KEY = "test-anon-key"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
    process.env.GOOGLE_CLIENT_ID = "test-client-id"
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret"
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/callback"
    process.env.BETTER_AUTH_SECRET = "test-secret-key-with-32-characters-min"
    process.env.BETTER_AUTH_URL = "http://localhost:3000"
    process.env.RESEND_API_KEY = "re_test_key"
    process.env.RESEND_FROM_EMAIL = "test@example.com"
    // No Microsoft or Atlassian variables set

    await expect(import("../env")).resolves.toBeDefined()
  })
})
