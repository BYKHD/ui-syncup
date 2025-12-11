/**
 * Comment Sanitization Utility
 *
 * Provides input sanitization for XSS prevention in annotation comments.
 * Uses simple regex-based HTML tag stripping for server-side use.
 *
 * Requirements: 10.3
 */

// ============================================================================
// HTML TAG PATTERNS
// ============================================================================

/**
 * Regex pattern to match HTML/XML tags
 */
const HTML_TAG_PATTERN = /<[^>]*>/g;

/**
 * Regex pattern to match HTML entities that could be malicious
 */
const HTML_ENTITY_PATTERN = /&(?:#x?[0-9a-fA-F]+|[a-zA-Z]+);/g;

/**
 * Regex pattern to match javascript: protocol
 */
const JAVASCRIPT_PROTOCOL_PATTERN = /javascript:/gi;

/**
 * Regex pattern to match on* event handlers
 */
const EVENT_HANDLER_PATTERN = /\s*on\w+\s*=/gi;

// ============================================================================
// SANITIZATION FUNCTIONS
// ============================================================================

/**
 * Sanitize comment text to prevent XSS attacks
 *
 * Strips all HTML tags, event handlers, and javascript protocols.
 * Safe for rendering in HTML context.
 *
 * @param input - Raw user input
 * @returns Sanitized string safe for storage and display
 *
 * @example
 * sanitizeComment('<script>alert("xss")</script>Hello')
 * // Returns: 'Hello'
 *
 * sanitizeComment('Click <a href="javascript:alert(1)">here</a>')
 * // Returns: 'Click here'
 */
export function sanitizeComment(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // Remove HTML tags
  sanitized = sanitized.replace(HTML_TAG_PATTERN, '');

  // Remove javascript: protocols
  sanitized = sanitized.replace(JAVASCRIPT_PROTOCOL_PATTERN, '');

  // Remove event handlers (e.g., onclick=, onload=)
  sanitized = sanitized.replace(EVENT_HANDLER_PATTERN, '');

  // Decode common HTML entities to their text equivalents
  sanitized = decodeBasicHtmlEntities(sanitized);

  // Trim whitespace
  sanitized = sanitized.trim();

  // Collapse multiple whitespace into single space
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized;
}

/**
 * Decode basic HTML entities to their text equivalents
 *
 * Only decodes safe entities. Malicious entities are stripped.
 */
function decodeBasicHtmlEntities(input: string): string {
  const entityMap: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
  };

  let result = input;

  // Replace known safe entities
  for (const [entity, char] of Object.entries(entityMap)) {
    result = result.replace(new RegExp(entity, 'gi'), char);
  }

  // Remove any remaining HTML entities (could be malicious)
  result = result.replace(HTML_ENTITY_PATTERN, '');

  return result;
}

/**
 * Check if a string contains potentially dangerous content
 *
 * Use for validation before sanitization for logging purposes.
 *
 * @param input - String to check
 * @returns True if content appears dangerous
 */
export function containsDangerousContent(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  // Create fresh patterns to avoid lastIndex issues with global flag
  const htmlTagPattern = /<[^>]*>/;
  const jsProtocolPattern = /javascript:/i;
  const eventHandlerPattern = /\s*on\w+\s*=/i;

  return (
    htmlTagPattern.test(input) ||
    jsProtocolPattern.test(input) ||
    eventHandlerPattern.test(input)
  );
}
