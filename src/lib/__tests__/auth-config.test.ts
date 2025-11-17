import { describe, it, expect, beforeEach } from "vitest"

describe("Auth Configuration", () => {
  beforeEach(() => {
    // Set all required environment variables
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
    process.env.GOOGLE_CLIENT_ID = "test-google-client-id"
    process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret"
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/auth/callback/google"
    process.env.BETTER_AUTH_SECRET = "test-secret-key-with-32-characters-minimum"
    process.env.BETTER_AUTH_URL = "http://localhost:3000"
    
    // Clear module cache to ensure fresh imports
    delete require.cache[require.resolve("../env")]
    delete require.cache[require.resolve("../auth-config")]
  })

  it("should create Google OAuth configuration from environment variables", () => {
    const { authConfig } = require("../auth-config")

    expect(authConfig.providers.google).toBeDefined()
    expect(authConfig.providers.google.clientId).toBe("test-google-client-id")
    expect(authConfig.providers.google.clientSecret).toBe("test-google-client-secret")
    expect(authConfig.providers.google.redirectUri).toBe("http://localhost:3000/api/auth/callback/google")
  })

  it("should include required OAuth scopes for Google", () => {
    const { authConfig } = require("../auth-config")

    expect(authConfig.providers.google.scope).toContain("openid")
    expect(authConfig.providers.google.scope).toContain("https://www.googleapis.com/auth/userinfo.email")
    expect(authConfig.providers.google.scope).toContain("https://www.googleapis.com/auth/userinfo.profile")
  })

  it("should configure session settings from environment", () => {
    const { authConfig } = require("../auth-config")

    expect(authConfig.session.secret).toBe("test-secret-key-with-32-characters-minimum")
    expect(authConfig.session.baseUrl).toBe("http://localhost:3000")
  })
})
