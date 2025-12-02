/**
 * Property-Based Tests for Projects API Routes
 * 
 * Tests universal properties that should hold across all inputs.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import * as fc from "fast-check";
import { db } from "@/lib/db";
import { projects, projectMembers } from "@/server/db/schema";
import { users, sessions, teams } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { listProjects } from "@/server/projects/project-service";
import type {
  ProjectStatus,
  ProjectVisibility,
} from "@/server/projects/types";
import { afterEach } from "node:test";

// Test user and team IDs
let testUserId: string;
let testTeamId: string;
let testSessionToken: string;

// Cleanup function to remove test data
async function cleanupTestData() {
  if (testUserId && testTeamId) {
    await db.delete(sessions).where(eq(sessions.userId, testUserId));
    await db.delete(projectMembers).where(eq(projectMembers.userId, testUserId));
    await db
      .delete(projects)
      .where(eq(projects.teamId, testTeamId));
    await db.delete(teams).where(eq(teams.id, testTeamId));
    await db.delete(users).where(eq(users.id, testUserId));
  }
}

beforeEach(async () => {
  // Create test user
  const [user] = await db
    .insert(users)
    .values({
      email: `test-pagination-${Date.now()}-${Math.random()}@example.com`,
      name: "Test User",
      emailVerified: true,
    })
    .returning();

  testUserId = user.id;

  // Create test team
  const [team] = await db
    .insert(teams)
    .values({
      name: `Test Team ${Date.now()}-${Math.random()}`,
      slug: `test-team-${Date.now()}-${Math.random()}`,
      planId: "free",
    })
    .returning();

  testTeamId = team.id;

  // Create test session
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  testSessionToken = crypto.randomUUID();

  await db.insert(sessions).values({
    userId: testUserId,
    token: testSessionToken,
    expiresAt,
  });
});

afterEach(async () => {
  await cleanupTestData();
});

describe("Projects API - Property Tests", () => {
  /**
   * **Feature: project-system, Property 4: Pagination Correctness**
   * **Validates: Requirements 1.5**
   * 
   * For any paginated project list with total items T and page limit L,
   * the response SHALL have totalPages = ceil(T/L), and the number of
   * items on page P SHALL be min(L, T - (P-1)*L) for valid pages.
   */
  it("Property 4: Pagination correctness", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate total number of projects (1-50)
        fc.integer({ min: 1, max: 50 }),
        // Generate page limit (1-20)
        fc.integer({ min: 1, max: 20 }),
        async (totalProjects, limit) => {
          // Create test projects
          const projectsToCreate = Array.from(
            { length: totalProjects },
            (_, i) => ({
              teamId: testTeamId,
              name: `Test Project ${i}`,
              key: `TP${i}`,
              slug: `test-project-${i}`,
              visibility: "public" as const,
              status: "active" as const,
            })
          );

          await db.insert(projects).values(projectsToCreate);

          // Calculate expected total pages
          const expectedTotalPages = Math.ceil(totalProjects / limit);

          // Test each page
          for (let page = 1; page <= expectedTotalPages; page++) {
            const result = await listProjects({
              teamId: testTeamId,
              userId: testUserId,
              page,
              limit,
            });

            // Check totalPages calculation
            expect(result.totalPages).toBe(expectedTotalPages);

            // Check total count
            expect(result.total).toBe(totalProjects);

            // Check page number
            expect(result.page).toBe(page);

            // Check limit
            expect(result.limit).toBe(limit);

            // Calculate expected items on this page
            const expectedItemsOnPage = Math.min(
              limit,
              totalProjects - (page - 1) * limit
            );

            // Check number of items on page
            expect(result.items.length).toBe(expectedItemsOnPage);
          }

          // Clean up
          await db
            .delete(projects)
            .where(eq(projects.teamId, testTeamId));
        }
      ),
      { numRuns: 20 } // Reduced runs due to database operations
    );
  });

  /**
   * **Feature: project-system, Property 3: Filter Correctness & Performance**
   * **Validates: Requirements 1.4**
   * 
   * For any filter parameters (status, visibility, search) applied to a
   * project list query, all returned projects SHALL match all specified
   * filter criteria.
   */
  it("Property 3: Filter correctness - status filter", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate number of active and archived projects
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        async (numActive, numArchived) => {
          // Create active projects
          const activeProjects = Array.from({ length: numActive }, (_, i) => ({
            teamId: testTeamId,
            name: `Active Project ${i}`,
            key: `ACT${i}`,
            slug: `active-project-${i}`,
            visibility: "public" as const,
            status: "active" as const,
          }));

          // Create archived projects
          const archivedProjects = Array.from(
            { length: numArchived },
            (_, i) => ({
              teamId: testTeamId,
              name: `Archived Project ${i}`,
              key: `ARC${i}`,
              slug: `archived-project-${i}`,
              visibility: "public" as const,
              status: "archived" as const,
            })
          );

          await db
            .insert(projects)
            .values([...activeProjects, ...archivedProjects]);

          // Test active filter
          const activeResult = await listProjects({
            teamId: testTeamId,
            userId: testUserId,
            status: "active" as ProjectStatus,
          });

          // All returned projects should be active
          expect(activeResult.items.every((p) => p.status === "active")).toBe(
            true
          );
          expect(activeResult.total).toBe(numActive);

          // Test archived filter
          const archivedResult = await listProjects({
            teamId: testTeamId,
            userId: testUserId,
            status: "archived" as ProjectStatus,
          });

          // All returned projects should be archived
          expect(
            archivedResult.items.every((p) => p.status === "archived")
          ).toBe(true);
          expect(archivedResult.total).toBe(numArchived);

          // Clean up
          await db
            .delete(projects)
            .where(eq(projects.teamId, testTeamId));
        }
      ),
      { numRuns: 20 }
    );
  });

  it("Property 3: Filter correctness - visibility filter", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate number of public and private projects
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        async (numPublic, numPrivate) => {
          // Create public projects
          const publicProjects = Array.from({ length: numPublic }, (_, i) => ({
            teamId: testTeamId,
            name: `Public Project ${i}`,
            key: `PUB${i}`,
            slug: `public-project-${i}`,
            visibility: "public" as const,
            status: "active" as const,
          }));

          // Create private projects (user must be a member to see them)
          const privateProjects = Array.from(
            { length: numPrivate },
            (_, i) => ({
              teamId: testTeamId,
              name: `Private Project ${i}`,
              key: `PRV${i}`,
              slug: `private-project-${i}`,
              visibility: "private" as const,
              status: "active" as const,
            })
          );

          const insertedProjects = await db
            .insert(projects)
            .values([...publicProjects, ...privateProjects])
            .returning();

          // Add user as member to all private projects
          const privateProjectIds = insertedProjects
            .filter((p) => p.visibility === "private")
            .map((p) => p.id);

          if (privateProjectIds.length > 0) {
            await db.insert(projectMembers).values(
              privateProjectIds.map((projectId) => ({
                projectId,
                userId: testUserId,
                role: "viewer",
              }))
            );
          }

          // Test public filter
          const publicResult = await listProjects({
            teamId: testTeamId,
            userId: testUserId,
            visibility: "public" as ProjectVisibility,
          });

          // All returned projects should be public
          expect(
            publicResult.items.every((p) => p.visibility === "public")
          ).toBe(true);
          expect(publicResult.total).toBe(numPublic);

          // Test private filter
          const privateResult = await listProjects({
            teamId: testTeamId,
            userId: testUserId,
            visibility: "private" as ProjectVisibility,
          });

          // All returned projects should be private
          expect(
            privateResult.items.every((p) => p.visibility === "private")
          ).toBe(true);
          expect(privateResult.total).toBe(numPrivate);

          // Clean up
          await db
            .delete(projectMembers)
            .where(eq(projectMembers.userId, testUserId));
          await db
            .delete(projects)
            .where(eq(projects.teamId, testTeamId));
        }
      ),
      { numRuns: 20 }
    );
  });

  it("Property 3: Filter correctness - search filter", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a search term
        fc.constantFrom("alpha", "beta", "gamma", "delta"),
        async (searchTerm) => {
          const timestamp = Date.now();
          
          // Create projects with the search term in different fields
          const matchingProjects = [
            {
              teamId: testTeamId,
              name: `Project ${searchTerm}`,
              key: `K1${timestamp.toString().slice(-3)}`,
              slug: `project-${searchTerm}-${timestamp}`,
              description: "No match here",
              visibility: "public" as const,
              status: "active" as const,
            },
            {
              teamId: testTeamId,
              name: "Different Name",
              key: searchTerm.toUpperCase().substring(0, 3) + timestamp.toString().slice(-2),
              slug: `different-slug-${timestamp}`,
              description: "No match here",
              visibility: "public" as const,
              status: "active" as const,
            },
            {
              teamId: testTeamId,
              name: "Another Name",
              key: `K3${timestamp.toString().slice(-3)}`,
              slug: `another-slug-${timestamp}`,
              description: `Description with ${searchTerm}`,
              visibility: "public" as const,
              status: "active" as const,
            },
          ];

          // Create non-matching project
          const nonMatchingProject = {
            teamId: testTeamId,
            name: "Unrelated Project",
            key: `NM${timestamp.toString().slice(-3)}`,
            slug: `unrelated-project-${timestamp}`,
            description: "Nothing here",
            visibility: "public" as const,
            status: "active" as const,
          };

          await db
            .insert(projects)
            .values([...matchingProjects, nonMatchingProject]);

          // Search for the term
          const result = await listProjects({
            teamId: testTeamId,
            userId: testUserId,
            search: searchTerm,
          });

          // All returned projects should contain the search term
          // in name, key, or description
          for (const project of result.items) {
            const matchesName = project.name
              .toLowerCase()
              .includes(searchTerm.toLowerCase());
            const matchesKey = project.key
              .toLowerCase()
              .includes(searchTerm.toLowerCase());
            const matchesDescription =
              project.description
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase()) ?? false;

            expect(matchesName || matchesKey || matchesDescription).toBe(true);
          }

          // Should return at least 2 matching projects
          // (name match and description match; key match depends on case sensitivity)
          expect(result.total).toBeGreaterThanOrEqual(2);

          // Clean up
          await db
            .delete(projects)
            .where(eq(projects.teamId, testTeamId));
        }
      ),
      { numRuns: 10 }
    );
  });

  it("Property 3: Filter correctness - combined filters", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom("active", "archived"),
        fc.constantFrom("public", "private"),
        async (status, visibility) => {
          // Create projects with all combinations
          const projectCombinations = [
            {
              teamId: testTeamId,
              name: "Active Public",
              key: "AP1",
              slug: "active-public",
              visibility: "public" as const,
              status: "active" as const,
            },
            {
              teamId: testTeamId,
              name: "Active Private",
              key: "APR1",
              slug: "active-private",
              visibility: "private" as const,
              status: "active" as const,
            },
            {
              teamId: testTeamId,
              name: "Archived Public",
              key: "ARP1",
              slug: "archived-public",
              visibility: "public" as const,
              status: "archived" as const,
            },
            {
              teamId: testTeamId,
              name: "Archived Private",
              key: "ARPR1",
              slug: "archived-private",
              visibility: "private" as const,
              status: "archived" as const,
            },
          ];

          const insertedProjects = await db
            .insert(projects)
            .values(projectCombinations)
            .returning();

          // Add user as member to all private projects
          const privateProjectIds = insertedProjects
            .filter((p) => p.visibility === "private")
            .map((p) => p.id);

          if (privateProjectIds.length > 0) {
            await db.insert(projectMembers).values(
              privateProjectIds.map((projectId) => ({
                projectId,
                userId: testUserId,
                role: "viewer",
              }))
            );
          }

          // Apply combined filters
          const result = await listProjects({
            teamId: testTeamId,
            userId: testUserId,
            status: status as ProjectStatus,
            visibility: visibility as ProjectVisibility,
          });

          // All returned projects should match both filters
          for (const project of result.items) {
            expect(project.status).toBe(status);
            expect(project.visibility).toBe(visibility);
          }

          // Should return exactly 1 project matching both criteria
          expect(result.total).toBe(1);

          // Clean up
          await db
            .delete(projectMembers)
            .where(eq(projectMembers.userId, testUserId));
          await db
            .delete(projects)
            .where(eq(projects.teamId, testTeamId));
        }
      ),
      { numRuns: 10 }
    );
  });
});
