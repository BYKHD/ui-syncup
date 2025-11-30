/**
 * Property-Based Tests for Zod Validation Errors
 * 
 * Feature: team-system, Property 49: Zod validation returns field-specific errors
 * Validates: Requirements 13.5
 * 
 * Tests that Zod validation returns field-specific error messages
 * for all team operation schemas.
 */

import { describe, test, expect } from "vitest";
import fc from "fast-check";
import {
  createTeamSchema,
  updateTeamSchema,
  createInvitationSchema,
  updateMemberRolesSchema,
  roleAssignmentSchema,
} from "../validation";
import { formatZodError } from "../errors";

describe("Property 49: Zod validation returns field-specific errors", () => {
  test("createTeamSchema returns field-specific errors for invalid name", () => {
    fc.assert(
      fc.property(
        // Generate invalid team names (too short, too long, or insufficient alphanumeric)
        fc.oneof(
          fc.string({ maxLength: 1 }), // Too short
          fc.string({ minLength: 51, maxLength: 100 }), // Too long
          fc.constant("!!!") // Insufficient alphanumeric
        ),
        fc.string().map((s) => s.slice(0, 500)), // Valid description
        fc.uuid(), // Valid creator ID
        (invalidName, description, creatorId) => {
          const result = createTeamSchema.safeParse({
            name: invalidName,
            description,
            creatorId,
          });

          expect(result.success).toBe(false);

          if (!result.success) {
            const fieldErrors = formatZodError(result.error);
            expect(fieldErrors.length).toBeGreaterThan(0);

            // Should have an error for the 'name' field
            const nameError = fieldErrors.find((err) => err.field === "name");
            expect(nameError).toBeDefined();
            expect(nameError?.message).toBeTruthy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test("createTeamSchema returns field-specific errors for invalid description", () => {
    fc.assert(
      fc.property(
        // Valid name
        fc
          .string({ minLength: 2, maxLength: 50 })
          .filter((name) => {
            const alphanumericCount = (name.match(/[a-zA-Z0-9]/g) || []).length;
            return alphanumericCount >= 2;
          }),
        // Invalid description (too long)
        fc.string({ minLength: 501, maxLength: 1000 }),
        fc.uuid(), // Valid creator ID
        (name, invalidDescription, creatorId) => {
          const result = createTeamSchema.safeParse({
            name,
            description: invalidDescription,
            creatorId,
          });

          expect(result.success).toBe(false);

          if (!result.success) {
            const fieldErrors = formatZodError(result.error);
            expect(fieldErrors.length).toBeGreaterThan(0);

            // Should have an error for the 'description' field
            const descError = fieldErrors.find(
              (err) => err.field === "description"
            );
            expect(descError).toBeDefined();
            expect(descError?.message).toContain("at most 500 characters");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test("createTeamSchema returns field-specific errors for invalid creatorId", () => {
    fc.assert(
      fc.property(
        // Valid name
        fc
          .string({ minLength: 2, maxLength: 50 })
          .filter((name) => {
            const alphanumericCount = (name.match(/[a-zA-Z0-9]/g) || []).length;
            return alphanumericCount >= 2;
          }),
        // Valid description
        fc.string().map((s) => s.slice(0, 500)),
        // Invalid creator ID (not a UUID)
        fc.string().filter((s) => !s.match(/^[0-9a-f-]{36}$/i)),
        (name, description, invalidCreatorId) => {
          const result = createTeamSchema.safeParse({
            name,
            description,
            creatorId: invalidCreatorId,
          });

          expect(result.success).toBe(false);

          if (!result.success) {
            const fieldErrors = formatZodError(result.error);
            expect(fieldErrors.length).toBeGreaterThan(0);

            // Should have an error for the 'creatorId' field
            const creatorIdError = fieldErrors.find(
              (err) => err.field === "creatorId"
            );
            expect(creatorIdError).toBeDefined();
            expect(creatorIdError?.message).toBeTruthy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test("createInvitationSchema returns field-specific errors for invalid email", () => {
    fc.assert(
      fc.property(
        // Invalid email (not an email format)
        fc
          .string()
          .filter((s) => !s.includes("@") || s.length > 320 || s.length < 3),
        fc.constantFrom("TEAM_EDITOR", "TEAM_MEMBER", "TEAM_VIEWER"),
        (invalidEmail, operationalRole) => {
          const result = createInvitationSchema.safeParse({
            email: invalidEmail,
            operationalRole,
          });

          expect(result.success).toBe(false);

          if (!result.success) {
            const fieldErrors = formatZodError(result.error);
            expect(fieldErrors.length).toBeGreaterThan(0);

            // Should have an error for the 'email' field
            const emailError = fieldErrors.find((err) => err.field === "email");
            expect(emailError).toBeDefined();
            expect(emailError?.message).toBeTruthy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test("roleAssignmentSchema returns field-specific errors when management role lacks operational role", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("TEAM_OWNER", "TEAM_ADMIN"),
        (managementRole) => {
          // Pass an object without operationalRole to trigger validation error
          const result = roleAssignmentSchema.safeParse({
            managementRole,
          });

          expect(result.success).toBe(false);

          if (!result.success) {
            const fieldErrors = formatZodError(result.error);
            expect(fieldErrors.length).toBeGreaterThan(0);

            // Should have an error for the 'operationalRole' field
            const roleError = fieldErrors.find(
              (err) => err.field === "operationalRole"
            );
            expect(roleError).toBeDefined();
            expect(roleError?.message).toBeTruthy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test("updateMemberRolesSchema returns field-specific errors when management role lacks operational role", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("TEAM_OWNER", "TEAM_ADMIN"),
        (managementRole) => {
          const result = updateMemberRolesSchema.safeParse({
            managementRole,
            operationalRole: undefined,
          });

          expect(result.success).toBe(false);

          if (!result.success) {
            const fieldErrors = formatZodError(result.error);
            expect(fieldErrors.length).toBeGreaterThan(0);

            // Should have an error for the 'operationalRole' field
            const roleError = fieldErrors.find(
              (err) => err.field === "operationalRole"
            );
            expect(roleError).toBeDefined();
            expect(roleError?.message).toContain("require");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test("multiple validation errors return all field-specific errors", () => {
    fc.assert(
      fc.property(
        // Invalid name (too short)
        fc.string({ maxLength: 1 }),
        // Invalid description (too long)
        fc.string({ minLength: 501, maxLength: 1000 }),
        // Invalid creator ID
        fc.string().filter((s) => !s.match(/^[0-9a-f-]{36}$/i)),
        (invalidName, invalidDescription, invalidCreatorId) => {
          const result = createTeamSchema.safeParse({
            name: invalidName,
            description: invalidDescription,
            creatorId: invalidCreatorId,
          });

          expect(result.success).toBe(false);

          if (!result.success) {
            const fieldErrors = formatZodError(result.error);

            // Should have multiple errors
            expect(fieldErrors.length).toBeGreaterThanOrEqual(2);

            // Each error should have a field and message
            fieldErrors.forEach((error) => {
              expect(error.field).toBeTruthy();
              expect(error.message).toBeTruthy();
            });

            // Should have distinct field names
            const fields = fieldErrors.map((err) => err.field);
            const uniqueFields = new Set(fields);
            expect(uniqueFields.size).toBeGreaterThan(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test("formatZodError returns consistent structure", () => {
    fc.assert(
      fc.property(
        // Generate various invalid inputs
        fc.record({
          name: fc.oneof(
            fc.string({ maxLength: 1 }),
            fc.string({ minLength: 51, maxLength: 100 }),
            fc.constant("!!!")
          ),
          description: fc.oneof(
            fc.string().map((s) => s.slice(0, 500)),
            fc.string({ minLength: 501, maxLength: 1000 })
          ),
          creatorId: fc.oneof(
            fc.uuid(),
            fc.string().filter((s) => !s.match(/^[0-9a-f-]{36}$/i))
          ),
        }),
        (input) => {
          const result = createTeamSchema.safeParse(input);

          if (!result.success) {
            const fieldErrors = formatZodError(result.error);

            // Each error should have the correct structure
            fieldErrors.forEach((error) => {
              expect(error).toHaveProperty("field");
              expect(error).toHaveProperty("message");
              expect(typeof error.field).toBe("string");
              expect(typeof error.message).toBe("string");
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
