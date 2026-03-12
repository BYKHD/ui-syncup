import { describe, it, expect, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => {
  const mockEnd = vi.fn()
  const mockPostgres = vi.fn().mockReturnValue({ end: mockEnd })
  const mockDrizzle = vi.fn().mockReturnValue({
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  })

  return { mockEnd, mockPostgres, mockDrizzle }
})

vi.mock("postgres", () => ({
  __esModule: true,
  default: mocks.mockPostgres,
}))

vi.mock("drizzle-orm/postgres-js", () => ({
  __esModule: true,
  drizzle: mocks.mockDrizzle,
}))

describe("Database Client", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.unmock("@/lib/db")

    vi.doMock("../env", () => ({
      env: {
        NODE_ENV: "test",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        NEXT_PUBLIC_API_URL: "http://localhost:3000/api",
        DATABASE_URL: "postgresql://test:test@localhost:5432/test",
        DIRECT_URL: "postgresql://test:test@localhost:5432/test",
        SUPABASE_URL: "https://test.supabase.co",
        SUPABASE_ANON_KEY: "test-anon-key",
        SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
        R2_ACCOUNT_ID: "test-account-id",
        R2_ACCESS_KEY_ID: "test-access-key",
        R2_SECRET_ACCESS_KEY: "test-secret-key",
        R2_BUCKET_NAME: "test-bucket",
        R2_PUBLIC_URL: "https://test.r2.dev",
        GOOGLE_CLIENT_ID: "test-client-id",
        GOOGLE_CLIENT_SECRET: "test-client-secret",
        GOOGLE_REDIRECT_URI: "http://localhost:3000/api/auth/callback/google",
        BETTER_AUTH_SECRET: "test-secret-key-with-at-least-32-characters",
        BETTER_AUTH_URL: "http://localhost:3000",
      },
      isProduction: () => false,
      isDevelopment: () => false,
      isTest: () => true,
      isPreview: () => false,
      getDeploymentInfo: () => ({
        environment: "test",
        branch: "test",
        commitSha: "test",
        commitMessage: "test",
        deploymentUrl: "localhost:3000",
        timestamp: new Date().toISOString(),
      }),
    }))
  })

  it("should create postgres client with correct connection string", async () => {
    // Import after mocks are set up
    const { connectionString, connectionOptions, dbClient } = await import("../db")

    expect(connectionString).toBe("postgresql://test:test@localhost:5432/test")
    expect(connectionOptions).toMatchObject({
      ssl: false,
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: true,
    })
    expect(dbClient).toHaveProperty("end")
  })

  it("should export db instance", async () => {
    const { db } = await import("../db")
    expect(db).toBeDefined()
    expect(db).toHaveProperty("select")
  })

  it("should export closeDatabase function", async () => {
    const { closeDatabase } = await import("../db")
    expect(closeDatabase).toBeDefined()
    expect(typeof closeDatabase).toBe("function")
  })

  it("should close database connection when closeDatabase is called", async () => {
    const { closeDatabase, dbClient } = await import("../db")
    const endSpy = vi.spyOn(dbClient, "end").mockResolvedValue(undefined as never)
    await closeDatabase()
    expect(endSpy).toHaveBeenCalled()
  })
})
