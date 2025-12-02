/**
 * Property-Based Tests for Project Schemas
 * 
 * Tests that Zod schemas correctly validate API requests and responses.
 * 
 * **Feature: project-system, Property 18: Schema Validation**
 * **Validates: Requirements 9.8, 9.9**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  ProjectApiSchema,
  ProjectStatsSchema,
  ProjectWithStatsApiSchema,
  ProjectMemberApiSchema,
  CreateProjectBodySchema,
  UpdateProjectBodySchema,
  UpdateMemberRoleBodySchema,
  ListProjectsQuerySchema,
  ListProjectsResponseSchema,
  GetProjectResponseSchema,
  CreateProjectResponseSchema,
  UpdateProjectResponseSchema,
  DeleteProjectResponseSchema,
  ListProjectMembersResponseSchema,
  JoinProjectResponseSchema,
  LeaveProjectResponseSchema,
  UpdateMemberRoleResponseSchema,
  RemoveMemberResponseSchema,
  ProjectStatusSchema,
  ProjectVisibilitySchema,
  ProjectRoleSchema,
} from "../schemas";
import { PROJECT_ROLES } from "@/config/roles";

// Test configuration: run 100 iterations minimum
const propertyConfig = { numRuns: 100 };

// ============================================================================
// GENERATORS
// ============================================================================

const uuidArb = fc.uuid();
// Generate non-empty, non-whitespace strings for names (alphanumeric with spaces)
const projectNameArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0)
  .map(s => s.trim()); // Ensure no leading/trailing whitespace
const projectKeyArb = fc
  .array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')), {
    minLength: 2,
    maxLength: 10,
  })
  .map((chars) => chars.join(''));
// Generate non-empty, non-whitespace strings for slugs
const slugArb = fc
  .string({ minLength: 1, maxLength: 120 })
  .filter(s => s.trim().length > 0)
  .map(s => s.trim());
const descriptionArb = fc.option(fc.string({ maxLength: 500 }));
const iconArb = fc.option(fc.string({ maxLength: 255 }));
const visibilityArb = fc.constantFrom("public", "private");
const statusArb = fc.constantFrom("active", "archived");
const roleArb = fc.constantFrom(
  PROJECT_ROLES.PROJECT_OWNER,
  PROJECT_ROLES.PROJECT_EDITOR,
  PROJECT_ROLES.PROJECT_DEVELOPER,
  PROJECT_ROLES.PROJECT_VIEWER
);
// Generate dates within valid range using timestamps
const isoDateArb = fc
  .integer({ min: 0, max: 4102444800000 }) // 1970-01-01 to 2100-01-01 in ms
  .map((timestamp) => new Date(timestamp).toISOString());
// Generate valid email addresses (simple pattern)
const emailArb = fc
  .tuple(
    fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 1, maxLength: 10 }).map(chars => chars.join('')),
    fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 1, maxLength: 10 }).map(chars => chars.join('')),
    fc.constantFrom('com', 'org', 'net', 'io')
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);
// Generate non-empty usernames
const userNameArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0)
  .map(s => s.trim());
const urlArb = fc.option(fc.webUrl());

const projectApiArb = fc.record({
  id: uuidArb,
  teamId: uuidArb,
  name: projectNameArb,
  key: projectKeyArb,
  slug: slugArb,
  description: descriptionArb,
  icon: iconArb,
  visibility: visibilityArb,
  status: statusArb,
  createdAt: isoDateArb,
  updatedAt: isoDateArb,
});

const projectStatsArb = fc.record({
  totalTickets: fc.nat(),
  completedTickets: fc.nat(),
  progressPercent: fc.nat({ max: 100 }),
  memberCount: fc.nat(),
});

const projectWithStatsArb = fc.record({
  id: uuidArb,
  teamId: uuidArb,
  name: projectNameArb,
  key: projectKeyArb,
  slug: slugArb,
  description: descriptionArb,
  icon: iconArb,
  visibility: visibilityArb,
  status: statusArb,
  createdAt: isoDateArb,
  updatedAt: isoDateArb,
  stats: projectStatsArb,
  userRole: fc.option(roleArb),
  canJoin: fc.boolean(),
});

const projectMemberArb = fc.record({
  userId: uuidArb,
  userName: userNameArb,
  userEmail: emailArb,
  userAvatar: urlArb,
  role: roleArb,
  joinedAt: isoDateArb,
});

// Create project body - optional fields should be undefined, not null
const createProjectBodyArb = fc.record({
  teamId: uuidArb,
  name: projectNameArb,
  key: projectKeyArb,
  description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  icon: fc.option(fc.string({ maxLength: 255 }), { nil: undefined }),
  visibility: fc.option(visibilityArb, { nil: undefined }),
});

// Generate update bodies with at least one field defined
// Optional fields can be undefined, nullable fields can be null
const updateProjectBodyArb = fc
  .oneof(
    // Single field updates
    fc.record({ name: projectNameArb }),
    fc.record({ description: fc.oneof(fc.constant(null), fc.string({ maxLength: 500 })) }),
    fc.record({ icon: fc.oneof(fc.constant(null), fc.string({ maxLength: 255 })) }),
    fc.record({ visibility: visibilityArb }),
    fc.record({ status: statusArb }),
    // Multi-field updates
    fc.record({
      name: fc.option(projectNameArb, { nil: undefined }),
      visibility: fc.option(visibilityArb, { nil: undefined }),
    }).filter(body => body.name !== undefined || body.visibility !== undefined),
    fc.record({
      description: fc.option(fc.oneof(fc.constant(null), fc.string({ maxLength: 500 })), { nil: undefined }),
      status: fc.option(statusArb, { nil: undefined }),
    }).filter(body => body.description !== undefined || body.status !== undefined),
  );

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe("Project Schemas - Property Tests", () => {
  /**
   * **Feature: project-system, Property 18: Schema Validation**
   * **Validates: Requirements 9.8, 9.9**
   * 
   * For any API request or response, the data SHALL pass validation
   * against the corresponding Zod schema without errors.
   */

  describe("Property 18: Schema Validation", () => {
    it("validates ProjectApiSchema for any valid project", () => {
      fc.assert(
        fc.property(projectApiArb, (project) => {
          const result = ProjectApiSchema.safeParse(project);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data).toEqual(project);
          }
        }),
        propertyConfig
      );
    });

    it("validates ProjectStatsSchema for any valid stats", () => {
      fc.assert(
        fc.property(projectStatsArb, (stats) => {
          const result = ProjectStatsSchema.safeParse(stats);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data).toEqual(stats);
          }
        }),
        propertyConfig
      );
    });

    it("validates ProjectWithStatsApiSchema for any valid project with stats", () => {
      fc.assert(
        fc.property(projectWithStatsArb, (project) => {
          const result = ProjectWithStatsApiSchema.safeParse(project);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data).toEqual(project);
          }
        }),
        propertyConfig
      );
    });

    it("validates ProjectMemberApiSchema for any valid member", () => {
      fc.assert(
        fc.property(projectMemberArb, (member) => {
          const result = ProjectMemberApiSchema.safeParse(member);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data).toEqual(member);
          }
        }),
        propertyConfig
      );
    });

    it("validates CreateProjectBodySchema for any valid create request", () => {
      fc.assert(
        fc.property(createProjectBodyArb, (body) => {
          const result = CreateProjectBodySchema.safeParse(body);
          expect(result.success).toBe(true);
          if (result.success) {
            // Schema applies defaults
            expect(result.data.teamId).toBe(body.teamId);
            expect(result.data.name).toBe(body.name);
            expect(result.data.key).toBe(body.key);
            expect(result.data.visibility).toBeDefined();
          }
        }),
        propertyConfig
      );
    });

    it("validates UpdateProjectBodySchema for any valid update request", () => {
      fc.assert(
        fc.property(updateProjectBodyArb, (body) => {
          const result = UpdateProjectBodySchema.safeParse(body);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data).toEqual(body);
          }
        }),
        propertyConfig
      );
    });

    it("validates UpdateMemberRoleBodySchema for any valid role", () => {
      fc.assert(
        fc.property(roleArb, (role) => {
          const body = { role };
          const result = UpdateMemberRoleBodySchema.safeParse(body);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.role).toBe(role);
          }
        }),
        propertyConfig
      );
    });

    it("validates ListProjectsQuerySchema with valid parameters", () => {
      fc.assert(
        fc.property(
          uuidArb,
          fc.option(statusArb),
          fc.option(visibilityArb),
          fc.option(fc.string({ maxLength: 100 })),
          fc.nat({ max: 1000 }).map((n) => n + 1), // page >= 1
          fc.nat({ max: 99 }).map((n) => n + 1), // limit 1-100
          (teamId, status, visibility, search, page, limit) => {
            const query = {
              teamId,
              ...(status && { status }),
              ...(visibility && { visibility }),
              ...(search && { search }),
              page,
              limit,
            };
            const result = ListProjectsQuerySchema.safeParse(query);
            expect(result.success).toBe(true);
            if (result.success) {
              expect(result.data.teamId).toBe(teamId);
              expect(result.data.page).toBeGreaterThanOrEqual(1);
              expect(result.data.limit).toBeGreaterThanOrEqual(1);
              expect(result.data.limit).toBeLessThanOrEqual(100);
            }
          }
        ),
        propertyConfig
      );
    });

    it("rejects invalid project keys (non-uppercase)", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 2, maxLength: 10 }).filter((s) => s !== s.toUpperCase()),
          (invalidKey) => {
            const body = {
              teamId: fc.sample(uuidArb, 1)[0],
              name: "Test Project",
              key: invalidKey,
            };
            const result = CreateProjectBodySchema.safeParse(body);
            expect(result.success).toBe(false);
          }
        ),
        propertyConfig
      );
    });

    it("rejects invalid project names (empty or too long)", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(""),
            fc.string({ minLength: 101, maxLength: 200 })
          ),
          (invalidName) => {
            const body = {
              teamId: fc.sample(uuidArb, 1)[0],
              name: invalidName,
              key: "TEST",
            };
            const result = CreateProjectBodySchema.safeParse(body);
            expect(result.success).toBe(false);
          }
        ),
        propertyConfig
      );
    });

    it("rejects invalid progress percentages (outside 0-100)", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ max: -1 }),
            fc.integer({ min: 101 })
          ),
          (invalidPercent) => {
            const stats = {
              totalTickets: 10,
              completedTickets: 5,
              progressPercent: invalidPercent,
              memberCount: 3,
            };
            const result = ProjectStatsSchema.safeParse(stats);
            expect(result.success).toBe(false);
          }
        ),
        propertyConfig
      );
    });

    it("validates enum values for status", () => {
      fc.assert(
        fc.property(statusArb, (status) => {
          const result = ProjectStatusSchema.safeParse(status);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(["active", "archived"]).toContain(result.data);
          }
        }),
        propertyConfig
      );
    });

    it("validates enum values for visibility", () => {
      fc.assert(
        fc.property(visibilityArb, (visibility) => {
          const result = ProjectVisibilitySchema.safeParse(visibility);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(["public", "private"]).toContain(result.data);
          }
        }),
        propertyConfig
      );
    });

    it("validates enum values for role", () => {
      fc.assert(
        fc.property(roleArb, (role) => {
          const result = ProjectRoleSchema.safeParse(role);
          expect(result.success).toBe(true);
          if (result.success) {
            expect([
              PROJECT_ROLES.PROJECT_OWNER,
              PROJECT_ROLES.PROJECT_EDITOR,
              PROJECT_ROLES.PROJECT_DEVELOPER,
              PROJECT_ROLES.PROJECT_VIEWER,
            ]).toContain(result.data);
          }
        }),
        propertyConfig
      );
    });

    it("validates response schemas for list projects", () => {
      fc.assert(
        fc.property(
          fc.array(projectWithStatsArb, { maxLength: 20 }),
          fc.nat({ max: 1000 }).map((n) => n + 1),
          fc.nat({ max: 100 }).map((n) => n + 1),
          fc.nat({ max: 10000 }),
          (projects, page, limit, total) => {
            const response = {
              projects,
              pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
              },
            };
            const result = ListProjectsResponseSchema.safeParse(response);
            expect(result.success).toBe(true);
            if (result.success) {
              expect(result.data.projects).toHaveLength(projects.length);
              expect(result.data.pagination.totalPages).toBe(Math.ceil(total / limit));
            }
          }
        ),
        propertyConfig
      );
    });

    it("validates response schemas for delete/leave operations", () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.string({ minLength: 1 }),
          (success, message) => {
            const deleteResponse = { success, message };
            const deleteResult = DeleteProjectResponseSchema.safeParse(deleteResponse);
            expect(deleteResult.success).toBe(true);

            const leaveResponse = { success, message };
            const leaveResult = LeaveProjectResponseSchema.safeParse(leaveResponse);
            expect(leaveResult.success).toBe(true);

            const removeResponse = { success, message };
            const removeResult = RemoveMemberResponseSchema.safeParse(removeResponse);
            expect(removeResult.success).toBe(true);
          }
        ),
        propertyConfig
      );
    });

    it("validates response schemas for member operations", () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          projectMemberArb,
          (success, member) => {
            const joinResponse = { success, member };
            const joinResult = JoinProjectResponseSchema.safeParse(joinResponse);
            expect(joinResult.success).toBe(true);

            const updateResponse = { success, member };
            const updateResult = UpdateMemberRoleResponseSchema.safeParse(updateResponse);
            expect(updateResult.success).toBe(true);
          }
        ),
        propertyConfig
      );
    });

    it("validates response schema for list members", () => {
      fc.assert(
        fc.property(
          fc.array(projectMemberArb, { maxLength: 50 }),
          (members) => {
            const response = { members };
            const result = ListProjectMembersResponseSchema.safeParse(response);
            expect(result.success).toBe(true);
            if (result.success) {
              expect(result.data.members).toHaveLength(members.length);
            }
          }
        ),
        propertyConfig
      );
    });
  });
});
