import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock AWS SDK
const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn().mockResolvedValue({}),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(function() {
    return { send: mockSend };
  }),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
  HeadBucketCommand: vi.fn(),
  CreateBucketCommand: vi.fn(),
  PutBucketPolicyCommand: vi.fn(),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://signed-url.example.com"),
}));

import { getPublicUrl, uploadFile, getBucketName, buildKey } from "../storage"
import { PutObjectCommand } from "@aws-sdk/client-s3"

describe("Storage Utilities", () => {
  beforeEach(() => {
    process.env.STORAGE_BUCKET = "ui-syncup-storage"
    process.env.STORAGE_PUBLIC_URL = "http://127.0.0.1:9000/ui-syncup-storage"
    vi.clearAllMocks()
  })

  describe("getBucketName", () => {
    it("should return the configured bucket name", () => {
      expect(getBucketName()).toBe("ui-syncup-storage")
    })

    it("should return the default bucket name when env is not set", () => {
      delete process.env.STORAGE_BUCKET
      expect(getBucketName()).toBe("ui-syncup-storage")
    })
  })

  describe("buildKey", () => {
    it("should prefix attachments keys correctly", () => {
      const key = buildKey('attachments', "issues/t1/p1/i1/uuid.png")
      expect(key).toBe("attachments/issues/t1/p1/i1/uuid.png")
    })

    it("should prefix media keys correctly", () => {
      const key = buildKey('media', "avatars/user1/uuid.jpg")
      expect(key).toBe("media/avatars/user1/uuid.jpg")
    })
  })

  describe("getPublicUrl", () => {
    it("should generate a correct public URL from STORAGE_PUBLIC_URL", () => {
      const url = getPublicUrl("attachments/issues/t1/p1/i1/uuid.png")
      expect(url).toBe("http://127.0.0.1:9000/ui-syncup-storage/attachments/issues/t1/p1/i1/uuid.png")
    })

    it("should handle keys with leading slash", () => {
      const url = getPublicUrl("/media/avatars/user1/uuid.jpg")
      expect(url).not.toContain("//media")
      expect(url).toContain("media/avatars/user1/uuid.jpg")
    })
  })

  describe("uploadFile", () => {
    it("should call PutObjectCommand with correct parameters", async () => {
      const key = "attachments/issues/t1/p1/i1/uuid.png"
      const buffer = Buffer.from("test content")
      const contentType = "image/png"

      await uploadFile(key, buffer, contentType)

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: "ui-syncup-storage",
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    })

    it("should call PutObjectCommand for media keys", async () => {
      const key = "media/avatars/user1/uuid.jpg"
      const buffer = Buffer.from("image data")
      const contentType = "image/jpeg"

      await uploadFile(key, buffer, contentType)

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: "ui-syncup-storage",
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    })
  })
})
