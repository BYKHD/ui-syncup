/**
 * Property-Based Tests for Project Detail API Routes
 * 
 * Tests universal properties that should hold across all inputs.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";
import { db } from "@/lib/db";
import { projects, projectMembers, userRoles } from "@/server/db/schema";
import { users, sessions, teams } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getProject } from "@/server/projects/project-service";
import { PROJECT_ROLES } from "@/config/roles";

// Test user and team IDs
let testUserId: string;
let testTeamId: string;

// Cleanup function to remove test data
async function cleanupTestData() {
  if (testUserId && testTeamId) {
    await db.delete(sessions).where(eq(sessions.userId, testUserId));
    await db.delete(userRoles).where(eq(userRoles.userId, testUserId));
    await db.delete(projectMembers).where(eq(projectMembers.userId, testUserId));
    await db.delete(projects).where(eq(projects.teamId, testTeamId));
    await db.delete(teams).where(eq(teams.id, testTeamId));
    await db.delete(users).where(eq(users.id, testUserId));
  }
}

beforeEach(async () => {
  // Create test user
  const [user] = await db
    .insert(users)
    .values({
      email: `test-detail-${Date.now()}-${Math.random()}@example.com`,
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
  const testSessionToken = crypto.randomUUID();

  await db.insert(sessions).values({
    userId: testUserId,
    token: testSessionToken,
    expiresAt,
  });
});

afterEach(async () => {
  await cleanupTestData();
});

describe("Project Detail API - Property Tests", () => {
  /**
   * **Feature: project-system, Property 5: Project Detail Response Correctness**
   * **Validates: Requirements 2.1, 2.3, 2.4**
   * 
   * For any project detail request by an authorized user, the response SHALL
   * include the user's current role (or null if not a member) and canJoin
   * SHALL be true if and only if the project is public AND the user is not
   * already a member.
   */
  it("Property 5: Project detail response correctness", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate project visibility
        fc.constantFrom("public", "private"),
        // Generate whether user is a member
        fc.boolean(),
        // Generate user's role if they are a member
        fc.constantFrom("owner", "editor", "developer", "viewer"),
        async (visibility, isMember, memberRole) => {
          // Create a test project
          const [project] = await db
            .insert(projects)
            .values({
              teamId: testTeamId,
              name: `Test Project ${Date.now()}`,
              key: `TP${Date.now().toString().slice(-4)}`,
              slug: `test-project-${Date.now()}`,
              visibility: visibility as "public" | "private",
              status: "active",
            })
            .returning();

          // Add user as member if specified
          if (isMember) {
            await db.insert(projectMembers).values({
              projectId: project.id,
              userId: testUserId,
              role: memberRole,
            });

            // Also add to user_roles for RBAC
            await db.insert(userRoles).values({
              userId: testUserId,
              role: PROJECT_ROLES[`PROJECT_${memberRole.toUpperCase()}` as keyof typeof PROJECT_ROLES],
              resourceType: "project",
              resourceId: project.id,
            });
          }

          // Get project details
          let result;
          try {
            result = await getProject(project.id, testUserId);
          } catch (error) {
            // If user doesn't have access (private project, not a member),
            // this is expected behavior
            if (
              error instanceof Error &&
              error.message === "Access denied" &&
              visibility === "private" &&
              !isMember
            ) {
              // Clean up and skip this iteration
              await db.delete(userRoles).where(eq(userRoles.userId, testUserId));
              await db
                .delete(projectMembers)
                .where(eq(projectMembers.userId, testUserId));
              await db.delete(projects).where(eq(projects.id, project.id));
              return;
            }
            throw error;
          }

          // Verify userRole is correct
          if (isMember) {
            expect(result.userRole).toBe(memberRole);
          } else {
            expect(result.userRole).toBeNull();
          }

          // Verify canJoin logic
          const expectedCanJoin = visibility === "public" && !isMember;
          expect(result.canJoin).toBe(expectedCanJoin);

          // Verify stats are present and valid
          expect(result.stats).toBeDefined();
          expect(result.stats.totalTickets).toBeGreaterThanOrEqual(0);
          expect(result.stats.completedTickets).toBeGreaterThanOrEqual(0);
          expect(result.stats.progressPercent).toBeGreaterThanOrEqual(0);
          expect(result.stats.progressPercent).toBeLessThanOrEqual(100);
          expect(result.stats.memberCount).toBeGreaterThanOrEqual(0);

          // If user is a member, memberCount should be at least 1
          if (isMember) {
            expect(result.stats.memberCount).toBeGreaterThanOrEqual(1);
          }

          // Clean up
          await db.delete(userRoles).where(eq(userRoles.userId, testUserId));
          await db
            .delete(projectMembers)
            .where(eq(projectMembers.userId, testUserId));
          await db.delete(projects).where(eq(projects.id, project.id));
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Test that canJoin is false for private projects
   */
  it("Property 5: canJoin is always false for private projects", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate whether user is a member
        fc.boolean(),
        async (isMember) => {
          // Create a private project
          const [project] = await db
            .insert(projects)
            .values({
              teamId: testTeamId,
              name: `Private Project ${Date.now()}`,
              key: `PP${Date.now().toString().slice(-4)}`,
              slug: `private-project-${Date.now()}`,
              visibility: "private",
              status: "active",
            })
            .returning();

          // Add user as member if specified
          if (isMember) {
            await db.insert(projectMembers).values({
              projectId: project.id,
              userId: testUserId,
              role: "viewer",
            });

            await db.insert(userRoles).values({
              userId: testUserId,
              role: PROJECT_ROLES.PROJECT_VIEWER,
              resourceType: "project",
              resourceId: project.id,
            });
          }

          // Get project details
          let result;
          try {
            result = await getProject(project.id, testUserId);
          } catch (error) {
            // If user doesn't have access (private project, not a member),
            // this is expected behavior
            if (
              error instanceof Error &&
              error.message === "Access denied" &&
              !isMember
            ) {
              // Clean up and skip this iteration
              await db.delete(projects).where(eq(projects.id, project.id));
              return;
            }
            throw error;
          }

          // canJoin should always be false for private projects
          expect(result.canJoin).toBe(false);

          // Clean up
          await db.delete(userRoles).where(eq(userRoles.userId, testUserId));
          await db
            .delete(projectMembers)
            .where(eq(projectMembers.userId, testUserId));
          await db.delete(projects).where(eq(projects.id, project.id));
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Test that canJoin is true only for public projects where user is not a member
   */
  it("Property 5: canJoin is true only for public non-member projects", async () => {
    // Create a public project
    const [project] = await db
      .insert(projects)
      .values({
        teamId: testTeamId,
        name: `Public Project ${Date.now()}`,
        key: `PUB${Date.now().toString().slice(-4)}`,
        slug: `public-project-${Date.now()}`,
        visibility: "public",
        status: "active",
      })
      .returning();

    // Get project details (user is not a member)
    const result = await getProject(project.id, testUserId);

    // canJoin should be true
    expect(result.canJoin).toBe(true);
    expect(result.userRole).toBeNull();

    // Clean up
    await db.delete(projects).where(eq(projects.id, project.id));
  });

  /**
   * Test that canJoin is false for public projects where user is already a member
   */
  it("Property 5: canJoin is false for public projects where user is a member", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom("owner", "editor", "developer", "viewer"),
        async (memberRole) => {
          // Create a public project
          const [project] = await db
            .insert(projects)
            .values({
              teamId: testTeamId,
              name: `Public Project ${Date.now()}`,
              key: `PUB${Date.now().toString().slice(-4)}`,
              slug: `public-project-${Date.now()}`,
              visibility: "public",
              status: "active",
            })
            .returning();

          // Add user as member
          await db.insert(projectMembers).values({
            projectId: project.id,
            userId: testUserId,
            role: memberRole,
          });

          await db.insert(userRoles).values({
            userId: testUserId,
            role: PROJECT_ROLES[`PROJECT_${memberRole.toUpperCase()}` as keyof typeof PROJECT_ROLES],
            resourceType: "project",
            resourceId: project.id,
          });

          // Get project details
          const result = await getProject(project.id, testUserId);

          // canJoin should be false (already a member)
          expect(result.canJoin).toBe(false);
          expect(result.userRole).toBe(memberRole);

          // Clean up
          await db.delete(userRoles).where(eq(userRoles.userId, testUserId));
          await db
            .delete(projectMembers)
            .where(eq(projectMembers.userId, testUserId));
          await db.delete(projects).where(eq(projects.id, project.id));
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * **Feature: project-system, Property 9: Visibility Change Member Preservation**
   * **Validates: Requirements 4.3, 4.4**
   * 
   * For any project visibility change (public↔private), all existing project
   * members SHALL be retained with their roles unchanged.
   */
  it("Property 9: Visibility change preserves members", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate initial visibility
        fc.constantFrom("public", "private"),
        // Generate number of members (1-5)
        fc.integer({ min: 1, max: 5 }),
        // Generate member roles
        fc.array(
          fc.constantFrom("owner", "editor", "developer", "viewer"),
          { minLength: 1, maxLength: 5 }
        ),
        async (initialVisibility, numMembers, memberRoles) => {
          // Create a test project
          const [project] = await db
            .insert(projects)
            .values({
              teamId: testTeamId,
              name: `Test Project ${Date.now()}`,
              key: `TP${Date.now().toString().slice(-4)}`,
              slug: `test-project-${Date.now()}`,
              visibility: initialVisibility as "public" | "private",
              status: "active",
            })
            .returning();

          // Create test users and add them as members
          const memberUsers = [];
          for (let i = 0; i < numMembers; i++) {
            const [user] = await db
              .insert(users)
              .values({
                email: `member-${i}-${Date.now()}-${Math.random()}@example.com`,
                name: `Member ${i}`,
                emailVerified: true,
              })
              .returning();

            memberUsers.push(user);

            const role = memberRoles[i % memberRoles.length];

            // Add to project_members
            await db.insert(projectMembers).values({
              projectId: project.id,
              userId: user.id,
              role,
            });

            // Add to user_roles for RBAC
            await db.insert(userRoles).values({
              userId: user.id,
              role: PROJECT_ROLES[`PROJECT_${role.toUpperCase()}` as keyof typeof PROJECT_ROLES],
              resourceType: "project",
              resourceId: project.id,
            });
          }

          // Get members before visibility change
          const membersBefore = await db
            .select()
            .from(projectMembers)
            .where(eq(projectMembers.projectId, project.id));

          // Change visibility
          const newVisibility =
            initialVisibility === "public" ? "private" : "public";

          const { updateProject } = await import(
            "@/server/projects/project-service"
          );
          await updateProject(project.id, {
            visibility: newVisibility as "public" | "private",
          });

          // Get members after visibility change
          const membersAfter = await db
            .select()
            .from(projectMembers)
            .where(eq(projectMembers.projectId, project.id));

          // Verify same number of members
          expect(membersAfter.length).toBe(membersBefore.length);

          // Verify all members are preserved with same roles
          for (const memberBefore of membersBefore) {
            const memberAfter = membersAfter.find(
              (m) => m.userId === memberBefore.userId
            );

            expect(memberAfter).toBeDefined();
            expect(memberAfter?.role).toBe(memberBefore.role);
            expect(memberAfter?.projectId).toBe(memberBefore.projectId);
          }

          // Clean up
          for (const user of memberUsers) {
            await db.delete(userRoles).where(eq(userRoles.userId, user.id));
            await db
              .delete(projectMembers)
              .where(eq(projectMembers.userId, user.id));
            await db.delete(users).where(eq(users.id, user.id));
          }
          await db.delete(projects).where(eq(projects.id, project.id));
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Test that visibility change from public to private preserves members
   */
  it("Property 9: Public to private preserves members", async () => {
    // Create a public project
    const [project] = await db
      .insert(projects)
      .values({
        teamId: testTeamId,
        name: `Public Project ${Date.now()}`,
        key: `PUB${Date.now().toString().slice(-4)}`,
        slug: `public-project-${Date.now()}`,
        visibility: "public",
        status: "active",
      })
      .returning();

    // Create test users and add them as members
    const memberUsers = [];
    const roles = ["owner", "editor", "developer", "viewer"];

    for (let i = 0; i < roles.length; i++) {
      const [user] = await db
        .insert(users)
        .values({
          email: `member-${i}-${Date.now()}-${Math.random()}@example.com`,
          name: `Member ${i}`,
          emailVerified: true,
        })
        .returning();

      memberUsers.push(user);

      await db.insert(projectMembers).values({
        projectId: project.id,
        userId: user.id,
        role: roles[i],
      });

      await db.insert(userRoles).values({
        userId: user.id,
        role: PROJECT_ROLES[`PROJECT_${roles[i].toUpperCase()}` as keyof typeof PROJECT_ROLES],
        resourceType: "project",
        resourceId: project.id,
      });
    }

    // Get members before change
    const membersBefore = await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, project.id));

    expect(membersBefore.length).toBe(4);

    // Change to private
    const { updateProject } = await import("@/server/projects/project-service");
    await updateProject(project.id, { visibility: "private" });

    // Get members after change
    const membersAfter = await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, project.id));

    // Verify all members preserved
    expect(membersAfter.length).toBe(4);

    for (let i = 0; i < roles.length; i++) {
      const member = membersAfter.find((m) => m.userId === memberUsers[i].id);
      expect(member).toBeDefined();
      expect(member?.role).toBe(roles[i]);
    }

    // Clean up
    for (const user of memberUsers) {
      await db.delete(userRoles).where(eq(userRoles.userId, user.id));
      await db.delete(projectMembers).where(eq(projectMembers.userId, user.id));
      await db.delete(users).where(eq(users.id, user.id));
    }
    await db.delete(projects).where(eq(projects.id, project.id));
  });

  /**
   * Test that visibility change from private to public preserves members
   */
  it("Property 9: Private to public preserves members", async () => {
    // Create a private project
    const [project] = await db
      .insert(projects)
      .values({
        teamId: testTeamId,
        name: `Private Project ${Date.now()}`,
        key: `PRV${Date.now().toString().slice(-4)}`,
        slug: `private-project-${Date.now()}`,
        visibility: "private",
        status: "active",
      })
      .returning();

    // Create test users and add them as members
    const memberUsers = [];
    const roles = ["owner", "editor", "developer", "viewer"];

    for (let i = 0; i < roles.length; i++) {
      const [user] = await db
        .insert(users)
        .values({
          email: `member-${i}-${Date.now()}-${Math.random()}@example.com`,
          name: `Member ${i}`,
          emailVerified: true,
        })
        .returning();

      memberUsers.push(user);

      await db.insert(projectMembers).values({
        projectId: project.id,
        userId: user.id,
        role: roles[i],
      });

      await db.insert(userRoles).values({
        userId: user.id,
        role: PROJECT_ROLES[`PROJECT_${roles[i].toUpperCase()}` as keyof typeof PROJECT_ROLES],
        resourceType: "project",
        resourceId: project.id,
      });
    }

    // Get members before change
    const membersBefore = await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, project.id));

    expect(membersBefore.length).toBe(4);

    // Change to public
    const { updateProject } = await import("@/server/projects/project-service");
    await updateProject(project.id, { visibility: "public" });

    // Get members after change
    const membersAfter = await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, project.id));

    // Verify all members preserved
    expect(membersAfter.length).toBe(4);

    for (let i = 0; i < roles.length; i++) {
      const member = membersAfter.find((m) => m.userId === memberUsers[i].id);
      expect(member).toBeDefined();
      expect(member?.role).toBe(roles[i]);
    }

    // Clean up
    for (const user of memberUsers) {
      await db.delete(userRoles).where(eq(userRoles.userId, user.id));
      await db.delete(projectMembers).where(eq(projectMembers.userId, user.id));
      await db.delete(users).where(eq(users.id, user.id));
    }
    await db.delete(projects).where(eq(projects.id, project.id));
  });
});
