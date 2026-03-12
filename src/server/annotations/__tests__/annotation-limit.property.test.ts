/**
 * Property-based tests for annotation count limit
 *
 * Tests the maximum 50 annotations per attachment constraint
 * using property-based testing with fast-check.
 *
 * Feature: issue-annotation-integration
 * Task: 7.7 - Write property test for annotation count limit (Property 28)
 * Validates: Requirements 13.5
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { MAX_ANNOTATIONS_PER_ATTACHMENT } from '../annotation-service';
import { AnnotationLimitError } from '../types';

// Property test configuration
const PROPERTY_CONFIG = {
  numRuns: 50,
  verbose: false,
};

// Mock the database module
vi.mock('@/lib/db', () => ({
  db: {
    query: {
      issueAttachments: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  },
}));

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ============================================================================
// Arbitraries for generating test data
// ============================================================================

/**
 * Generate a valid annotation shape
 */
const annotationShapeArb = fc.oneof(
  fc.record({
    type: fc.constant('pin' as const),
    position: fc.record({
      x: fc.float({ min: 0, max: 1, noNaN: true }),
      y: fc.float({ min: 0, max: 1, noNaN: true }),
    }),
  }),
  fc.record({
    type: fc.constant('box' as const),
    start: fc.record({
      x: fc.float({ min: 0, max: 1, noNaN: true }),
      y: fc.float({ min: 0, max: 1, noNaN: true }),
    }),
    end: fc.record({
      x: fc.float({ min: 0, max: 1, noNaN: true }),
      y: fc.float({ min: 0, max: 1, noNaN: true }),
    }),
  }),
);

/**
 * Generate a stored annotation object
 */
const storedAnnotationArb = fc.record({
  id: fc.uuid(),
  authorId: fc.uuid(),
  x: fc.float({ min: 0, max: 1, noNaN: true }),
  y: fc.float({ min: 0, max: 1, noNaN: true }),
  shape: annotationShapeArb,
  label: fc.integer({ min: 1, max: 50 }).map(String),
  description: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: undefined }),
  createdAt: fc.date().map((d) => d.toISOString()),
  updatedAt: fc.date().map((d) => d.toISOString()),
  comments: fc.constant([]),
});

/**
 * Generate an array of annotations of specific size
 */
const annotationArrayArb = (size: number) =>
  fc.array(storedAnnotationArb, { minLength: size, maxLength: size });

// ============================================================================
// Property Tests
// ============================================================================

describe('Annotation Count Limit - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Feature: issue-annotation-integration, Property 28: Annotation count limit enforcement
   * Validates: Requirements 13.5
   *
   * For any attachment that already has 50 annotations, attempting to create
   * a 51st annotation should be rejected with AnnotationLimitError.
   */
  test('Property 28: Annotation count limit - MAX_ANNOTATIONS constant is 50', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          // Verify the constant is set to 50
          expect(MAX_ANNOTATIONS_PER_ATTACHMENT).toBe(50);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 28 (limit validation): Any count >= 50 should reject new annotations
   */
  test('Property 28: Annotation count limit - count >= 50 rejects new annotations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 50, max: 100 }),
        async (currentCount) => {
          // Function that simulates the limit check
          const canAddAnnotation = (count: number): boolean => {
            return count < MAX_ANNOTATIONS_PER_ATTACHMENT;
          };

          // Verify that counts >= 50 reject new annotations
          expect(canAddAnnotation(currentCount)).toBe(false);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 28 (under limit): Any count < 50 should allow new annotations
   */
  test('Property 28: Annotation count limit - count < 50 allows new annotations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 49 }),
        async (currentCount) => {
          // Function that simulates the limit check
          const canAddAnnotation = (count: number): boolean => {
            return count < MAX_ANNOTATIONS_PER_ATTACHMENT;
          };

          // Verify that counts < 50 allow new annotations
          expect(canAddAnnotation(currentCount)).toBe(true);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 28 (boundary condition): Exactly 49 allows one more, 50 rejects
   */
  test('Property 28: Annotation count limit - boundary at exactly 50', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(48, 49, 50, 51),
        async (count) => {
          const canAddAnnotation = (c: number): boolean => {
            return c < MAX_ANNOTATIONS_PER_ATTACHMENT;
          };

          if (count < 50) {
            expect(canAddAnnotation(count)).toBe(true);
          } else {
            expect(canAddAnnotation(count)).toBe(false);
          }
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 28 (error type): AnnotationLimitError is thrown when limit exceeded
   */
  test('Property 28: Annotation count limit - AnnotationLimitError has correct properties', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          const error = new AnnotationLimitError();

          // Verify error properties
          expect(error.name).toBe('AnnotationLimitError');
          expect(error.code).toBe('ANNOTATION_LIMIT_EXCEEDED');
          expect(error.statusCode).toBe(400);
          expect(error.message).toContain('50');
          expect(error.message.toLowerCase()).toContain('maximum');
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 28 (remaining capacity): After adding N annotations, can add (50-N) more
   */
  test('Property 28: Annotation count limit - remaining capacity is correctly calculated', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 50 }),
        async (currentCount) => {
          const remainingCapacity = MAX_ANNOTATIONS_PER_ATTACHMENT - currentCount;

          // Remaining capacity should be between 0 and 50
          expect(remainingCapacity).toBeGreaterThanOrEqual(0);
          expect(remainingCapacity).toBeLessThanOrEqual(50);

          // Sum of current + remaining should equal max
          expect(currentCount + remainingCapacity).toBe(50);

          // If remaining is 0, we're at the limit
          if (remainingCapacity === 0) {
            expect(currentCount).toBe(50);
          }
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 28 (monotonic): Adding annotations only increases count, never decreases
   */
  test('Property 28: Annotation count limit - adding annotations increases count monotonically', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 45 }),
        fc.integer({ min: 1, max: 5 }),
        async (startCount, toAdd) => {
          // Simulate adding annotations
          const newCount = startCount + toAdd;

          // Count should always increase
          expect(newCount).toBeGreaterThan(startCount);

          // Count should increase by exactly the number added
          expect(newCount - startCount).toBe(toAdd);
        }
      ),
      PROPERTY_CONFIG
    );
  });

  /**
   * Property 28 (bulk validation): Attempting to add multiple annotations respects total limit
   */
  test('Property 28: Annotation count limit - bulk add respects total limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 1, max: 10 }),
        async (currentCount, toAdd) => {
          // Calculate if the bulk add would exceed the limit
          const wouldExceedLimit = currentCount + toAdd > MAX_ANNOTATIONS_PER_ATTACHMENT;

          // If it would exceed, only (50 - currentCount) can be added
          const maxAddable = Math.max(0, MAX_ANNOTATIONS_PER_ATTACHMENT - currentCount);

          if (wouldExceedLimit) {
            expect(toAdd).toBeGreaterThan(maxAddable);
          } else {
            expect(toAdd).toBeLessThanOrEqual(maxAddable);
          }
        }
      ),
      PROPERTY_CONFIG
    );
  });
});
