/**
 * Token Encryption Tests (Tasks 9.1, 9.2)
 *
 * Tests for token encryption and decryption utilities.
 *
 * @module server/auth/__tests__/token-encryption
 */

import { describe, test, expect } from "vitest";
import {
  encryptToken,
  decryptToken,
  isEncryptionAvailable,
} from "../token-encryption";

// Test key (32 bytes / 256 bits)
const TEST_KEY = "01234567890123456789012345678901";
const SHORT_KEY = "short";

describe("Token Encryption (Tasks 9.1, 9.2)", () => {
  describe("encryptToken", () => {
    test("should encrypt a token successfully", () => {
      const token = "my-secret-access-token";
      const encrypted = encryptToken(token, TEST_KEY);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe("string");
      expect(encrypted).not.toBe(token);
    });

    test("should produce different ciphertext for same plaintext (random IV)", () => {
      const token = "same-token";
      const encrypted1 = encryptToken(token, TEST_KEY);
      const encrypted2 = encryptToken(token, TEST_KEY);

      // Random IV ensures different ciphertexts
      expect(encrypted1).not.toBe(encrypted2);
    });

    test("should throw error for empty token", () => {
      expect(() => encryptToken("", TEST_KEY)).toThrow("Token cannot be empty");
    });

    test("should throw error for short key", () => {
      expect(() => encryptToken("token", SHORT_KEY)).toThrow(
        /Encryption key must be at least/
      );
    });

    test("should throw error for missing key", () => {
      expect(() => encryptToken("token", "")).toThrow(
        /Encryption key must be at least/
      );
    });
  });

  describe("decryptToken", () => {
    test("should decrypt an encrypted token successfully", () => {
      const originalToken = "my-secret-access-token";
      const encrypted = encryptToken(originalToken, TEST_KEY);
      const decrypted = decryptToken(encrypted, TEST_KEY);

      expect(decrypted).toBe(originalToken);
    });

    test("should handle various token formats", () => {
      const tokens = [
        "simple-token",
        "token-with-special-chars!@#$%^&*()",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U",
        "unicode-🔐-token",
      ];

      for (const token of tokens) {
        const encrypted = encryptToken(token, TEST_KEY);
        const decrypted = decryptToken(encrypted, TEST_KEY);
        expect(decrypted).toBe(token);
      }
    });

    test("should throw error for tampered ciphertext", () => {
      const token = "original-token";
      const encrypted = encryptToken(token, TEST_KEY);

      // Tamper with the encrypted data
      const tamperedBuffer = Buffer.from(encrypted, "base64");
      tamperedBuffer[20] ^= 0xff; // Flip some bits
      const tampered = tamperedBuffer.toString("base64");

      expect(() => decryptToken(tampered, TEST_KEY)).toThrow(
        /Failed to decrypt|invalid/i
      );
    });

    test("should throw error for wrong key", () => {
      const token = "secret-token";
      const encrypted = encryptToken(token, TEST_KEY);
      const wrongKey = "wrong-key-that-is-32-bytes-long!";

      expect(() => decryptToken(encrypted, wrongKey)).toThrow(
        /Failed to decrypt|invalid/i
      );
    });

    test("should throw error for empty encrypted token", () => {
      expect(() => decryptToken("", TEST_KEY)).toThrow(
        /Encrypted token cannot be empty/
      );
    });

    test("should throw error for invalid format (too short)", () => {
      const tooShort = Buffer.from("short").toString("base64");
      expect(() => decryptToken(tooShort, TEST_KEY)).toThrow(
        /Invalid encrypted token format/
      );
    });
  });

  describe("encryption/decryption roundtrip", () => {
    test("should roundtrip long tokens", () => {
      const longToken = "a".repeat(1000);
      const encrypted = encryptToken(longToken, TEST_KEY);
      const decrypted = decryptToken(encrypted, TEST_KEY);
      expect(decrypted).toBe(longToken);
    });

    test("should roundtrip JSON tokens", () => {
      const jsonToken = JSON.stringify({
        accessToken: "abc123",
        refreshToken: "xyz789",
        expiresAt: Date.now(),
      });
      const encrypted = encryptToken(jsonToken, TEST_KEY);
      const decrypted = decryptToken(encrypted, TEST_KEY);
      expect(decrypted).toBe(jsonToken);
      expect(JSON.parse(decrypted)).toEqual(JSON.parse(jsonToken));
    });
  });

  describe("key handling", () => {
    test("should work with exactly 32-byte key", () => {
      const exactKey = "a".repeat(32);
      const token = "test-token";
      const encrypted = encryptToken(token, exactKey);
      const decrypted = decryptToken(encrypted, exactKey);
      expect(decrypted).toBe(token);
    });

    test("should truncate longer keys to 32 bytes", () => {
      const longKey = "a".repeat(64);
      const token = "test-token";
      
      // Should work by using first 32 bytes
      const encrypted = encryptToken(token, longKey);
      const decrypted = decryptToken(encrypted, longKey);
      expect(decrypted).toBe(token);

      // Same result with just first 32 bytes
      const shortKey = "a".repeat(32);
      const decrypted2 = decryptToken(encrypted, shortKey);
      expect(decrypted2).toBe(token);
    });
  });
});

describe("isEncryptionAvailable", () => {
  test("should return boolean", () => {
    const result = isEncryptionAvailable();
    expect(typeof result).toBe("boolean");
  });
});
