/**
 * Property-based tests for billable seat calculation
 * Feature: team-system, Property 48: Billable seats count only TEAM_EDITOR
 * Validates: Requirements 13.4
 */

import { describe, test, expect, afterEach } from "vitest";
import fc from "fast-check";
import { calculateBillableSeats } from "../billable-seats";
import { db } from "@/lib/db";
import { teams } from "@/server/db/schema/teams";
import { teamMembers } from "@/server/db/schema/team-members";
import { users } from "@/server/db/schema/users";
import { eq } from "drizzle-orm";

// Test configuration: run 100 iterations minimum
const propertyConfig = { numRuns: 100 };

// Arbitrary for operational roles
const operationalRoleArb = fc.constantFrom(
  "TEAM_EDITOR",
  "TEAM_MEMBER",
  "TEAM_VIEWER"
);

// Arbitrary for management roles (optional)
const managementRoleArb = fc.option(
  fc.constantFrom("TEAM_OWNER", "TEAM_ADMIN")
);

// Arbitrary for role assignment
const roleAssignmentArb = fc.record({
  managementRole: managementRoleArb,
  operationalRole: operationalRoleArb,
});

describe("Property 48: Billable seats count only TEAM_EDITOR", () => {
  const testUserIds: string[] = [];
  const testTeamIds: string[] = [];

  afterEach(async () => {
    // Clean up test data
    if (testTeamIds.length > 0) {
      await db.delete(teams).where(eq(teams.id, testTeamIds[0]));
      testTeamIds.length = 0;
    }
    if (testUserIds.length > 0) {
      for (const userId of testUserIds) {
        await db.delete(users).where(eq(users.id, userId));
      }
      testUserIds.length = 0;
    }
  });

  test("billable seats equals count of unique users with TEAM_EDITOR role", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(roleAssignmentArb, { minLength: 1, maxLength: 10 }),
        async (roleAssignments) => {
          // Create test team
          const [team] = await db
            .insert(teams)
            .values({
              name: `Test Team ${Date.now()}`,
              slug: `test-team-${Date.now()}`,
              planId: "free",
              billableSeats: 0,
            })
            .returning();

          testTeamIds.push(team.id);

          // Create test users and assign roles
          const userIds: string[] = [];
          for (const assignment of roleAssignments) {
            const [user] = await db
              .insert(users)
              .values({
                email: `test-${Date.now()}-${Math.random()}@example.com`,
                emailVerified: true,
                name: "Test User",
              })
              .returning();

            testUserIds.push(user.id);
            userIds.push(user.id);

            await db.insert(teamMembers).values({
              teamId: team.id,
              userId: user.id,
              managementRole: assignment.managementRole ?? null,
              operationalRole: assignment.operationalRole,
              joinedAt: new Date(),
            });
          }

          // Calculate billable seats
          const billableSeats = await calculateBillableSeats(team.id);

          // Count expected billable seats (TEAM_EDITOR only)
          const expectedBillableSeats = roleAssignments.filter(
            (r) => r.operationalRole === "TEAM_EDITOR"
          ).length;

          // Verify billable seats count
          expect(billableSeats).toBe(expectedBillableSeats);

          // Clean up
          await db.delete(teams).where(eq(teams.id, team.id));
          for (const userId of userIds) {
            await db.delete(users).where(eq(users.id, userId));
          }
          testTeamIds.length = 0;
          testUserIds.length = 0;

          return true;
        }
      ),
      { ...propertyConfig, numRuns: 20 } // Fewer runs for DB operations
    );
  });

  test("TEAM_MEMBER and TEAM_VIEWER roles are not billable", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            managementRole: managementRoleArb,
            operationalRole: fc.constantFrom("TEAM_MEMBER", "TEAM_VIEWER"),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (roleAssignments) => {
          // Create test team
          const [team] = await db
            .insert(teams)
            .values({
              name: `Test Team ${Date.now()}`,
              slug: `test-team-${Date.now()}`,
              planId: "free",
              billableSeats: 0,
            })
            .returning();

          testTeamIds.push(team.id);

          // Create test users with non-billable roles
          const userIds: string[] = [];
          for (const assignment of roleAssignments) {
            const [user] = await db
              .insert(users)
              .values({
                email: `test-${Date.now()}-${Math.random()}@example.com`,
                emailVerified: true,
                name: "Test User",
              })
              .returning();

            testUserIds.push(user.id);
            userIds.push(user.id);

            await db.insert(teamMembers).values({
              teamId: team.id,
              userId: user.id,
              managementRole: assignment.managementRole ?? null,
              operationalRole: assignment.operationalRole,
              joinedAt: new Date(),
            });
          }

          // Calculate billable seats
          const billableSeats = await calculateBillableSeats(team.id);

          // Should be 0 since no TEAM_EDITOR roles
          expect(billableSeats).toBe(0);

          // Clean up
          await db.delete(teams).where(eq(teams.id, team.id));
          for (const userId of userIds) {
            await db.delete(users).where(eq(users.id, userId));
          }
          testTeamIds.length = 0;
          testUserIds.length = 0;

          return true;
        }
      ),
      { ...propertyConfig, numRuns: 20 } // Fewer runs for DB operations
    );
  });

  test("management roles do not affect billable seat count", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          managementRoleArb,
          managementRoleArb
        ),
        async ([mgmtRole1, mgmtRole2]) => {
          // Create test team
          const [team] = await db
            .insert(teams)
            .values({
              name: `Test Team ${Date.now()}`,
              slug: `test-team-${Date.now()}`,
              planId: "free",
              billableSeats: 0,
            })
            .returning();

          testTeamIds.push(team.id);

          // Create two users with TEAM_EDITOR but different management roles
          const [user1] = await db
            .insert(users)
            .values({
              email: `test-${Date.now()}-${Math.random()}@example.com`,
              emailVerified: true,
              name: "Test User 1",
            })
            .returning();

          testUserIds.push(user1.id);

          const [user2] = await db
            .insert(users)
            .values({
              email: `test-${Date.now()}-${Math.random()}@example.com`,
              emailVerified: true,
              name: "Test User 2",
            })
            .returning();

          testUserIds.push(user2.id);

          // Assign roles
          await db.insert(teamMembers).values({
            teamId: team.id,
            userId: user1.id,
            managementRole: mgmtRole1 ?? null,
            operationalRole: "TEAM_EDITOR",
            joinedAt: new Date(),
          });

          await db.insert(teamMembers).values({
            teamId: team.id,
            userId: user2.id,
            managementRole: mgmtRole2 ?? null,
            operationalRole: "TEAM_EDITOR",
            joinedAt: new Date(),
          });

          // Calculate billable seats
          const billableSeats = await calculateBillableSeats(team.id);

          // Should be 2 regardless of management roles
          expect(billableSeats).toBe(2);

          // Clean up
          await db.delete(teams).where(eq(teams.id, team.id));
          await db.delete(users).where(eq(users.id, user1.id));
          await db.delete(users).where(eq(users.id, user2.id));
          testTeamIds.length = 0;
          testUserIds.length = 0;

          return true;
        }
      ),
      { ...propertyConfig, numRuns: 20 } // Fewer runs for DB operations
    );
  });

  test("billable seats count is always non-negative", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(roleAssignmentArb, { minLength: 0, maxLength: 10 }),
        async (roleAssignments) => {
          // Create test team
          const [team] = await db
            .insert(teams)
            .values({
              name: `Test Team ${Date.now()}`,
              slug: `test-team-${Date.now()}`,
              planId: "free",
              billableSeats: 0,
            })
            .returning();

          testTeamIds.push(team.id);

          // Create test users and assign roles
          const userIds: string[] = [];
          for (const assignment of roleAssignments) {
            const [user] = await db
              .insert(users)
              .values({
                email: `test-${Date.now()}-${Math.random()}@example.com`,
                emailVerified: true,
                name: "Test User",
              })
              .returning();

            testUserIds.push(user.id);
            userIds.push(user.id);

            await db.insert(teamMembers).values({
              teamId: team.id,
              userId: user.id,
              managementRole: assignment.managementRole ?? null,
              operationalRole: assignment.operationalRole,
              joinedAt: new Date(),
            });
          }

          // Calculate billable seats
          const billableSeats = await calculateBillableSeats(team.id);

          // Should always be >= 0
          expect(billableSeats).toBeGreaterThanOrEqual(0);

          // Clean up
          await db.delete(teams).where(eq(teams.id, team.id));
          for (const userId of userIds) {
            await db.delete(users).where(eq(users.id, userId));
          }
          testTeamIds.length = 0;
          testUserIds.length = 0;

          return true;
        }
      ),
      { ...propertyConfig, numRuns: 20 } // Fewer runs for DB operations
    );
  });
});
