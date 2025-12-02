/**
 * Property-Based Tests for Serialization Round-Trip
 * 
 * Tests that project data can be serialized and deserialized without data loss.
 * 
 * **Feature: project-system, Property 19: Serialization Round-Trip**
 * **Validates: Requirements 10.1, 10.2**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  ProjectApiSchema,
  ProjectDbSchema,
  CreateProjectBodySchema,
  UpdateProjectBodySchema,
  projectDbToApi,
} from "../schemas";
import { PROJECT_ROLES } from "@/config/roles";

// Test configuration: run 100 iterations minimum
const propertyConfig = { numRuns: 100 };

// ============================================================================
// GENERATORS
// ============================================================================

const uuidArb = fc.uuid();
const projectNameArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0)
  .map(s => s.trim());
const projectKeyArb = fc
  .array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')), {
    minLength: 2,
    maxLength: 10,
  })
  .map((chars) => chars.join(''));
const slugArb = fc
  .string({ minLength: 1, maxLength: 120 })
  .filter(s => s.trim().length > 0)
  .map(s => s.trim());
const descriptionArb = fc.option(fc.string({ maxLength: 500 }));
const iconArb = fc.option(fc.string({ maxLength: 255 }));
const visibilityArb = fc.constantFrom("public", "private");
const statusArb = fc.constantFrom("active", "archived");
const dateArb = fc
  .integer({ min: 0, max: 4102444800000 })
  .map((timestamp) => new Date(timestamp));

// Database project with Date objects
const projectDbArb = fc.record({
  id: uuidArb,
  teamId: uuidArb,
  name: projectNameArb,
  key: projectKeyArb,
  slug: slugArb,
  description: descriptionArb,
  icon: iconArb,
  visibility: visibilityArb,
  status: statusArb,
  createdAt: dateArb,
  updatedAt: dateArb,
  deletedAt: fc.option(dateArb, { nil: null }),
});

// Create project body
const createProjectBodyArb = fc.record({
  teamId: uuidArb,
  name: projectNameArb,
  key: projectKeyArb,
  description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  icon: fc.option(fc.string({ maxLength: 255 }), { nil: undefined }),
  visibility: fc.option(visibilityArb, { nil: undefined }),
});

// Update project body
const updateProjectBodyArb = fc
  .oneof(
    fc.record({ name: projectNameArb }),
    fc.record({ description: fc.oneof(fc.constant(null), fc.string({ maxLength: 500 })) }),
    fc.record({ icon: fc.oneof(fc.constant(null), fc.string({ maxLength: 255 })) }),
    fc.record({ visibility: visibilityArb }),
    fc.record({ status: statusArb }),
  );

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe("Project Serialization - Property Tests", () => {
  /**
   * **Feature: project-system, Property 19: Serialization Round-Trip**
   * **Validates: Requirements 10.1, 10.2**
   * 
   * For any valid Project object, serializing to JSON and parsing back
   * through the Zod schema SHALL produce an equivalent object.
   */

  describe("Property 19: Serialization Round-Trip", () => {
    it("round-trips database projects through API serialization", () => {
      fc.assert(
        fc.property(projectDbArb, (dbProject) => {
          // Convert DB format (Date objects) to API format (ISO strings)
          const apiProject = projectDbToApi(dbProject);
          
          // Serialize to JSON
          const json = JSON.stringify(apiProject);
          
          // Parse back from JSON
          const parsed = JSON.parse(json);
          
          // Validate with schema
          const result = ProjectApiSchema.safeParse(parsed);
          
          expect(result.success).toBe(true);
          if (result.success) {
            // Verify all fields match
            expect(result.data.id).toBe(apiProject.id);
            expect(result.data.teamId).toBe(apiProject.teamId);
            expect(result.data.name).toBe(apiProject.name);
            expect(result.data.key).toBe(apiProject.key);
            expect(result.data.slug).toBe(apiProject.slug);
            expect(result.data.description).toBe(apiProject.description);
            expect(result.data.icon).toBe(apiProject.icon);
            expect(result.data.visibility).toBe(apiProject.visibility);
            expect(result.data.status).toBe(apiProject.status);
            expect(result.data.createdAt).toBe(apiProject.createdAt);
            expect(result.data.updatedAt).toBe(apiProject.updatedAt);
          }
        }),
        propertyConfig
      );
    });

    it("round-trips create project requests through schema validation", () => {
      fc.assert(
        fc.property(createProjectBodyArb, (body) => {
          // Validate with schema
          const parseResult = CreateProjectBodySchema.safeParse(body);
          expect(parseResult.success).toBe(true);
          
          if (parseResult.success) {
            // Serialize to JSON
            const json = JSON.stringify(parseResult.data);
            
            // Parse back from JSON
            const parsed = JSON.parse(json);
            
            // Re-validate
            const revalidateResult = CreateProjectBodySchema.safeParse(parsed);
            expect(revalidateResult.success).toBe(true);
            
            if (revalidateResult.success) {
              // Verify all fields match (accounting for defaults)
              expect(revalidateResult.data.teamId).toBe(parseResult.data.teamId);
              expect(revalidateResult.data.name).toBe(parseResult.data.name);
              expect(revalidateResult.data.key).toBe(parseResult.data.key);
              expect(revalidateResult.data.description).toBe(parseResult.data.description);
              expect(revalidateResult.data.icon).toBe(parseResult.data.icon);
              expect(revalidateResult.data.visibility).toBe(parseResult.data.visibility);
            }
          }
        }),
        propertyConfig
      );
    });

    it("round-trips update project requests through schema validation", () => {
      fc.assert(
        fc.property(updateProjectBodyArb, (body) => {
          // Validate with schema
          const parseResult = UpdateProjectBodySchema.safeParse(body);
          expect(parseResult.success).toBe(true);
          
          if (parseResult.success) {
            // Serialize to JSON
            const json = JSON.stringify(parseResult.data);
            
            // Parse back from JSON
            const parsed = JSON.parse(json);
            
            // Re-validate
            const revalidateResult = UpdateProjectBodySchema.safeParse(parsed);
            expect(revalidateResult.success).toBe(true);
            
            if (revalidateResult.success) {
              // Verify all fields match
              expect(revalidateResult.data).toEqual(parseResult.data);
            }
          }
        }),
        propertyConfig
      );
    });

    it("preserves null vs undefined distinction in optional fields", () => {
      fc.assert(
        fc.property(
          fc.record({
            description: fc.oneof(
              fc.constant(undefined),
              fc.constant(null),
              fc.string({ maxLength: 500 })
            ),
            icon: fc.oneof(
              fc.constant(undefined),
              fc.constant(null),
              fc.string({ maxLength: 255 })
            ),
          }),
          (body) => {
            // Serialize to JSON
            const json = JSON.stringify(body);
            
            // Parse back from JSON
            const parsed = JSON.parse(json);
            
            // JSON.stringify removes undefined fields, so we need to account for that
            // undefined becomes missing, null stays null
            if (body.description === undefined) {
              expect(parsed.description).toBeUndefined();
            } else {
              expect(parsed.description).toBe(body.description);
            }
            
            if (body.icon === undefined) {
              expect(parsed.icon).toBeUndefined();
            } else {
              expect(parsed.icon).toBe(body.icon);
            }
          }
        ),
        propertyConfig
      );
    });

    it("preserves enum values through serialization", () => {
      fc.assert(
        fc.property(
          visibilityArb,
          statusArb,
          (visibility, status) => {
            const obj = { visibility, status };
            
            // Serialize to JSON
            const json = JSON.stringify(obj);
            
            // Parse back from JSON
            const parsed = JSON.parse(json);
            
            // Verify values are preserved
            expect(parsed.visibility).toBe(visibility);
            expect(parsed.status).toBe(status);
          }
        ),
        propertyConfig
      );
    });

    it("preserves date ISO strings through serialization", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 4102444800000 }).map((timestamp) => new Date(timestamp).toISOString()),
          (isoDate) => {
            const obj = { createdAt: isoDate };
            
            // Serialize to JSON
            const json = JSON.stringify(obj);
            
            // Parse back from JSON
            const parsed = JSON.parse(json);
            
            // Verify ISO string is preserved
            expect(parsed.createdAt).toBe(isoDate);
            
            // Verify it's still a valid date
            const date = new Date(parsed.createdAt);
            expect(date.toISOString()).toBe(isoDate);
          }
        ),
        propertyConfig
      );
    });

    it("handles special characters in strings through serialization", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          (name) => {
            const obj = { name };
            
            // Serialize to JSON
            const json = JSON.stringify(obj);
            
            // Parse back from JSON
            const parsed = JSON.parse(json);
            
            // Verify string is preserved exactly
            expect(parsed.name).toBe(name);
          }
        ),
        propertyConfig
      );
    });
  });
});
