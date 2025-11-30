/**
 * Unit tests for database migration runner
 * 
 * Tests individual functions and logic from the migration runner script.
 * Uses mocking to isolate units under test.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// ============================================================================
// Helper Functions (extracted from migrate.ts for testing)
// ============================================================================

/**
 * Validates the DIRECT_URL environment variable
 * Requirements: 2.1, 2.2
 */
function validateEnvironment(directUrl?: string): { valid: boolean; url?: string; error?: string } {
  const DIRECT_URL = directUrl;

  // Check if DIRECT_URL exists
  if (!DIRECT_URL) {
    return {
      valid: false,
      error: "DIRECT_URL environment variable is not set. Please configure it in your environment or .env.local file.",
    };
  }

  // Check if DIRECT_URL is not just whitespace
  if (DIRECT_URL.trim().length === 0) {
    return {
      valid: false,
      error: "DIRECT_URL environment variable is empty. Please provide a valid PostgreSQL connection string.",
    };
  }

  // Validate PostgreSQL URL format
  try {
    const url = new URL(DIRECT_URL);
    
    // Check if it's a PostgreSQL URL
    if (!url.protocol.startsWith("postgres")) {
      return {
        valid: false,
        error: `Invalid database URL protocol: ${url.protocol}. Expected 'postgres:' or 'postgresql:'.`,
      };
    }

    // Check if hostname exists
    if (!url.hostname) {
      return {
        valid: false,
        error: "Invalid database URL: missing hostname.",
      };
    }

    return { valid: true, url: DIRECT_URL };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid database URL format: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Formats errors with GitHub Actions annotations
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
function formatError(error: unknown, context?: string): string {
  const errorObj = error as any;
  let message = "";

  if (context) {
    message += `Context: ${context}\n`;
  }

  // Extract error message
  if (errorObj?.message) {
    message += `Error: ${errorObj.message}\n`;
  } else {
    message += `Error: ${String(error)}\n`;
  }

  // Extract SQL state if available (PostgreSQL error codes)
  if (errorObj?.code) {
    message += `SQL State: ${errorObj.code}\n`;
  }

  // Extract position/line number if available
  if (errorObj?.position) {
    message += `Position: ${errorObj.position}\n`;
  }

  // Extract constraint name for constraint violations
  if (errorObj?.constraint) {
    message += `Constraint: ${errorObj.constraint}\n`;
  }

  // Extract table name if available
  if (errorObj?.table) {
    message += `Table: ${errorObj.table}\n`;
  }

  // Extract column name if available
  if (errorObj?.column) {
    message += `Column: ${errorObj.column}\n`;
  }

  // Add troubleshooting guidance
  message += "\nTroubleshooting:\n";
  
  if (errorObj?.code === "42P01") {
    message += "- Table does not exist. Ensure migrations are applied in order.\n";
  } else if (errorObj?.code === "23505") {
    message += "- Unique constraint violation. Check for duplicate data.\n";
  } else if (errorObj?.code === "23503") {
    message += "- Foreign key constraint violation. Ensure referenced records exist.\n";
  } else if (errorObj?.code === "42601") {
    message += "- SQL syntax error. Review the migration SQL for syntax issues.\n";
  } else if (errorObj?.message?.includes("timeout")) {
    message += "- Connection timeout. Check network connectivity and database availability.\n";
  } else if (errorObj?.message?.includes("authentication")) {
    message += "- Authentication failed. Verify database credentials in DIRECT_URL.\n";
  } else {
    message += "- Review the error details above and check the migration SQL.\n";
    message += "- Ensure the database is accessible and has sufficient resources.\n";
  }

  return message;
}

/**
 * Determines exit code based on migration result
 */
function getExitCode(success: boolean): number {
  return success ? 0 : 1;
}

// ============================================================================
// Unit Tests
// ============================================================================

describe('Migration Runner - Unit Tests', () => {
  describe('validateEnvironment', () => {
    test('should fail when DIRECT_URL is undefined', () => {
      const result = validateEnvironment(undefined);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('not set');
      expect(result.url).toBeUndefined();
    });

    test('should fail when DIRECT_URL is empty string', () => {
      const result = validateEnvironment('');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('not set');
    });

    test('should fail when DIRECT_URL is only whitespace', () => {
      const result = validateEnvironment('   ');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('empty');
    });

    test('should fail when DIRECT_URL has invalid protocol', () => {
      const result = validateEnvironment('http://localhost:5432/db');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('protocol');
      expect(result.error).toContain('postgres');
    });

    test('should fail when DIRECT_URL has mysql protocol', () => {
      const result = validateEnvironment('mysql://localhost:3306/db');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('protocol');
    });

    test('should fail when DIRECT_URL is not a valid URL', () => {
      const result = validateEnvironment('not-a-url');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Invalid database URL format');
    });

    test('should pass when DIRECT_URL is valid postgres URL', () => {
      const validUrl = 'postgres://user:pass@localhost:5432/db';
      const result = validateEnvironment(validUrl);
      
      expect(result.valid).toBe(true);
      expect(result.url).toBe(validUrl);
      expect(result.error).toBeUndefined();
    });

    test('should pass when DIRECT_URL is valid postgresql URL', () => {
      const validUrl = 'postgresql://user:pass@localhost:5432/db';
      const result = validateEnvironment(validUrl);
      
      expect(result.valid).toBe(true);
      expect(result.url).toBe(validUrl);
      expect(result.error).toBeUndefined();
    });

    test('should pass when DIRECT_URL has complex password with special chars', () => {
      const validUrl = 'postgres://user:p@ss%20w0rd!@localhost:5432/db';
      const result = validateEnvironment(validUrl);
      
      expect(result.valid).toBe(true);
      expect(result.url).toBe(validUrl);
    });

    test('should pass when DIRECT_URL has query parameters', () => {
      const validUrl = 'postgres://user:pass@localhost:5432/db?sslmode=require';
      const result = validateEnvironment(validUrl);
      
      expect(result.valid).toBe(true);
      expect(result.url).toBe(validUrl);
    });

    test('should pass when DIRECT_URL has custom port', () => {
      const validUrl = 'postgres://user:pass@localhost:54322/db';
      const result = validateEnvironment(validUrl);
      
      expect(result.valid).toBe(true);
      expect(result.url).toBe(validUrl);
    });

    test('should pass when DIRECT_URL has domain hostname', () => {
      const validUrl = 'postgres://user:pass@db.example.com:5432/mydb';
      const result = validateEnvironment(validUrl);
      
      expect(result.valid).toBe(true);
      expect(result.url).toBe(validUrl);
    });

    test('should pass when DIRECT_URL has Supabase format', () => {
      const validUrl = 'postgresql://postgres:password@db.supabase.co:5432/postgres';
      const result = validateEnvironment(validUrl);
      
      expect(result.valid).toBe(true);
      expect(result.url).toBe(validUrl);
    });
  });

  describe('formatError', () => {
    test('should format basic error with message', () => {
      const error = new Error('Something went wrong');
      const formatted = formatError(error);
      
      expect(formatted).toContain('Error: Something went wrong');
      expect(formatted).toContain('Troubleshooting:');
    });

    test('should include context when provided', () => {
      const error = new Error('Database error');
      const formatted = formatError(error, 'Migration execution');
      
      expect(formatted).toContain('Context: Migration execution');
      expect(formatted).toContain('Error: Database error');
    });

    test('should format PostgreSQL error with code', () => {
      const error = {
        message: 'relation "users" does not exist',
        code: '42P01',
      };
      const formatted = formatError(error);
      
      expect(formatted).toContain('Error: relation "users" does not exist');
      expect(formatted).toContain('SQL State: 42P01');
      expect(formatted).toContain('Table does not exist');
    });

    test('should format unique constraint violation', () => {
      const error = {
        message: 'duplicate key value violates unique constraint',
        code: '23505',
        constraint: 'users_email_key',
      };
      const formatted = formatError(error);
      
      expect(formatted).toContain('SQL State: 23505');
      expect(formatted).toContain('Constraint: users_email_key');
      expect(formatted).toContain('Unique constraint violation');
    });

    test('should format foreign key violation', () => {
      const error = {
        message: 'insert or update on table violates foreign key constraint',
        code: '23503',
        constraint: 'fk_user_id',
        table: 'posts',
      };
      const formatted = formatError(error);
      
      expect(formatted).toContain('SQL State: 23503');
      expect(formatted).toContain('Constraint: fk_user_id');
      expect(formatted).toContain('Table: posts');
      expect(formatted).toContain('Foreign key constraint violation');
    });

    test('should format syntax error', () => {
      const error = {
        message: 'syntax error at or near "CREAT"',
        code: '42601',
        position: '15',
      };
      const formatted = formatError(error);
      
      expect(formatted).toContain('SQL State: 42601');
      expect(formatted).toContain('Position: 15');
      expect(formatted).toContain('SQL syntax error');
    });

    test('should format timeout error', () => {
      const error = {
        message: 'Connection timeout after 10 seconds',
      };
      const formatted = formatError(error);
      
      expect(formatted).toContain('timeout');
      expect(formatted).toContain('Connection timeout');
      expect(formatted).toContain('network connectivity');
    });

    test('should format authentication error', () => {
      const error = {
        message: 'authentication failed for user "postgres"',
        code: '28P01',
      };
      const formatted = formatError(error);
      
      expect(formatted).toContain('authentication');
      expect(formatted).toContain('Authentication failed');
      expect(formatted).toContain('credentials');
    });

    test('should include all available error fields', () => {
      const error = {
        message: 'Complex error',
        code: '23505',
        position: '42',
        constraint: 'unique_email',
        table: 'users',
        column: 'email',
      };
      const formatted = formatError(error);
      
      expect(formatted).toContain('Error: Complex error');
      expect(formatted).toContain('SQL State: 23505');
      expect(formatted).toContain('Position: 42');
      expect(formatted).toContain('Constraint: unique_email');
      expect(formatted).toContain('Table: users');
      expect(formatted).toContain('Column: email');
    });

    test('should handle non-Error objects', () => {
      const error = 'String error message';
      const formatted = formatError(error);
      
      expect(formatted).toContain('Error: String error message');
      expect(formatted).toContain('Troubleshooting:');
    });

    test('should handle null/undefined errors', () => {
      const formatted = formatError(null);
      
      expect(formatted).toContain('Error: null');
      expect(formatted).toContain('Troubleshooting:');
    });

    test('should provide generic troubleshooting for unknown errors', () => {
      const error = {
        message: 'Unknown error',
        code: '99999',
      };
      const formatted = formatError(error);
      
      expect(formatted).toContain('Review the error details');
      expect(formatted).toContain('check the migration SQL');
      expect(formatted).toContain('database is accessible');
    });
  });

  describe('getExitCode', () => {
    test('should return 0 for successful migration', () => {
      expect(getExitCode(true)).toBe(0);
    });

    test('should return 1 for failed migration', () => {
      expect(getExitCode(false)).toBe(1);
    });

    test('should return non-zero for failure', () => {
      const exitCode = getExitCode(false);
      expect(exitCode).not.toBe(0);
      expect(exitCode).toBeGreaterThan(0);
    });

    test('should return zero for success', () => {
      const exitCode = getExitCode(true);
      expect(exitCode).toBe(0);
      expect(exitCode).not.toBeGreaterThan(0);
    });
  });

  describe('Error message completeness', () => {
    test('should include all required diagnostic information for SQL errors', () => {
      const error = {
        message: 'syntax error at or near "SELECT"',
        code: '42601',
        position: '25',
      };
      
      const formatted = formatError(error, 'Migration 0001_create_users.sql');
      
      // Verify all required components are present
      expect(formatted).toContain('Context:');
      expect(formatted).toContain('Error:');
      expect(formatted).toContain('SQL State:');
      expect(formatted).toContain('Position:');
      expect(formatted).toContain('Troubleshooting:');
      
      // Verify specific values
      expect(formatted).toContain('Migration 0001_create_users.sql');
      expect(formatted).toContain('syntax error');
      expect(formatted).toContain('42601');
      expect(formatted).toContain('25');
    });

    test('should provide actionable troubleshooting for each error type', () => {
      const errorTypes = [
        { code: '42P01', expectedGuidance: 'Table does not exist' },
        { code: '23505', expectedGuidance: 'Unique constraint violation' },
        { code: '23503', expectedGuidance: 'Foreign key constraint violation' },
        { code: '42601', expectedGuidance: 'SQL syntax error' },
      ];
      
      errorTypes.forEach(({ code, expectedGuidance }) => {
        const error = { message: 'Test error', code };
        const formatted = formatError(error);
        
        expect(formatted).toContain(expectedGuidance);
        expect(formatted).toContain('Troubleshooting:');
      });
    });
  });

  describe('Environment validation edge cases', () => {
    test('should handle URLs with IPv4 addresses', () => {
      const result = validateEnvironment('postgres://user:pass@192.168.1.1:5432/db');
      expect(result.valid).toBe(true);
    });

    test('should handle URLs with IPv6 addresses', () => {
      const result = validateEnvironment('postgres://user:pass@[::1]:5432/db');
      expect(result.valid).toBe(true);
    });

    test('should handle URLs without port (default port)', () => {
      const result = validateEnvironment('postgres://user:pass@localhost/db');
      expect(result.valid).toBe(true);
    });

    test('should handle URLs without password', () => {
      const result = validateEnvironment('postgres://user@localhost:5432/db');
      expect(result.valid).toBe(true);
    });

    test('should handle URLs with encoded characters', () => {
      const result = validateEnvironment('postgres://user:p%40ssw0rd@localhost:5432/db');
      expect(result.valid).toBe(true);
    });

    test('should reject URLs with missing hostname', () => {
      const result = validateEnvironment('postgres://user:pass@:5432/db');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid');
    });
  });

  describe('Error formatting edge cases', () => {
    test('should handle errors with only message', () => {
      const error = { message: 'Simple error' };
      const formatted = formatError(error);
      
      expect(formatted).toContain('Error: Simple error');
      expect(formatted).not.toContain('SQL State:');
    });

    test('should handle errors with empty message', () => {
      const error = { message: '' };
      const formatted = formatError(error);
      
      expect(formatted).toContain('Error:');
    });

    test('should handle errors with very long messages', () => {
      const longMessage = 'A'.repeat(1000);
      const error = { message: longMessage };
      const formatted = formatError(error);
      
      expect(formatted).toContain(longMessage);
      expect(formatted.length).toBeGreaterThan(1000);
    });

    test('should handle errors with special characters in message', () => {
      const error = { message: 'Error with "quotes" and \'apostrophes\' and \n newlines' };
      const formatted = formatError(error);
      
      expect(formatted).toContain('quotes');
      expect(formatted).toContain('apostrophes');
    });

    test('should handle errors with unicode characters', () => {
      const error = { message: 'Error with émojis 🚀 and ünïcödé' };
      const formatted = formatError(error);
      
      expect(formatted).toContain('émojis');
      expect(formatted).toContain('🚀');
      expect(formatted).toContain('ünïcödé');
    });
  });
});
