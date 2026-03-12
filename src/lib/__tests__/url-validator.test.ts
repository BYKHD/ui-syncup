/**
 * Unit Tests for URL Validator
 *
 * Tests the validateEmailUrl function to ensure it correctly prevents
 * localhost URLs in production/preview environments while allowing them
 * in development.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { validateEmailUrl } from '../url-validator'

// Store original environment
const originalVercelEnv = process.env.VERCEL_ENV

describe('validateEmailUrl', () => {
  afterEach(() => {
    // Restore original environment after each test
    process.env.VERCEL_ENV = originalVercelEnv
    vi.restoreAllMocks()
  })

  describe('in development environment (no VERCEL_ENV)', () => {
    beforeEach(() => {
      delete process.env.VERCEL_ENV
    })

    it('should allow localhost URLs', () => {
      const url = 'http://localhost:3000/verify-email-confirm?token=abc123'

      // Should not throw
      expect(() => validateEmailUrl(url, 'test')).not.toThrow()
    })

    it('should allow 127.0.0.1 URLs', () => {
      const url = 'http://127.0.0.1:3000/verify-email-confirm?token=abc123'

      // Should not throw
      expect(() => validateEmailUrl(url, 'test')).not.toThrow()
    })

    it('should allow production URLs', () => {
      const url = 'https://ui-syncup.com/verify-email-confirm?token=abc123'

      // Should not throw
      expect(() => validateEmailUrl(url, 'test')).not.toThrow()
    })
  })

  describe('in production environment', () => {
    beforeEach(() => {
      process.env.VERCEL_ENV = 'production'
    })

    it('should throw error for localhost URLs', () => {
      const url = 'http://localhost:3000/verify-email-confirm?token=abc123'

      // Should throw with clear error message
      expect(() => validateEmailUrl(url, 'test-context')).toThrow(
        /localhost URLs not allowed in production/
      )
    })

    it('should throw error for 127.0.0.1 URLs', () => {
      const url = 'http://127.0.0.1:3000/verify-email-confirm?token=abc123'

      // Should throw
      expect(() => validateEmailUrl(url, 'test-context')).toThrow(
        /localhost URLs not allowed in production/
      )
    })

    it('should allow production URLs', () => {
      const url = 'https://ui-syncup.com/verify-email-confirm?token=abc123'

      // Should not throw
      expect(() => validateEmailUrl(url, 'test-context')).not.toThrow()
    })

    it('should log error details before throwing', () => {
      const url = 'http://localhost:3000/verify-email-confirm?token=abc123'
      const context = 'email-verification'

      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      try {
        validateEmailUrl(url, context)
      } catch (error) {
        // Expected to throw
      }

      // Should have logged error before throwing
      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })

    it('should include configuration hint in error message', () => {
      const url = 'http://localhost:3000/verify-email-confirm?token=abc123'

      // Error message should mention BETTER_AUTH_URL configuration
      expect(() => validateEmailUrl(url, 'test')).toThrow(/BETTER_AUTH_URL/)
    })
  })

  describe('in preview environment', () => {
    beforeEach(() => {
      process.env.VERCEL_ENV = 'preview'
    })

    it('should log warning for localhost URLs but not throw', () => {
      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const url = 'http://localhost:3000/verify-email-confirm?token=abc123'

      // Should not throw (only production throws)
      expect(() => validateEmailUrl(url, 'test-context')).not.toThrow()

      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('URL_VALIDATION_ERROR'),
        expect.any(Object)
      )

      consoleErrorSpy.mockRestore()
    })

    it('should allow preview domain URLs', () => {
      const url = 'https://dev.ui-syncup.com/verify-email-confirm?token=abc123'

      // Should not throw
      expect(() => validateEmailUrl(url, 'test')).not.toThrow()
    })

    it('should allow Vercel preview URLs', () => {
      const url = 'https://ui-syncup-git-develop-username.vercel.app/verify-email-confirm?token=abc123'

      // Should not throw
      expect(() => validateEmailUrl(url, 'test')).not.toThrow()
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      delete process.env.VERCEL_ENV
    })

    it('should handle invalid URL format gracefully', () => {
      const invalidUrl = 'not-a-valid-url'

      // Should log error but not throw (lets email sending fail naturally)
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => validateEmailUrl(invalidUrl, 'test')).not.toThrow()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid URL format'),
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    it('should not throw on TypeError from URL parsing', () => {
      const invalidUrl = 'definitely-not-a-url'

      // Should not throw even though URL parsing fails
      expect(() => validateEmailUrl(invalidUrl, 'test')).not.toThrow()
    })
  })
})

// Task 8.2: Redirect URL Validation Tests
describe('Redirect URL Validation (Task 8.2)', () => {
  // Dynamic import to re-import the module for these tests
  let isValidRedirectURL: (url: string, allowedOrigins?: string[]) => boolean
  let sanitizeRedirectURL: (url: string | null | undefined, fallback?: string, allowedOrigins?: string[]) => string

  beforeEach(async () => {
    const validatorModule = await import('../url-validator')
    isValidRedirectURL = validatorModule.isValidRedirectURL
    sanitizeRedirectURL = validatorModule.sanitizeRedirectURL
  })

  describe('isValidRedirectURL', () => {
    it('should allow simple relative paths', () => {
      expect(isValidRedirectURL('/dashboard')).toBe(true)
      expect(isValidRedirectURL('/projects')).toBe(true)
      expect(isValidRedirectURL('/settings/security')).toBe(true)
    })

    it('should allow root path', () => {
      expect(isValidRedirectURL('/')).toBe(true)
    })

    it('should block protocol-relative URLs', () => {
      expect(isValidRedirectURL('//evil.com')).toBe(false)
    })

    it('should block javascript: URLs', () => {
      expect(isValidRedirectURL('javascript:alert(1)')).toBe(false)
    })

    it('should block absolute URLs without allowed origins', () => {
      expect(isValidRedirectURL('https://evil.com')).toBe(false)
    })

    it('should allow URLs matching allowed origins', () => {
      const origins = ['https://app.example.com']
      expect(isValidRedirectURL('https://app.example.com/dashboard', origins)).toBe(true)
    })

    it('should block empty strings', () => {
      expect(isValidRedirectURL('')).toBe(false)
    })
  })

  describe('sanitizeRedirectURL', () => {
    it('should return valid URL unchanged', () => {
      expect(sanitizeRedirectURL('/dashboard', '/')).toBe('/dashboard')
    })

    it('should return fallback for invalid URLs', () => {
      expect(sanitizeRedirectURL('https://evil.com', '/')).toBe('/')
    })

    it('should return fallback for null', () => {
      expect(sanitizeRedirectURL(null, '/default')).toBe('/default')
    })
  })
})

