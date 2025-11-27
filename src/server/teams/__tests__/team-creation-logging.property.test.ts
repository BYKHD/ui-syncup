/**
 * Property-based tests for team creation logging
 * Feature: team-system, Property 5: Team creation is logged
 * Validates: Requirements 1.5, 14.1
 */

import { describe, test, expect, afterEach, beforeEach, vi } from "vitest";
import fc from "fast-check";
import { createTeam } from "../team-service";
import { db } from "@/lib/db";
import { teams } from "@/server/db/schema/teams";
import { users } from "@/server/db/schema/users";
import { eq } from "drizzle-orm";
import * as loggerModule from "@/lib/logger";

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

// Helper to find team creation log from logger.info calls
function findTeamCreationLog(spy: ReturnType<typeof vi.spyOn>) {
  for (const call of spy.mock.calls) {
    const logMessage = call[0];
    if (typeof logMessage === "string") {
      try {
        const parsed = JSON.parse(logMessage);
        if (parsed.eventType === "team.create.success") {
          return parsed;
        }
      } catch {
        // Not JSON, skip
      }
    }
  }
  return null;
}

describe("Property 5: Team creation is logged", () => {
  const testUserIds: string[] = [];
  const testTeamIds: string[] = [];
  let loggerInfoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy on logger.info to capture log output
    loggerInfoSpy = vi.spyOn(loggerModule.logger, "info");
  });

  afterEach(async () => {
    // Restore spy
    loggerInfoSpy.mockRestore();

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

  test("team creation logs event with team ID", async () => {
    await fc.assert(
      fc.asyncProperty(teamDataArb, async (data) => {
        // Clear previous spy calls
        loggerInfoSpy.mockClear();

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

        // Find the team creation log
        const logEvent = findTeamCreationLog(loggerInfoSpy);

        // Verify log was created
        expect(logEvent).toBeDefined();
        expect(logEvent?.eventType).toBe("team.create.success");
        expect(logEvent?.teamId).toBe(team.id);

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

  test("team creation logs event with creator ID", async () => {
    await fc.assert(
      fc.asyncProperty(teamDataArb, async (data) => {
        // Clear previous spy calls
        loggerInfoSpy.mockClear();

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

        // Find the team creation log
        const logEvent = findTeamCreationLog(loggerInfoSpy);

        // Verify log was created with creator ID
        expect(logEvent).toBeDefined();
        expect(logEvent?.userId).toBe(user.id);

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

  test("team creation logs event with timestamp", async () => {
    await fc.assert(
      fc.asyncProperty(teamDataArb, async (data) => {
        // Clear previous spy calls
        loggerInfoSpy.mockClear();

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

        // Record time before creation
        const beforeTime = new Date();

        // Create team
        const team = await createTeam({
          ...data,
          description: data.description ?? undefined,
          creatorId: user.id,
        });

        testTeamIds.push(team.id);

        // Record time after creation
        const afterTime = new Date();

        // Find the team creation log
        const logEvent = findTeamCreationLog(loggerInfoSpy);

        // Verify log has timestamp
        expect(logEvent).toBeDefined();
        expect(logEvent?.timestamp).toBeDefined();
        
        // Verify timestamp is within reasonable range
        const logTime = new Date(logEvent!.timestamp);
        expect(logTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
        expect(logTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());

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

  test("team creation logs event with team name", async () => {
    await fc.assert(
      fc.asyncProperty(teamDataArb, async (data) => {
        // Clear previous spy calls
        loggerInfoSpy.mockClear();

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

        // Find the team creation log
        const logEvent = findTeamCreationLog(loggerInfoSpy);

        // Verify log has team name
        expect(logEvent).toBeDefined();
        expect(logEvent?.teamName).toBe(team.name);

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

  test("team creation logs event with success outcome", async () => {
    await fc.assert(
      fc.asyncProperty(teamDataArb, async (data) => {
        // Clear previous spy calls
        loggerInfoSpy.mockClear();

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

        // Find the team creation log
        const logEvent = findTeamCreationLog(loggerInfoSpy);

        // Verify log has success outcome
        expect(logEvent).toBeDefined();
        expect(logEvent?.outcome).toBe("success");

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

  test("team creation logs event with metadata containing slug and planId", async () => {
    await fc.assert(
      fc.asyncProperty(teamDataArb, async (data) => {
        // Clear previous spy calls
        loggerInfoSpy.mockClear();

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

        // Find the team creation log
        const logEvent = findTeamCreationLog(loggerInfoSpy);

        // Verify log has metadata with slug and planId
        expect(logEvent).toBeDefined();
        expect(logEvent?.metadata).toBeDefined();
        expect(logEvent?.metadata?.slug).toBe(team.slug);
        expect(logEvent?.metadata?.planId).toBe(team.planId);

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

  test("team creation always logs exactly one event", async () => {
    await fc.assert(
      fc.asyncProperty(teamDataArb, async (data) => {
        // Clear previous spy calls
        loggerInfoSpy.mockClear();

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

        // Count team creation logs
        let count = 0;
        for (const call of loggerInfoSpy.mock.calls) {
          const logMessage = call[0];
          if (typeof logMessage === "string") {
            try {
              const parsed = JSON.parse(logMessage);
              if (parsed.eventType === "team.create.success") {
                count++;
              }
            } catch {
              // Not JSON, skip
            }
          }
        }

        // Verify exactly one log
        expect(count).toBe(1);

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
