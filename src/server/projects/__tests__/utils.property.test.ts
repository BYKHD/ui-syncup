/**
 * Property-Based Tests for Project Utilities
 * 
 * Tests universal properties that should hold across all inputs.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { generateSlug } from "../utils";

describe("Project Utilities - Property Tests", () => {
  /**
   * **Feature: project-system, Property 7: Slug generation**
   * **Validates: Requirements 3.2**
   * 
   * For any project name, the generated slug SHALL be URL-friendly
   * (lowercase alphanumeric with hyphens, no leading/trailing hyphens,
   * no consecutive hyphens) and unique within the team.
   */
  it("Property 7: Slug generation produces URL-friendly output", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (projectName) => {
          const slug = generateSlug(projectName);

          // If the input has no valid characters, slug may be empty
          // This is acceptable behavior - validation should happen before slug generation
          if (slug === "") {
            // Empty slug is only acceptable if input had no alphanumeric characters
            const hasAlphanumeric = /[a-zA-Z0-9]/.test(projectName);
            expect(hasAlphanumeric).toBe(false);
            return;
          }

          // URL-friendly: lowercase alphanumeric with hyphens only
          expect(slug).toMatch(/^[a-z0-9-]+$/);

          // No leading hyphens
          expect(slug).not.toMatch(/^-/);

          // No trailing hyphens
          expect(slug).not.toMatch(/-$/);

          // No consecutive hyphens
          expect(slug).not.toMatch(/--/);

          // Should be lowercase
          expect(slug).toBe(slug.toLowerCase());
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 7: Slug generation is deterministic", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (projectName) => {
          const slug1 = generateSlug(projectName);
          const slug2 = generateSlug(projectName);

          // Same input should always produce same output
          expect(slug1).toBe(slug2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 7: Slug generation handles whitespace correctly", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (projectName) => {
          const slug = generateSlug(projectName);

          // Slug should never contain whitespace
          expect(slug).not.toMatch(/\s/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 7: Slug generation removes special characters", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (projectName) => {
          const slug = generateSlug(projectName);

          // Slug should only contain lowercase letters, numbers, and hyphens
          // Empty string is acceptable if input had no valid characters
          if (slug !== "") {
            expect(slug).toMatch(/^[a-z0-9-]+$/);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
