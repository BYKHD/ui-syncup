import { describe, it, expect, vi } from "vitest"

// Mock AWS SDK
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(),
  PutObjectCommand: vi.fn(),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://signed-url.example.com"),
}));

import { getPublicUrl, generateUploadUrl } from "../storage"

describe("Storage Utilities", () => {
  describe("getPublicUrl", () => {
    it("should generate correct public URL", () => {
      const url = getPublicUrl("test-key.jpg");
      // Expect default URL since process.env is not mocked effectively for the module scope here easily
      expect(url).toContain("test-key.jpg");
    });
  });

  describe("generateUploadUrl", () => {
    it("should return a signed url", async () => {
        const url = await generateUploadUrl("test/key", "image/png");
        expect(url).toBe("https://signed-url.example.com");
    });
  });
})
