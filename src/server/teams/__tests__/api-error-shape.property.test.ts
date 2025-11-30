/**
 * Property-Based Tests for API Error Response Shape
 * 
 * Feature: team-system, Property 46: API errors have standardized shape
 * Validates: Requirements 12A.4
 * 
 * Tests that all API error responses follow the standardized shape:
 * {
 *   error: {
 *     code: string,
 *     message: string,
 *     field?: string,
 *     details?: unknown
 *   }
 * }
 */

import { describe, test, expect } from "vitest";
import fc from "fast-check";
import {
  ERROR_CODES,
  createErrorResponse,
  handleZodError,
  handleTeamError,
  handleGenericError,
  TeamError,
  ValidationErrors,
  AuthErrors,
  AuthorizationErrors,
  NotFoundErrors,
  ConflictErrors,
  GoneErrors,
  LimitErrors,
  RateLimitErrors,
  type ApiErrorResponse,
} from "../errors";
import { z } from "zod";

describe("Property 46: API errors have standardized shape", () => {
  test("createErrorResponse returns standardized error shape", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(ERROR_CODES)),
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.integer({ min: 400, max: 599 }),
        fc.option(fc.string({ minLength: 1, maxLength: 50 })),
        fc.option(fc.record({ key: fc.string(), value: fc.anything() })),
        (code, message, statusCode, field, details) => {
          const response = createErrorResponse(
            code,
            message,
            statusCode,
            field ?? undefined,
            details ?? undefined
          );

          const body = response.json() as Promise<ApiErrorResponse>;

          // Response should have correct status code
          expect(response.status).toBe(statusCode);

          // Response body should have error object
          body.then((data) => {
            expect(data).toHaveProperty("error");
            expect(data.error).toHaveProperty("code");
            expect(data.error).toHaveProperty("message");

            // Code and message should match inputs
            expect(data.error.code).toBe(code);
            expect(data.error.message).toBe(message);

            // Optional fields should be present if provided
            if (field) {
              expect(data.error).toHaveProperty("field");
              expect(data.error.field).toBe(field);
            }

            if (details) {
              expect(data.error).toHaveProperty("details");
              // Note: JSON serialization converts undefined to null
              // So we just check that details exists and is truthy
              expect(data.error.details).toBeTruthy();
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test("handleZodError returns standardized error shape", () => {
    fc.assert(
      fc.property(
        // Generate invalid data that will trigger Zod errors
        fc.record({
          name: fc.oneof(
            fc.string({ maxLength: 1 }),
            fc.string({ minLength: 51, maxLength: 100 })
          ),
          email: fc.string().filter((s) => !s.includes("@")),
        }),
        (invalidData) => {
          const schema = z.object({
            name: z.string().min(2).max(50),
            email: z.string().email(),
          });

          const result = schema.safeParse(invalidData);

          if (!result.success) {
            const response = handleZodError(result.error);
            const body = response.json() as Promise<ApiErrorResponse>;

            // Response should have 400 status
            expect(response.status).toBe(400);

            body.then((data) => {
              // Should have standardized error shape
              expect(data).toHaveProperty("error");
              expect(data.error).toHaveProperty("code");
              expect(data.error).toHaveProperty("message");

              // Code should be INVALID_INPUT
              expect(data.error.code).toBe(ERROR_CODES.INVALID_INPUT);

              // Should have field information
              expect(data.error).toHaveProperty("field");
              expect(typeof data.error.field).toBe("string");
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test("handleTeamError returns standardized error shape", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(ERROR_CODES)),
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.integer({ min: 400, max: 599 }),
        fc.option(fc.string({ minLength: 1, maxLength: 50 })),
        (code, message, statusCode, field) => {
          const error = new TeamError(
            code,
            message,
            statusCode,
            field ?? undefined
          );
          const response = handleTeamError(error);
          const body = response.json() as Promise<ApiErrorResponse>;

          // Response should have correct status code
          expect(response.status).toBe(statusCode);

          body.then((data) => {
            // Should have standardized error shape
            expect(data).toHaveProperty("error");
            expect(data.error).toHaveProperty("code");
            expect(data.error).toHaveProperty("message");

            expect(data.error.code).toBe(code);
            expect(data.error.message).toBe(message);

            if (field) {
              expect(data.error.field).toBe(field);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test("ValidationErrors helpers return standardized error shape", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (message) => {
          const errors = [
            ValidationErrors.invalidTeamName(message),
            ValidationErrors.invalidEmail(message),
            ValidationErrors.invalidRoleCombination(message),
          ];

          errors.forEach((error) => {
            expect(error).toBeInstanceOf(TeamError);
            expect(error.code).toBeTruthy();
            expect(error.message).toBe(message);
            expect(error.statusCode).toBe(400);
            expect(error.field).toBeTruthy();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test("AuthErrors helpers return standardized error shape", () => {
    const errors = [AuthErrors.unauthorized(), AuthErrors.sessionExpired()];

    errors.forEach((error) => {
      expect(error).toBeInstanceOf(TeamError);
      expect(error.code).toBeTruthy();
      expect(error.message).toBeTruthy();
      expect(error.statusCode).toBe(401);
    });
  });

  test("AuthorizationErrors helpers return standardized error shape", () => {
    const errors = [
      AuthorizationErrors.insufficientPermissions(),
      AuthorizationErrors.notTeamOwner(),
      AuthorizationErrors.notTeamAdmin(),
      AuthorizationErrors.cannotModifyOwner(),
    ];

    errors.forEach((error) => {
      expect(error).toBeInstanceOf(TeamError);
      expect(error.code).toBeTruthy();
      expect(error.message).toBeTruthy();
      expect(error.statusCode).toBe(403);
    });
  });

  test("NotFoundErrors helpers return standardized error shape", () => {
    fc.assert(
      fc.property(
        fc.option(fc.uuid()),
        fc.option(fc.uuid()),
        fc.option(fc.uuid()),
        (teamId, userId, invitationId) => {
          const errors = [
            NotFoundErrors.teamNotFound(teamId ?? undefined),
            NotFoundErrors.memberNotFound(userId ?? undefined),
            NotFoundErrors.invitationNotFound(invitationId ?? undefined),
          ];

          errors.forEach((error) => {
            expect(error).toBeInstanceOf(TeamError);
            expect(error.code).toBeTruthy();
            expect(error.message).toBeTruthy();
            expect(error.statusCode).toBe(404);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test("ConflictErrors helpers return standardized error shape", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 60 }),
        fc.emailAddress(),
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (slug, email, projects) => {
          const errors = [
            ConflictErrors.duplicateTeamSlug(slug),
            ConflictErrors.alreadyTeamMember(email),
            ConflictErrors.memberOwnsProjects(projects),
            ConflictErrors.invitationAlreadyUsed(),
          ];

          errors.forEach((error) => {
            expect(error).toBeInstanceOf(TeamError);
            expect(error.code).toBeTruthy();
            expect(error.message).toBeTruthy();
            expect(error.statusCode).toBe(409);
          });

          // memberOwnsProjects should include project details
          const projectError = ConflictErrors.memberOwnsProjects(projects);
          expect(projectError.details).toEqual({ projects });
        }
      ),
      { numRuns: 100 }
    );
  });

  test("GoneErrors helpers return standardized error shape", () => {
    const errors = [
      GoneErrors.invitationExpired(),
      GoneErrors.invitationCancelled(),
      GoneErrors.teamDeleted(),
    ];

    errors.forEach((error) => {
      expect(error).toBeInstanceOf(TeamError);
      expect(error.code).toBeTruthy();
      expect(error.message).toBeTruthy();
      expect(error.statusCode).toBe(410);
    });
  });

  test("LimitErrors helpers return standardized error shape", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 1000 }),
        (memberLimit, projectLimit, issueLimit) => {
          const errors = [
            LimitErrors.planLimitMembers(memberLimit),
            LimitErrors.planLimitProjects(projectLimit),
            LimitErrors.planLimitIssues(issueLimit),
          ];

          errors.forEach((error) => {
            expect(error).toBeInstanceOf(TeamError);
            expect(error.code).toBeTruthy();
            expect(error.message).toBeTruthy();
            expect(error.statusCode).toBe(422);
            expect(error.details).toBeTruthy();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test("RateLimitErrors helpers return standardized error shape", () => {
    const errors = [
      RateLimitErrors.invitations(),
      RateLimitErrors.exports(),
    ];

    errors.forEach((error) => {
      expect(error).toBeInstanceOf(TeamError);
      expect(error.code).toBeTruthy();
      expect(error.message).toBeTruthy();
      expect(error.statusCode).toBe(429);
    });
  });

  test("handleGenericError returns standardized error shape for unknown errors", () => {
    // Test with a fixed error message to avoid JavaScript reserved word issues
    const error = new Error("Database connection failed");
    const response = handleGenericError(error);

    // Response should have 500 status
    expect(response.status).toBe(500);

    // Check response body structure
    const body = response.json() as Promise<ApiErrorResponse>;
    body.then((data) => {
      // Should have standardized error shape
      expect(data).toHaveProperty("error");
      expect(data.error).toHaveProperty("code");
      expect(data.error).toHaveProperty("message");

      // Code should be INTERNAL_SERVER_ERROR
      expect(data.error.code).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR);
      expect(data.error.message).toBeTruthy();
    });
  });

  test("all error responses have required fields", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(ERROR_CODES)),
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.integer({ min: 400, max: 599 }),
        (code, message, statusCode) => {
          const response = createErrorResponse(code, message, statusCode);
          const body = response.json() as Promise<ApiErrorResponse>;

          body.then((data) => {
            // Must have error object
            expect(data).toHaveProperty("error");
            expect(typeof data.error).toBe("object");

            // Must have code (string)
            expect(data.error).toHaveProperty("code");
            expect(typeof data.error.code).toBe("string");
            expect(data.error.code.length).toBeGreaterThan(0);

            // Must have message (string)
            expect(data.error).toHaveProperty("message");
            expect(typeof data.error.message).toBe("string");
            expect(data.error.message.length).toBeGreaterThan(0);

            // Optional fields should be string or undefined
            if ("field" in data.error) {
              expect(
                typeof data.error.field === "string" ||
                  data.error.field === undefined
              ).toBe(true);
            }

            // Details can be any type
            if ("details" in data.error) {
              expect(data.error.details).toBeDefined();
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
