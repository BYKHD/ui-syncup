import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("../env", () => ({
  env: {
    NODE_ENV: "test",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    NEXT_PUBLIC_API_URL: "http://localhost:3000/api",
    VERCEL_ENV: undefined,
    VERCEL_GIT_COMMIT_REF: "main",
    VERCEL_GIT_COMMIT_SHA: "sha",
    VERCEL_GIT_COMMIT_MESSAGE: "msg",
    VERCEL_URL: "localhost:3000",
    NEXT_PUBLIC_ENABLE_ANALYTICS: "true",
    NEXT_PUBLIC_ENABLE_DEBUG: "false",
  },
  isProduction: () => false,
  isDevelopment: () => false,
  isTest: () => true,
  isPreview: () => false,
}))

describe("Config utilities", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("should expose environment helpers and names", async () => {
    const { isTest, isProduction, getEnvironment, config } = await import("../config")
    expect(isTest()).toBe(true)
    expect(isProduction()).toBe(false)
    expect(getEnvironment()).toBe("test")
    expect(config.env.name).toBe("test")
    expect(config.env.isTest).toBe(true)
  })

  it("should read feature flags from env", async () => {
    const { isAnalyticsEnabled, isDebugEnabled, isFeatureEnabled } = await import("../config")
    expect(isAnalyticsEnabled()).toBe(true)
    expect(isDebugEnabled()).toBe(false)
    expect(isFeatureEnabled("analytics")).toBe(true)
  })
})
