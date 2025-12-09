import { describe, it, expect, vi } from "vitest"

// Mock AWS SDK
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(),
  PutObjectCommand: vi.fn(),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://signed-url.example.com"),
}));

import { getPublicUrl, generateUploadUrl, getBucketName } from "../storage"

describe("Storage Utilities", () => {
  describe("getPublicUrl", () => {
    it("should generate correct URL for attachments bucket", () => {
      const url = getPublicUrl('attachments', "test-key.jpg");
      expect(url).toContain("ui-syncup-attachments");
      expect(url).toContain("test-key.jpg");
    });

    it("should generate correct URL for media bucket", () => {
      const url = getPublicUrl('media', "avatar.png");
      expect(url).toContain("ui-syncup-media");
      expect(url).toContain("avatar.png");
    });

    it("should handle keys with leading slash", () => {
      const url = getPublicUrl('attachments', "/test-key.jpg");
      expect(url).not.toContain("//test-key");
    });
  });

  describe("generateUploadUrl", () => {
    it("should return a signed url for attachments bucket", async () => {
      const url = await generateUploadUrl('attachments', "test/key", "image/png");
      expect(url).toBe("https://signed-url.example.com");
    });

    it("should return a signed url for media bucket", async () => {
      const url = await generateUploadUrl('media', "avatars/user1.jpg", "image/jpeg");
      expect(url).toBe("https://signed-url.example.com");
    });
  });

  describe("getBucketName", () => {
    it("should return correct bucket name for attachments", () => {
      const name = getBucketName('attachments');
      expect(name).toBe("ui-syncup-attachments");
    });

    it("should return correct bucket name for media", () => {
      const name = getBucketName('media');
      expect(name).toBe("ui-syncup-media");
    });
  });
})
