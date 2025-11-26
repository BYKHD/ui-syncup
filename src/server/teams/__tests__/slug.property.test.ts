/**
 * Property-based tests for slug generation
 * Feature: team-system, Property 2: Slug generation produces URL-friendly unique slugs
 * Validates: Requirements 1.2, 13.2
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import fc from "fast-check";
import { generateSlug, generateUniqueSlug, ensureUniqueSlug } from "../slug";
import { db } from "@/lib/db";
import { teams } from "@/server/db/schema/teams";
import { eq } from "drizzle-orm";

// Test configuration: run 100 iterations minimum
const propertyConfig = { numRuns: 100 };

// Arbitrary for valid team names (2-50 characters with at least 2 alphanumeric characters)
const teamNameArb = fc
  .string({ minLength: 2, maxLength: 50 })
  .filter((name) => {
    // Must contain at least 2 alphanumeric characters
    const alphanumericCount = (name.match(/[a-zA-Z0-9]/g) || []).length;
    return alphanumericCount >= 2;
  });

describe("Property 2: Slug generation produces URL-friendly unique slugs", () => {
  // Clean up test data after each test
  const testTeamIds: string[] = [];

  afterEach(async () => {
    // Clean up all test teams
    if (testTeamIds.length > 0) {
      await db.delete(teams).where(
        eq(teams.id, testTeamIds[0])
      );
      testTeamIds.length = 0;
    }
  });

  test("generated slugs contain only lowercase letters, numbers, and hyphens", () => {
    fc.assert(
      fc.property(teamNameArb, (name) => {
        const slug = generateSlug(name);
        
        // Slug should only contain lowercase letters, numbers, and hyphens
        const urlFriendlyPattern = /^[a-z0-9-]*$/;
        expect(slug).toMatch(urlFriendlyPattern);
      }),
      propertyConfig
    );
  });

  test("generated slugs have no leading or trailing hyphens", () => {
    fc.assert(
      fc.property(teamNameArb, (name) => {
        const slug = generateSlug(name);
        
        if (slug.length > 0) {
          // Should not start or end with hyphen
          expect(slug[0]).not.toBe("-");
          expect(slug[slug.length - 1]).not.toBe("-");
        }
      }),
      propertyConfig
    );
  });

  test("generated slugs have no consecutive hyphens", () => {
    fc.assert(
      fc.property(teamNameArb, (name) => {
        const slug = generateSlug(name);
        
        // Should not contain consecutive hyphens
        expect(slug).not.toMatch(/--/);
      }),
      propertyConfig
    );
  });

  test("unique slug generation ensures uniqueness by appending numeric suffix", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 2, maxLength: 20 }),
        async (baseName) => {
          // Create a team with a specific slug
          const baseSlug = generateSlug(baseName);
          
          // Skip if slug is empty (edge case)
          if (!baseSlug) {
            return true;
          }

          const [team1] = await db
            .insert(teams)
            .values({
              name: baseName,
              slug: baseSlug,
              planId: "free",
              billableSeats: 0,
            })
            .returning();

          testTeamIds.push(team1.id);

          // Generate unique slug for same base name
          const uniqueSlug = await ensureUniqueSlug(baseSlug);

          // Should be different from existing slug
          expect(uniqueSlug).not.toBe(baseSlug);

          // Should follow pattern: baseSlug-N where N is a number
          const suffixPattern = new RegExp(`^${baseSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d+$`);
          expect(uniqueSlug).toMatch(suffixPattern);

          // Clean up
          await db.delete(teams).where(eq(teams.id, team1.id));
          testTeamIds.length = 0;

          return true;
        }
      ),
      { ...propertyConfig, numRuns: 20 } // Fewer runs for DB operations
    );
  });

  test("slug generation is deterministic for same input", () => {
    fc.assert(
      fc.property(teamNameArb, (name) => {
        const slug1 = generateSlug(name);
        const slug2 = generateSlug(name);
        
        // Same input should produce same slug
        expect(slug1).toBe(slug2);
      }),
      propertyConfig
    );
  });

  test("different team names produce different slugs (collision resistance)", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.string({ minLength: 2, maxLength: 50 }),
          fc.string({ minLength: 2, maxLength: 50 })
        ).filter(([name1, name2]) => name1 !== name2),
        ([name1, name2]) => {
          const slug1 = generateSlug(name1);
          const slug2 = generateSlug(name2);
          
          // Different names should produce different slugs (most of the time)
          // Note: Some collisions are acceptable (e.g., "Hello World" and "hello-world")
          // but we expect most to be different
          if (name1.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-") !== 
              name2.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-")) {
            // If the normalized forms are different, slugs should be different
            expect(slug1).not.toBe(slug2);
          }
        }
      ),
      propertyConfig
    );
  });

  test("slug generation handles special characters correctly", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 50 }),
        (name) => {
          const slug = generateSlug(name);
          
          // Special characters should be removed or converted
          // Slug should not contain: !@#$%^&*()+=[]{}|;:'",.<>?/\`~
          const specialChars = /[!@#$%^&*()+=[\]{}|;:'",.<>?/\\`~]/;
          expect(slug).not.toMatch(specialChars);
        }
      ),
      propertyConfig
    );
  });

  test("slug generation handles unicode characters", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 50 }),
        (name) => {
          const slug = generateSlug(name);
          
          // Result should be ASCII-safe (only a-z, 0-9, -)
          const asciiPattern = /^[a-z0-9-]*$/;
          expect(slug).toMatch(asciiPattern);
        }
      ),
      propertyConfig
    );
  });
});
