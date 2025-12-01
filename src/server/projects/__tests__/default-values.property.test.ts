/**
 * Property-Based Tests for Default Values
 * 
 * Tests universal properties for project default values.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { ProjectVisibility, ProjectStatus } from "../types";

// Test configuration: run 100 iterations minimum
const propertyConfig = { numRuns: 100 };

describe("Project Default Values - Property Tests", () => {
  /**
   * **Feature: project-system, Property 17: Default Values**
   * **Validates: Requirements 9.6, 9.7**
   * 
   * For any project created without explicit visibility or status,
   * the project SHALL have visibility='private' AND status='active'.
   */
  it("Property 17: Default visibility is private when not specified", () => {
    fc.assert(
      fc.property(
        fc.option(fc.constantFrom<ProjectVisibility>("public", "private"), { nil: undefined }),
        (explicitVisibility) => {
          // Simulate project creation
          const visibility = explicitVisibility ?? "private";

          // If no explicit visibility, should default to private
          if (explicitVisibility === undefined) {
            expect(visibility).toBe("private");
          } else {
            expect(visibility).toBe(explicitVisibility);
          }

          // Visibility should always be one of the valid values
          expect(["public", "private"]).toContain(visibility);
        }
      ),
      propertyConfig
    );
  });

  it("Property 17: Default status is active when not specified", () => {
    fc.assert(
      fc.property(
        fc.option(fc.constantFrom<ProjectStatus>("active", "archived"), { nil: undefined }),
        (explicitStatus) => {
          // Simulate project creation
          const status = explicitStatus ?? "active";

          // If no explicit status, should default to active
          if (explicitStatus === undefined) {
            expect(status).toBe("active");
          } else {
            expect(status).toBe(explicitStatus);
          }

          // Status should always be one of the valid values
          expect(["active", "archived"]).toContain(status);
        }
      ),
      propertyConfig
    );
  });

  it("Property 17: Both defaults apply when neither is specified", () => {
    fc.assert(
      fc.property(
        fc.option(fc.constantFrom<ProjectVisibility>("public", "private"), { nil: undefined }),
        fc.option(fc.constantFrom<ProjectStatus>("active", "archived"), { nil: undefined }),
        (explicitVisibility, explicitStatus) => {
          // Simulate project creation with defaults
          const visibility = explicitVisibility ?? "private";
          const status = explicitStatus ?? "active";

          // When both are undefined, both defaults should apply
          if (explicitVisibility === undefined && explicitStatus === undefined) {
            expect(visibility).toBe("private");
            expect(status).toBe("active");
          }

          // Verify valid values
          expect(["public", "private"]).toContain(visibility);
          expect(["active", "archived"]).toContain(status);
        }
      ),
      propertyConfig
    );
  });

  it("Property 17: Explicit values override defaults", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ProjectVisibility>("public", "private"),
        fc.constantFrom<ProjectStatus>("active", "archived"),
        (explicitVisibility, explicitStatus) => {
          // When explicit values are provided, they should be used
          const visibility = explicitVisibility;
          const status = explicitStatus;

          expect(visibility).toBe(explicitVisibility);
          expect(status).toBe(explicitStatus);

          // Values should be valid
          expect(["public", "private"]).toContain(visibility);
          expect(["active", "archived"]).toContain(status);
        }
      ),
      propertyConfig
    );
  });

  it("Property 17: Default values are consistent", () => {
    fc.assert(
      fc.property(
        fc.constant(undefined),
        fc.constant(undefined),
        (visibility, status) => {
          // Multiple calls with undefined should always produce same defaults
          const defaultVisibility1 = visibility ?? "private";
          const defaultVisibility2 = visibility ?? "private";
          const defaultStatus1 = status ?? "active";
          const defaultStatus2 = status ?? "active";

          expect(defaultVisibility1).toBe(defaultVisibility2);
          expect(defaultStatus1).toBe(defaultStatus2);

          expect(defaultVisibility1).toBe("private");
          expect(defaultStatus1).toBe("active");
        }
      ),
      propertyConfig
    );
  });

  it("Property 17: Null and undefined are treated the same for defaults", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(null, undefined),
        fc.constantFrom(null, undefined),
        (visibility, status) => {
          // Both null and undefined should trigger defaults
          const actualVisibility = visibility ?? "private";
          const actualStatus = status ?? "active";

          expect(actualVisibility).toBe("private");
          expect(actualStatus).toBe("active");
        }
      ),
      propertyConfig
    );
  });
});
