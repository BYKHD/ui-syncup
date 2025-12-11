/**
 * Property-based tests for comment sanitization
 *
 * Tests XSS prevention invariants that should hold for ALL inputs
 * using property-based testing with fast-check.
 *
 * Feature: issue-annotation-integration
 * Task: 7.6 - Write property test for XSS sanitization (Property 21)
 * Validates: Requirements 10.3
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { sanitizeComment, containsDangerousContent } from '../sanitize';

// Property test configuration
const PROPERTY_CONFIG = {
  numRuns: 100,
  verbose: false,
};

// ============================================================================
// Arbitraries for generating test data
// ============================================================================

/**
 * Common XSS payloads for testing
 */
const xssPayloadArb = fc.constantFrom(
  '<script>alert("xss")</script>',
  '<img src="x" onerror="alert(1)">',
  '<svg onload="alert(1)">',
  '<a href="javascript:alert(1)">click</a>',
  '<div onclick="alert(1)">click me</div>',
  '<input onfocus="alert(1)" autofocus>',
  '<body onload="alert(1)">',
  '<iframe src="javascript:alert(1)">',
  '<object data="javascript:alert(1)">',
  '<embed src="javascript:alert(1)">',
  '<link rel="stylesheet" href="javascript:alert(1)">',
  '<style>@import "javascript:alert(1)"</style>',
  '<base href="javascript:alert(1)">',
  '<form action="javascript:alert(1)">',
  '<isindex action="javascript:alert(1)">',
  '<marquee onstart="alert(1)">',
  '<video><source onerror="alert(1)">',
  '<audio src="x" onerror="alert(1)">',
  '<table background="javascript:alert(1)">',
  '<td background="javascript:alert(1)">',
  '"><script>alert(1)</script>',
  '<img src=1 href=1 onerror="javascript:alert(1)"></img>',
  '<math><maction xlink:href="javascript:alert(1)">click</maction></math>',
  '<details open ontoggle="alert(1)">',
);

/**
 * HTML-based XSS payloads for containsDangerousContent testing
 * (excludes non-HTML payloads like "'-alert(1)-'")
 */
const htmlXssPayloadArb = fc.constantFrom(
  '<script>alert("xss")</script>',
  '<img src="x" onerror="alert(1)">',
  '<svg onload="alert(1)">',
  '<a href="javascript:alert(1)">click</a>',
  '<div onclick="alert(1)">click me</div>',
);

/**
 * HTML tag patterns for testing
 */
const htmlTagArb = fc.oneof(
  fc.tuple(
    fc.constantFrom('div', 'span', 'p', 'a', 'script', 'img', 'iframe', 'form', 'input'),
    fc.string({ minLength: 0, maxLength: 50 }),
  ).map(([tag, content]) => `<${tag}>${content}</${tag}>`),
  fc.tuple(
    fc.constantFrom('img', 'br', 'hr', 'input', 'meta', 'link'),
    fc.string({ minLength: 0, maxLength: 20 }),
  ).map(([tag, attrs]) => `<${tag} ${attrs}>`),
);

/**
 * JavaScript protocol patterns
 */
const jsProtocolArb = fc.constantFrom(
  'javascript:alert(1)',
  'JAVASCRIPT:alert(1)',
  'JaVaScRiPt:alert(1)',
  '  javascript:alert(1)',
  'javascript: alert(1)',
);

/**
 * Event handler patterns
 */
const eventHandlerArb = fc.tuple(
  fc.constantFrom('onclick', 'onerror', 'onload', 'onfocus', 'onmouseover', 'onsubmit'),
  fc.string({ minLength: 1, maxLength: 30 }),
).map(([handler, value]) => `${handler}="${value}"`);

/**
 * Safe text that should pass through unchanged
 */
