/**
 * Property-based tests for team creation
 * Feature: team-system, Property 1: Team creation assigns correct roles
 * Validates: Requirements 1.1
 */

import { describe, test, expect, afterEach } from "vitest";
import fc from "fast-check";
import { createTeam } from "../team-service";
import { db } from "@/lib/db";
import { teams } from "@/server/db/schema/teams";
import { teamMembers } from "@/server/db/schema/team-members";
import { users } from "@/server/db/schema/users";
import { eq } from "drizzle-orm";

// Test configuration: run 100 iterations minimum
const propertyConfig = { numRuns: 100 };

// Arbitrary for valid team names (2-50 characters with at least 2 alphanumeric characters)
const validTeamNameArb = fc
  .string({ minLength: 2, maxLength: 50 })
  .filter((name) => {
    // Must contain at least 2 alphanumeric characters
    const alphanumericCount = (name.match(/[a-zA-Z0-9]/g) || []).length;
    return alphanumericCount >= 2;
  });

// Arbitrary for team descriptions
const teamDescriptionArb = fc.option(fc.string({ maxLength: 500 }));

// Arbitrary for team creation data
const teamDataArb = fc.record({
  name: validTeamNameArb,
  description: teamDescriptionArb,
});

describe("Property 1: Team creation assigns correct roles", () => {
  const testUserIds: string[] = [];
  const testTeamIds: string[] = [];

  afterEach(async () => {
    // Clean up test data
    if (testTeamIds.length > 0) {
      await db.delete(teams).where(eq(teams.id, testTeamIds[0]));
      testTeamIds.length = 0;
    }
    if (testUserIds.length > 0) {
      await db.delete(users).where(eq(users.id, testUserIds[0]));
      testUserIds.length = 0;
    }
  });

  test("team creator is assigned TEAM_OWNER management role", async () => {
    await fc.assert(
      fc.asyncProperty(teamDataArb, async (data) => {
        // Create test user
        const [user] = await db
          .insert(users)
          .values({
            email: `test-${Date.now()}-${Math.random()}@example.com`,
            emailVerified: true,
            name: "Test User",
          })
          .returning();

        testUserIds.push(user.id);

        // Create team
        const team = await createTeam({
          ...data,
          description: data.description ?? undefined,
          creatorId: user.id,
        });

        testTeamIds.push(team.id);

        // Get creator's roles
        const member = await db.query.teamMembers.findFirst({
          where: eq(teamMembers.userId, user.id),
        });

        // Verify TEAM_OWNER role
        expect(member).toBeDefined();
        expect(member?.managementRole).toBe("TEAM_OWNER");

        // Clean up
        await db.delete(teams).where(eq(teams.id, team.id));
        await db.delete(users).where(eq(users.id, user.id));
        testTeamIds.length = 0;
        testUserIds.length = 0;

        return true;
      }),
      { ...propertyConfig, numRuns: 20 } // Fewer runs for DB operations
    );
  });

  test("team creator is assigned TEAM_EDITOR operational role", async () => {
    await fc.assert(
      fc.asyncProperty(teamDataArb, async (data) => {
        // Create test user
        const [user] = await db
          .insert(users)
          .values({
            email: `test-${Date.now()}-${Math.random()}@example.com`,
            emailVerified: true,
            name: "Test User",
          })
          .returning();

        testUserIds.push(user.id);

        // Create team
        const team = await createTeam({
          ...data,
          description: data.description ?? undefined,
          creatorId: user.id,
        });

        testTeamIds.push(team.id);

        // Get creator's roles
        const member = await db.query.teamMembers.findFirst({
          where: eq(teamMembers.userId, user.id),
        });

        // Verify TEAM_EDITOR role
        expect(member).toBeDefined();
        expect(member?.operationalRole).toBe("TEAM_EDITOR");

        // Clean up
        await db.delete(teams).where(eq(teams.id, team.id));
        await db.delete(users).where(eq(users.id, user.id));
        testTeamIds.length = 0;
        testUserIds.length = 0;

        return true;
      }),
      { ...propertyConfig, numRuns: 20 } // Fewer runs for DB operations
    );
  });

  test("team creator has both management and operational roles assigned", async () => {
    await fc.assert(
      fc.asyncProperty(teamDataArb, async (data) => {
        // Create test user
        const [user] = await db
          .insert(users)
          .values({
            email: `test-${Date.now()}-${Math.random()}@example.com`,
            emailVerified: true,
            name: "Test User",
          })
          .returning();

        testUserIds.push(user.id);

        // Create team
        const team = await createTeam({
          ...data,
          description: data.description ?? undefined,
          creatorId: user.id,
        });

        testTeamIds.push(team.id);

        // Get creator's roles
        const member = await db.query.teamMembers.findFirst({
          where: eq(teamMembers.userId, user.id),
        });

        // Verify both roles are assigned
        expect(member).toBeDefined();
        expect(member?.managementRole).toBe("TEAM_OWNER");
        expect(member?.operationalRole).toBe("TEAM_EDITOR");

        // Clean up
        await db.delete(teams).where(eq(teams.id, team.id));
        await db.delete(users).where(eq(users.id, user.id));
        testTeamIds.length = 0;
        testUserIds.length = 0;

        return true;
      }),
      { ...propertyConfig, numRuns: 20 } // Fewer runs for DB operations
    );
  });

  test("team creator is the only member after creation", async () => {
    await fc.assert(
      fc.asyncProperty(teamDataArb, async (data) => {
        // Create test user
        const [user] = await db
          .insert(users)
          .values({
            email: `test-${Date.now()}-${Math.random()}@example.com`,
            emailVerified: true,
            name: "Test User",
          })
          .returning();

        testUserIds.push(user.id);

        // Create team
        const team = await createTeam({
          ...data,
          description: data.description ?? undefined,
          creatorId: user.id,
        });

        testTeamIds.push(team.id);

        // Get all team members
        const members = await db.query.teamMembers.findMany({
          where: eq(teamMembers.teamId, team.id),
        });

        // Should have exactly one member (the creator)
        expect(members).toHaveLength(1);
        expect(members[0].userId).toBe(user.id);

        // Clean up
        await db.delete(teams).where(eq(teams.id, team.id));
        await db.delete(users).where(eq(users.id, user.id));
        testTeamIds.length = 0;
        testUserIds.length = 0;

        return true;
      }),
      { ...propertyConfig, numRuns: 20 } // Fewer runs for DB operations
    );
  });

  test("team creator's invitedBy field is null", async () => {
    await fc.assert(
      fc.asyncProperty(teamDataArb, async (data) => {
        // Create test user
        const [user] = await db
          .insert(users)
          .values({
            email: `test-${Date.now()}-${Math.random()}@example.com`,
            emailVerified: true,
            name: "Test User",
          })
          .returning();

        testUserIds.push(user.id);

        // Create team
        const team = await createTeam({
          ...data,
          description: data.description ?? undefined,
          creatorId: user.id,
        });

        testTeamIds.push(team.id);

        // Get creator's membership
        const member = await db.query.teamMembers.findFirst({
          where: eq(teamMembers.userId, user.id),
        });

        // Creator should not have invitedBy set
        expect(member).toBeDefined();
        expect(member?.invitedBy).toBeNull();

        // Clean up
        await db.delete(teams).where(eq(teams.id, team.id));
        await db.delete(users).where(eq(users.id, user.id));
        testTeamIds.length = 0;
        testUserIds.length = 0;

        return true;
      }),
      { ...propertyConfig, numRuns: 20 } // Fewer runs for DB operations
    );
  });
});
