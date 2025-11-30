/**
 * Property-Based Tests for Team Name Validation
 * 
 * Feature: team-system, Property 47: Team name validation enforced
 * Validates: Requirements 13.1
 * 
 * Tests that team name validation enforces:
 * - Minimum 2 characters
 * - Maximum 50 characters
 * - At least 2 alphanumeric characters
 */

import { describe, test, expect } from "vitest";
import fc from "fast-check";
import { teamNameSchema, validateTeamName } from "../validation";

describe("Property 47: Team name validation enforced", () => {
  test("valid team names pass validation", () => {
    fc.assert(
      fc.property(
        // Generate valid team names: 2-50 chars with at least 2 alphanumeric
        fc
          .string({ minLength: 2, maxLength: 50 })
          .filter((name) => {
            const alphanumericCount = (name.match(/[a-zA-Z0-9]/g) || []).length;
            return alphanumericCount >= 2;
          }),
        (name) => {
          const result = teamNameSchema.safeParse(name);
          expect(result.success).toBe(true);

          const validationResult = validateTeamName(name);
          expect(validationResult.valid).toBe(true);
          expect(validationResult.error).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  test("team names shorter than 2 characters are rejected", () => {
    fc.assert(
      fc.property(
        // Generate strings with 0-1 characters
        fc.string({ maxLength: 1 }),
        (name) => {
          const result = teamNameSchema.safeParse(name);
          expect(result.success).toBe(false);

          const validationResult = validateTeamName(name);
          expect(validationResult.valid).toBe(false);
          expect(validationResult.error).toContain("at least 2 characters");
        }
      ),
      { numRuns: 100 }
    );
  });

  test("team names longer than 50 characters are rejected", () => {
    fc.assert(
      fc.property(
        // Generate strings with 51-100 characters
        fc.string({ minLength: 51, maxLength: 100 }),
        (name) => {
          const result = teamNameSchema.safeParse(name);
          expect(result.success).toBe(false);

          const validationResult = validateTeamName(name);
          expect(validationResult.valid).toBe(false);
          expect(validationResult.error).toContain("at most 50 characters");
        }
      ),
      { numRuns: 100 }
    );
  });

  test("team names with fewer than 2 alphanumeric characters are rejected", () => {
    fc.assert(
      fc.property(
        // Generate strings with 2-50 chars but 0-1 alphanumeric
        fc
          .tuple(
            fc.constantFrom(0, 1), // number of alphanumeric chars
            fc.integer({ min: 2, max: 50 }) // total length
          )
          .chain(([alphaCount, totalLength]) => {
            // Generate string with exactly alphaCount alphanumeric chars
            const alphaChars = fc
              .array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789"), {
                minLength: alphaCount,
                maxLength: alphaCount,
              })
              .map((chars) => chars.join(""));

            const nonAlphaChars = fc
              .array(fc.constantFrom(" ", "-", "_", ".", "!", "@", "#"), {
                minLength: totalLength - alphaCount,
                maxLength: totalLength - alphaCount,
              })
              .map((chars) => chars.join(""));

            return fc
              .tuple(alphaChars, nonAlphaChars)
              .map(([alpha, nonAlpha]) => {
                // Interleave the characters
                const combined = (alpha + nonAlpha).split("");
                // Shuffle to mix alphanumeric and non-alphanumeric
                for (let i = combined.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [combined[i], combined[j]] = [combined[j], combined[i]];
                }
                return combined.join("");
              });
          }),
        (name) => {
          // Verify our generator created a string with < 2 alphanumeric chars
          const alphanumericCount = (name.match(/[a-zA-Z0-9]/g) || []).length;
          if (alphanumericCount >= 2) {
            // Skip this test case if generator failed to create invalid name
            return;
          }

          const result = teamNameSchema.safeParse(name);
          expect(result.success).toBe(false);

          const validationResult = validateTeamName(name);
          expect(validationResult.valid).toBe(false);
          expect(validationResult.error).toContain(
            "at least 2 alphanumeric characters"
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test("team names with exactly 2 characters pass validation", () => {
    fc.assert(
      fc.property(
        // Generate 2-character strings with at least 2 alphanumeric
        fc
          .tuple(
            fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789"),
            fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789")
          )
          .map(([a, b]) => a + b),
        (name) => {
          const result = teamNameSchema.safeParse(name);
          expect(result.success).toBe(true);

          const validationResult = validateTeamName(name);
          expect(validationResult.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("team names with exactly 50 characters pass validation", () => {
    fc.assert(
      fc.property(
        // Generate 50-character strings with at least 2 alphanumeric
        fc
          .array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789 -_"), {
            minLength: 50,
            maxLength: 50,
          })
          .map((chars) => chars.join(""))
          .filter((name) => {
            const alphanumericCount = (name.match(/[a-zA-Z0-9]/g) || []).length;
            return alphanumericCount >= 2;
          }),
        (name) => {
          const result = teamNameSchema.safeParse(name);
          expect(result.success).toBe(true);

          const validationResult = validateTeamName(name);
          expect(validationResult.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("team names with special characters and sufficient alphanumeric pass", () => {
    fc.assert(
      fc.property(
        // Generate names with mix of alphanumeric and special chars
        fc
          .tuple(
            // At least 2 alphanumeric characters
            fc.array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789"), {
              minLength: 2,
              maxLength: 25,
            }),
            // Some special characters
            fc.array(fc.constantFrom(" ", "-", "_", ".", "&", "'"), {
              minLength: 0,
              maxLength: 25,
            })
          )
          .map(([alphaChars, specialChars]) => {
            const combined = [...alphaChars, ...specialChars];
            // Shuffle
            for (let i = combined.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [combined[i], combined[j]] = [combined[j], combined[i]];
            }
            return combined.join("").slice(0, 50);
          })
          .filter((name) => name.length >= 2),
        (name) => {
          const result = teamNameSchema.safeParse(name);
          expect(result.success).toBe(true);

          const validationResult = validateTeamName(name);
          expect(validationResult.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
