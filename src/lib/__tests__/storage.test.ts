import { describe, it, expect, beforeEach, vi } from "vitest"

// Mock env module before importing storage
vi.mock("../env", () => ({
  env: {
    NODE_ENV: "test",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    NEXT_PUBLIC_API_URL: "http://localhost:3000/api",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
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

// Mock AWS SDK
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
  HeadObjectCommand: vi.fn(),
  ListObjectsV2Command: vi.fn(),
}))

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://signed-url.example.com"),
}))

import { StorageClient, createStorageClient } from "../storage"

describe("StorageClient", () => {
  let storage: StorageClient

  beforeEach(() => {
    storage = createStorageClient({
      accountId: "test-account",
      accessKeyId: "test-key",
      secretAccessKey: "test-secret",
      bucketName: "test-bucket",
      publicUrl: "https://test.r2.dev",
    })
  })

  describe("getPublicUrl", () => {
    it("should generate correct public URL", () => {
      const url = storage.getPublicUrl("images/avatar.jpg")
      expect(url).toBe("https://test.r2.dev/images/avatar.jpg")
    })

    it("should handle keys without leading slash", () => {
      const url = storage.getPublicUrl("avatar.jpg")
      expect(url).toBe("https://test.r2.dev/avatar.jpg")
    })
  })

  describe("createStorageClient", () => {
    it("should create a storage client instance", () => {
      const client = createStorageClient()
      expect(client).toBeInstanceOf(StorageClient)
    })

    it("should accept custom options", () => {
      const client = createStorageClient({
        bucketName: "custom-bucket",
      })
      expect(client).toBeInstanceOf(StorageClient)
    })
  })
})
