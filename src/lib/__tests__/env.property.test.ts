/**
 * Property-based tests: Environment Validation
 *
 * Feature: smtp-fallback, Property 3: Environment Validation
 * Validates: Requirements 2.4
 *
 * Property: For any environment configuration map, if SMTP_HOST is defined,
 * the system must assert SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and
 * SMTP_FROM_EMAIL accurately or fail startup validation.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import * as fc from "fast-check"

// ============================================================================
// Helpers
// ============================================================================

/** Minimal required env vars (non-SMTP, non-Resend) */
const BASE_ENV: Record<string, string> = {
  NODE_ENV: "test",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_API_URL: "http://localhost:3000/api",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  BETTER_AUTH_SECRET: "a-very-long-secret-key-used-for-auth-32",
  BETTER_AUTH_URL: "http://localhost:3000",
}

/** All five required SMTP fields populated with valid values */
const SMTP_FULL: Record<string, string> = {
  SMTP_HOST: "mail.example.com",
  SMTP_PORT: "587",
  SMTP_USER: "user@example.com",
  SMTP_PASSWORD: "s3cr3t",
  SMTP_FROM_EMAIL: "noreply@example.com",
}

// ============================================================================
// Arbitraries
// ============================================================================

/** Generates one of the four required SMTP companion keys */
const smtpCompanionKeyArb = fc.constantFrom(
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM_EMAIL"
)

// ============================================================================
// Tests
// ============================================================================

describe("Property 3: Environment Validation (smtp-fallback)", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  /**
   * P3a: When SMTP_HOST is defined but at least one companion field is
   * missing, Zod validation MUST reject the configuration.
   */
  it(
    "P3a: should REJECT when SMTP_HOST is present but a required companion field is missing",
    async () => {
      await fc.assert(
        fc.asyncProperty(smtpCompanionKeyArb, async (missingKey) => {
          vi.resetModules()

          // Build a fresh env — full SMTP but omit one companion field
          const partialSmtp = { ...SMTP_FULL }
          delete partialSmtp[missingKey]

          // @ts-expect-error - process.env spread is not fully typed in test context
          process.env = {
            ...BASE_ENV,
            ...partialSmtp,  // SMTP_HOST is still set
          }

          await expect(import("../env")).rejects.toThrow(
            "Environment validation failed"
          )
        }),
        { numRuns: 100 }
      )
    }
  )

  /**
   * P3b: When all five SMTP fields are valid and complete, Zod schema
   * MUST accept the configuration in non-production (test) mode.
   */
  it(
    "P3b: should ACCEPT a fully configured SMTP configuration (no Resend needed)",
    async () => {
      vi.resetModules()

      // @ts-expect-error - process.env spread is not fully typed in test context
      process.env = {
        ...BASE_ENV,
        ...SMTP_FULL,
      }

      await expect(import("../env")).resolves.toBeDefined()
    }
  )

  /**
   * P3c: When SMTP_HOST is absent, a single orphaned SMTP companion field
   * should NOT cause a validation failure (group validation is skipped).
   */
  it(
    "P3c: should ACCEPT configuration when SMTP_HOST is absent even if other SMTP fields are present",
    async () => {
      // Valid values per companion key (prevents type-level Zod rejection)
      const validValueByKey: Record<string, string> = {
        SMTP_PORT: "587",
        SMTP_USER: "user@example.com",
        SMTP_PASSWORD: "secret123",
        SMTP_FROM_EMAIL: "noreply@example.com",
      }

      const smtpCompanionKeyWithValueArb = fc.constantFrom(
        ...Object.keys(validValueByKey) as (keyof typeof validValueByKey)[]
      )

      await fc.assert(
        fc.asyncProperty(smtpCompanionKeyWithValueArb, async (extraKey) => {
          vi.resetModules()

          // Provide only one companion field but NO SMTP_HOST
          // @ts-expect-error - process.env spread is not fully typed in test context
          process.env = {
            ...BASE_ENV,
            RESEND_API_KEY: "re_test_key",
            RESEND_FROM_EMAIL: "sender@example.com",
            [extraKey]: validValueByKey[extraKey],
          }

          // Should not reject — no SMTP_HOST means group validation is skipped
          await expect(import("../env")).resolves.toBeDefined()
        }),
        { numRuns: 50 }
      )
    }
  )

  /**
   * P3d: In a production-like environment, SMTP can fully replace Resend
   * when all five SMTP fields are supplied.
   */
  it(
    "P3d: should ACCEPT full SMTP config as email provider in production (no Resend)",
    async () => {
      vi.resetModules()

      process.env = {
        ...BASE_ENV,
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: "https://app.example.com",
        NEXT_PUBLIC_API_URL: "https://app.example.com/api",
        ...SMTP_FULL,
      }

      await expect(import("../env")).resolves.toBeDefined()
    }
  )

  /**
   * P3e: In a production-like environment, having neither Resend nor SMTP
   * configured MUST fail validation.
   */
  it(
    "P3e: should REJECT production config when neither Resend nor SMTP is configured",
    async () => {
      vi.resetModules()

      process.env = {
        ...BASE_ENV,
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: "https://app.example.com",
        NEXT_PUBLIC_API_URL: "https://app.example.com/api",
        // No RESEND_* and no SMTP_* variables
      }

      await expect(import("../env")).rejects.toThrow(
        "Environment validation failed"
      )
    }
  )
})
