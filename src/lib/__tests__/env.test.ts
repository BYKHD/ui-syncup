import { describe, it, expect, beforeEach, afterEach } from "vitest"

describe("Environment Variable Validation", () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset modules to clear cached env
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("should validate required environment variables", () => {
    // Set minimal required environment variables
    // @ts-expect-error - NODE_ENV is read-only in types but writable at runtime in test
    process.env.NODE_ENV = "test"
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3000/api"
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db"
    process.env.SUPABASE_URL = "https://test.supabase.co"
    process.env.SUPABASE_ANON_KEY = "test-anon-key"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
    process.env.R2_ACCOUNT_ID = "test-account-id"
    process.env.R2_ACCESS_KEY_ID = "test-access-key"
    process.env.R2_SECRET_ACCESS_KEY = "test-secret-key"
    process.env.R2_BUCKET_NAME = "test-bucket"
    process.env.R2_PUBLIC_URL = "https://test.r2.dev"
    process.env.GOOGLE_CLIENT_ID = "test-client-id"
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret"
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/callback"
    process.env.BETTER_AUTH_SECRET = "test-secret-key-with-32-characters-min"
    process.env.BETTER_AUTH_URL = "http://localhost:3000"

    // This should not throw
    expect(() => {
      // Re-import to trigger validation with new env
      delete require.cache[require.resolve("../env")]
      require("../env")
    }).not.toThrow()
  })

  it("should provide helpful error messages for missing variables", () => {
    // Clear all environment variables
    process.env = { NODE_ENV: "test" }

    expect(() => {
      delete require.cache[require.resolve("../env")]
      require("../env")
    }).toThrow("Environment validation failed")
  })

  it("should validate URL format for URL fields", () => {
    // @ts-expect-error - NODE_ENV is read-only in types but writable at runtime in test
    process.env.NODE_ENV = "test"
    process.env.NEXT_PUBLIC_APP_URL = "not-a-valid-url"
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3000/api"
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db"
    process.env.SUPABASE_URL = "https://test.supabase.co"
    process.env.SUPABASE_ANON_KEY = "test-anon-key"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
    process.env.R2_ACCOUNT_ID = "test-account-id"
    process.env.R2_ACCESS_KEY_ID = "test-access-key"
    process.env.R2_SECRET_ACCESS_KEY = "test-secret-key"
    process.env.R2_BUCKET_NAME = "test-bucket"
    process.env.R2_PUBLIC_URL = "https://test.r2.dev"
    process.env.GOOGLE_CLIENT_ID = "test-client-id"
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret"
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/callback"
    process.env.BETTER_AUTH_SECRET = "test-secret-key-with-32-characters-min"
    process.env.BETTER_AUTH_URL = "http://localhost:3000"

    expect(() => {
      delete require.cache[require.resolve("../env")]
      require("../env")
    }).toThrow()
  })

  it("should validate minimum length for BETTER_AUTH_SECRET", () => {
    // @ts-expect-error - NODE_ENV is read-only in types but writable at runtime in test
    process.env.NODE_ENV = "test"
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3000/api"
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db"
    process.env.SUPABASE_URL = "https://test.supabase.co"
    process.env.SUPABASE_ANON_KEY = "test-anon-key"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
    process.env.R2_ACCOUNT_ID = "test-account-id"
    process.env.R2_ACCESS_KEY_ID = "test-access-key"
    process.env.R2_SECRET_ACCESS_KEY = "test-secret-key"
    process.env.R2_BUCKET_NAME = "test-bucket"
    process.env.R2_PUBLIC_URL = "https://test.r2.dev"
    process.env.GOOGLE_CLIENT_ID = "test-client-id"
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret"
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/callback"
    process.env.BETTER_AUTH_SECRET = "too-short" // Less than 32 characters
    process.env.BETTER_AUTH_URL = "http://localhost:3000"

    expect(() => {
      delete require.cache[require.resolve("../env")]
      require("../env")
    }).toThrow()
  })
})