const safeTextArb = fc.stringMatching(/^[a-zA-Z0-9\s.,!?'-]{1,100}$/);

/**
 * Mixed content with XSS payloads and safe text
 */
const mixedContentArb = fc.tuple(
  safeTextArb,
  xssPayloadArb,
  safeTextArb,
).map(([before, payload, after]) => `${before} ${payload} ${after}`);

// ============================================================================
// Property Tests
// ============================================================================

describe('Sanitization - Property-Based Tests', () => {
  /**
   * Feature: issue-annotation-integration, Property 21: XSS attack prevention
   * Validates: Requirements 10.3
   *
   * For any comment containing XSS payloads, the sanitizeComment function
   * should return a string that contains no executable code.
   */
  test('Property 21: XSS attack prevention - sanitized output contains no HTML tags', async () => {
    await fc.assert(
      fc.asyncProperty(
        xssPayloadArb,
        async (payload) => {
          const sanitized = sanitizeComment(payload);

          // Verify all HTML tags are removed
          expect(sanitized).not.toMatch(/<[^>]*>/);

          // Verify no javascript: protocol
          expect(sanitized.toLowerCase()).not.toContain('javascript:');

          // Verify no event handlers
          expect(sanitized).not.toMatch(/\bon\w+\s*=/i);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 21 (mixed content): Safe text is preserved while XSS is removed
   */
  test('Property 21: XSS attack prevention - safe text preserved in mixed content', async () => {
    await fc.assert(
      fc.asyncProperty(
        mixedContentArb,
        async (mixedContent) => {
          const sanitized = sanitizeComment(mixedContent);

          // Verify sanitized content has no HTML tags
          expect(sanitized).not.toMatch(/<[^>]*>/);

          // Verify sanitized content has no javascript:
          expect(sanitized.toLowerCase()).not.toContain('javascript:');

          // Verify output is not empty (safe text should be preserved)
          expect(sanitized.trim().length).toBeGreaterThan(0);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 21 (event handlers): All event handlers are stripped
   */
  test('Property 21: XSS attack prevention - event handlers are stripped', async () => {
    await fc.assert(
      fc.asyncProperty(
        eventHandlerArb,
        async (eventHandler) => {
          const input = `<div ${eventHandler}>content</div>`;
          const sanitized = sanitizeComment(input);

          // Verify event handler is removed
          expect(sanitized.toLowerCase()).not.toMatch(/\bon\w+\s*=/);

          // Verify HTML tag is removed
          expect(sanitized).not.toMatch(/<[^>]*>/);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 21 (javascript protocol): All javascript: protocols are stripped
   */
  test('Property 21: XSS attack prevention - javascript: protocols are stripped', async () => {
    await fc.assert(
      fc.asyncProperty(
        jsProtocolArb,
        async (jsProtocol) => {
          const input = `<a href="${jsProtocol}">link</a>`;
          const sanitized = sanitizeComment(input);

          // Verify javascript: protocol is removed
          expect(sanitized.toLowerCase()).not.toContain('javascript:');
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 21 (safe text): Pure text without HTML passes through safely
   */
  test('Property 21: XSS attack prevention - safe text passes through unchanged', async () => {
    await fc.assert(
      fc.asyncProperty(
        safeTextArb,
        async (safeText) => {
          const sanitized = sanitizeComment(safeText);

          // Safe text should pass through (whitespace may be normalized)
          const normalizedInput = safeText.trim().replace(/\s+/g, ' ');
          const normalizedOutput = sanitized.trim().replace(/\s+/g, ' ');

          expect(normalizedOutput).toBe(normalizedInput);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 21 (HTML tag removal): All HTML tags variants are stripped
   */
  test('Property 21: XSS attack prevention - all HTML tag patterns are stripped', async () => {
    await fc.assert(
      fc.asyncProperty(
        htmlTagArb,
        async (htmlTag) => {
          const sanitized = sanitizeComment(htmlTag);

          // Verify all HTML tags are removed
          expect(sanitized).not.toMatch(/<[^>]*>/);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 21 (dangerous content detection): containsDangerousContent correctly identifies threats
   */
  test('Property 21: XSS attack prevention - HTML-based dangerous content is correctly identified', async () => {
    await fc.assert(
      fc.asyncProperty(
        htmlXssPayloadArb,
        async (payload) => {
          // HTML-based XSS payloads should be identified as dangerous
          expect(containsDangerousContent(payload)).toBe(true);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 21 (output stability): Sanitizing twice produces same result
   */
  test('Property 21: XSS attack prevention - sanitization is idempotent', async () => {
    await fc.assert(
      fc.asyncProperty(
        mixedContentArb,
        async (input) => {
          const sanitizedOnce = sanitizeComment(input);
          const sanitizedTwice = sanitizeComment(sanitizedOnce);

          // Sanitizing twice should produce the same result
          expect(sanitizedTwice).toBe(sanitizedOnce);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 21 (empty input handling): Empty or null inputs return empty string
   */
  test('Property 21: XSS attack prevention - empty inputs return empty string', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('', '   ', null, undefined),
        async (emptyInput) => {
          const sanitized = sanitizeComment(emptyInput as unknown as string);
          expect(sanitized).toBe('');
        }
      ),
      PROPERTY_CONFIG
    );
  });
});
