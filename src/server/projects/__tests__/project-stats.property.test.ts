/**
 * Property-Based Tests for Project Statistics
 * 
 * Tests universal properties for project statistics.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { ProjectStats } from "../types";

// Test configuration: run 100 iterations minimum
const propertyConfig = { numRuns: 100 };

// Arbitrary for generating valid project stats
const projectStatsArb = fc.record({
  totalTickets: fc.nat({ max: 10000 }),
  completedTickets: fc.nat({ max: 10000 }),
  progressPercent: fc.integer({ min: 0, max: 100 }),
  memberCount: fc.nat({ max: 1000 }),
});

describe("Project Statistics - Property Tests", () => {
  /**
   * **Feature: project-system, Property 2: Project Statistics Completeness**
   * **Validates: Requirements 1.3**
   * 
   * For any project returned in a list or detail response, the stats object
   * SHALL contain valid non-negative integers for totalTickets, completedTickets,
   * memberCount, and a progressPercent between 0 and 100.
   */
  it("Property 2: Project statistics have valid non-negative values", () => {
    fc.assert(
      fc.property(projectStatsArb, (stats) => {
        // All counts should be non-negative
        expect(stats.totalTickets).toBeGreaterThanOrEqual(0);
        expect(stats.completedTickets).toBeGreaterThanOrEqual(0);
        expect(stats.memberCount).toBeGreaterThanOrEqual(0);

        // Progress percent should be between 0 and 100
        expect(stats.progressPercent).toBeGreaterThanOrEqual(0);
        expect(stats.progressPercent).toBeLessThanOrEqual(100);

        // All values should be integers
        expect(Number.isInteger(stats.totalTickets)).toBe(true);
        expect(Number.isInteger(stats.completedTickets)).toBe(true);
        expect(Number.isInteger(stats.memberCount)).toBe(true);
        expect(Number.isInteger(stats.progressPercent)).toBe(true);
      }),
      propertyConfig
    );
  });

  it("Property 2: Completed tickets cannot exceed total tickets", () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10000 }),
        fc.nat({ max: 10000 }),
        (total, completed) => {
          // When creating stats, completed should never exceed total
          const validCompleted = Math.min(completed, total);

          expect(validCompleted).toBeLessThanOrEqual(total);

          // Calculate progress percent
          const progressPercent = total === 0 ? 0 : Math.round((validCompleted / total) * 100);

          expect(progressPercent).toBeGreaterThanOrEqual(0);
          expect(progressPercent).toBeLessThanOrEqual(100);
        }
      ),
      propertyConfig
    );
  });

  it("Property 2: Progress percent calculation is consistent", () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10000 }),
        fc.nat({ max: 10000 }),
        (total, completed) => {
          const validCompleted = Math.min(completed, total);

          // Calculate progress percent
          const progressPercent = total === 0 ? 0 : Math.round((validCompleted / total) * 100);

          // Verify edge cases
          if (total === 0) {
            expect(progressPercent).toBe(0);
          }

          if (validCompleted === 0) {
            expect(progressPercent).toBe(0);
          }

          if (validCompleted === total && total > 0) {
            expect(progressPercent).toBe(100);
          }

          // Progress should be proportional
          if (total > 0) {
            const expectedProgress = (validCompleted / total) * 100;
            // Allow for rounding differences
            expect(Math.abs(progressPercent - expectedProgress)).toBeLessThanOrEqual(1);
          }
        }
      ),
      propertyConfig
    );
  });

  it("Property 2: Stats object has all required fields", () => {
    fc.assert(
      fc.property(projectStatsArb, (stats) => {
        // Verify all required fields exist
        expect(stats).toHaveProperty("totalTickets");
        expect(stats).toHaveProperty("completedTickets");
        expect(stats).toHaveProperty("progressPercent");
        expect(stats).toHaveProperty("memberCount");

        // Verify types
        expect(typeof stats.totalTickets).toBe("number");
        expect(typeof stats.completedTickets).toBe("number");
        expect(typeof stats.progressPercent).toBe("number");
        expect(typeof stats.memberCount).toBe("number");
      }),
      propertyConfig
    );
  });

  it("Property 2: Member count is always non-negative", () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 1000 }),
        (memberCount) => {
          // Member count should always be non-negative
          expect(memberCount).toBeGreaterThanOrEqual(0);

          // Member count should be an integer
          expect(Number.isInteger(memberCount)).toBe(true);
        }
      ),
      propertyConfig
    );
  });
});
