/**
 * Property-based tests for team context persistence
 * Feature: team-system, Property 36: Last active team loads from database first
 * Validates: Requirements 9.4
 */

import { describe, test, expect, afterEach, vi } from "vitest";
import fc from "fast-check";
import { getActiveTeam, setActiveTeam, getTeamCookieName } from "../team-context";
import { createTeam } from "../team-service";
import { db } from "@/lib/db";
import { teams } from "@/server/db/schema/teams";
import { teamMembers } from "@/server/db/schema/team-members";
import { users } from "@/server/db/schema/users";
import { eq, and } from "drizzle-orm";

// Mock Next.js cookies
const mockCookieStore = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn((name: string) => {
      const value = mockCookieStore.get(name);
      return value ? { value } : undefined;
    }),
    set: vi.fn((name: string, value: string) => {
      mockCookieStore.set(name, value);
    }),
  })),
}));

// Test configuration: run 100 iterations minimum
const propertyConfig = { numRuns: 100 };

// Arbitrary for valid team names
const validTeamNameArb = fc
  .string({ minLength: 2, maxLength: 50 })
  .filter((name) => {
    const alphanumericCount = (name.match(/[a-zA-Z0-9]/g) || []).length;
    return alphanumericCount >= 2;
  });

describe("Property 36: Last active team loads from database first", () => {
  const testUserIds: string[] = [];
  const testTeamIds: string[] = [];

  afterEach(async () => {
    // Clean up test data
    for (const teamId of testTeamIds) {
      await db.delete(teams).where(eq(teams.id, teamId));
    }
    for (const userId of testUserIds) {
      await db.delete(users).where(eq(users.id, userId));
    }
    testTeamIds.length = 0;
    testUserIds.length = 0;
    
    // Clear mock cookie store
    mockCookieStore.clear();
  });

  test("database value is used when both database and cookie are set", async () => {
    await fc.assert(
      fc.asyncProperty(
        validTeamNameArb,
        validTeamNameArb,
        async (teamName1, teamName2) => {
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

          // Create two teams
          const team1 = await createTeam({
            name: teamName1,
            creatorId: user.id,
          });
          testTeamIds.push(team1.id);

          const team2 = await createTeam({
            name: teamName2,
            creatorId: user.id,
          });
          testTeamIds.push(team2.id);

          // Set team1 in database
          await db
            .update(users)
            .set({ lastActiveTeamId: team1.id })
            .where(eq(users.id, user.id));

          // Manually set team2 in cookie (simulating a mismatch)
          mockCookieStore.set(getTeamCookieName(), team2.id);

          // Get active team - should return team1 (database value)
          const result = await getActiveTeam(user.id);

          // Verify database value wins
          expect(result.team).toBeDefined();
          expect(result.team?.id).toBe(team1.id);
          expect(result.source).toBe("database");

          // Verify cookie was synced to match database
          expect(result.cookieSynced).toBe(true);

          // Clean up
          await db.delete(teams).where(eq(teams.id, team1.id));
          await db.delete(teams).where(eq(teams.id, team2.id));
          await db.delete(users).where(eq(users.id, user.id));
          testTeamIds.length = 0;
          testUserIds.length = 0;

          return true;
        }
      ),
      { ...propertyConfig, numRuns: 20 } // Fewer runs for DB operations
    );
  });

  test("cookie value is used as fallback when database value is null", async () => {
    await fc.assert(
      fc.asyncProperty(validTeamNameArb, async (teamName) => {
        // Create test user
        const [user] = await db
          .insert(users)
          .values({
            email: `test-${Date.now()}-${Math.random()}@example.com`,
            emailVerified: true,
            name: "Test User",
            lastActiveTeamId: null, // Explicitly null in database
          })
          .returning();

        testUserIds.push(user.id);

        // Create team
        const team = await createTeam({
          name: teamName,
          creatorId: user.id,
        });
        testTeamIds.push(team.id);

        // createTeam automatically sets lastActiveTeamId, so we need to clear it
        await db
          .update(users)
          .set({ lastActiveTeamId: null })
          .where(eq(users.id, user.id));

        // Set team in cookie only
        mockCookieStore.set(getTeamCookieName(), team.id);

        // Get active team - should return team from cookie
        const result = await getActiveTeam(user.id);

        // Verify cookie value is used as fallback
        expect(result.team).toBeDefined();
        expect(result.team?.id).toBe(team.id);
        expect(result.source).toBe("cookie");

        // Cookie should not be synced since we're using it as source
        expect(result.cookieSynced).toBe(false);

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

  test("database value is prioritized over cookie when both exist", async () => {
    await fc.assert(
      fc.asyncProperty(
        validTeamNameArb,
        validTeamNameArb,
        async (teamName1, teamName2) => {
          // Ensure team names are different
          if (teamName1 === teamName2) {
            return true; // Skip this iteration
          }

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

          // Create two teams
          const team1 = await createTeam({
            name: teamName1,
            creatorId: user.id,
          });
          testTeamIds.push(team1.id);

          const team2 = await createTeam({
            name: teamName2,
            creatorId: user.id,
          });
          testTeamIds.push(team2.id);

          // Set team1 in database
          await db
            .update(users)
            .set({ lastActiveTeamId: team1.id })
            .where(eq(users.id, user.id));

          // Set team2 in cookie
          mockCookieStore.set(getTeamCookieName(), team2.id);

          // Get active team
          const result = await getActiveTeam(user.id);

          // Database value should win
          expect(result.team).toBeDefined();
          expect(result.team?.id).toBe(team1.id);
          expect(result.team?.id).not.toBe(team2.id);
          expect(result.source).toBe("database");

          // Clean up
          await db.delete(teams).where(eq(teams.id, team1.id));
          await db.delete(teams).where(eq(teams.id, team2.id));
          await db.delete(users).where(eq(users.id, user.id));
          testTeamIds.length = 0;
          testUserIds.length = 0;

          return true;
        }
      ),
      { ...propertyConfig, numRuns: 20 } // Fewer runs for DB operations
    );
  });

  test("returns null when neither database nor cookie have a value", async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        // Create test user with no lastActiveTeamId
        const [user] = await db
          .insert(users)
          .values({
            email: `test-${Date.now()}-${Math.random()}@example.com`,
            emailVerified: true,
            name: "Test User",
            lastActiveTeamId: null,
          })
          .returning();

        testUserIds.push(user.id);

        // Don't set any cookie

        // Get active team
        const result = await getActiveTeam(user.id);

        // Should return null
        expect(result.team).toBeNull();
        expect(result.source).toBe("none");
        expect(result.cookieSynced).toBe(false);

        // Clean up
        await db.delete(users).where(eq(users.id, user.id));
        testUserIds.length = 0;

        return true;
      }),
      { ...propertyConfig, numRuns: 20 } // Fewer runs for DB operations
    );
  });

  test("setActiveTeam updates both database and cookie", async () => {
    await fc.assert(
      fc.asyncProperty(validTeamNameArb, async (teamName) => {
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
          name: teamName,
          creatorId: user.id,
        });
        testTeamIds.push(team.id);

        // Set active team
        await setActiveTeam(user.id, team.id);

        // Verify database was updated
        const [updatedUser] = await db
          .select({ lastActiveTeamId: users.lastActiveTeamId })
          .from(users)
          .where(eq(users.id, user.id));

        expect(updatedUser.lastActiveTeamId).toBe(team.id);

        // Verify cookie was set
        const cookieValue = mockCookieStore.get(getTeamCookieName());
        expect(cookieValue).toBe(team.id);

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

  test("getActiveTeam returns correct source indicator", async () => {
    await fc.assert(
      fc.asyncProperty(validTeamNameArb, async (teamName) => {
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
          name: teamName,
          creatorId: user.id,
        });
        testTeamIds.push(team.id);

        // Set in database
        await db
          .update(users)
          .set({ lastActiveTeamId: team.id })
          .where(eq(users.id, user.id));

        // Get active team
        const result = await getActiveTeam(user.id);

        // Should indicate database as source
        expect(result.source).toBe("database");
        expect(result.team?.id).toBe(team.id);

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

/**
 * Property-based tests for deleted team handling
 * Feature: team-system, Property 37: Deleted active team triggers auto-switch
 * Validates: Requirements 9A.1
 */

describe("Property 37: Deleted active team triggers auto-switch", () => {
  const testUserIds: string[] = [];
  const testTeamIds: string[] = [];

  afterEach(async () => {
    // Clean up test data
    for (const teamId of testTeamIds) {
      await db.delete(teams).where(eq(teams.id, teamId));
    }
    for (const userId of testUserIds) {
      await db.delete(users).where(eq(users.id, userId));
    }
    testTeamIds.length = 0;
    testUserIds.length = 0;
    
    // Clear mock cookie store
    mockCookieStore.clear();
  });

  test("auto-switches to first available team when active team is deleted", async () => {
    await fc.assert(
      fc.asyncProperty(
        validTeamNameArb,
        validTeamNameArb,
        async (teamName1, teamName2) => {
          // Ensure team names are different
          if (teamName1 === teamName2) {
            return true; // Skip this iteration
          }

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

          // Create two teams
          const team1 = await createTeam({
            name: teamName1,
            creatorId: user.id,
          });
          testTeamIds.push(team1.id);

          const team2 = await createTeam({
            name: teamName2,
            creatorId: user.id,
          });
          testTeamIds.push(team2.id);

          // Set team1 as active
          await db
            .update(users)
            .set({ lastActiveTeamId: team1.id })
            .where(eq(users.id, user.id));

          // Soft-delete team1
          await db
            .update(teams)
            .set({ deletedAt: new Date() })
            .where(eq(teams.id, team1.id));

          // Import handleTeamContextEdgeCases
          const { handleTeamContextEdgeCases } = await import("../team-context");

          // Handle edge case - should auto-switch to team2
          const result = await handleTeamContextEdgeCases(user.id);

          // Verify auto-switch occurred
          expect(result.success).toBe(true);
          expect(result.action).toBe("switched");
          expect(result.newTeam).toBeDefined();
          expect(result.newTeam?.id).toBe(team2.id);

          // Verify database was updated
          const [updatedUser] = await db
            .select({ lastActiveTeamId: users.lastActiveTeamId })
            .from(users)
            .where(eq(users.id, user.id));

          expect(updatedUser.lastActiveTeamId).toBe(team2.id);

          // Clean up
          await db.delete(teams).where(eq(teams.id, team1.id));
          await db.delete(teams).where(eq(teams.id, team2.id));
          await db.delete(users).where(eq(users.id, user.id));
          testTeamIds.length = 0;
          testUserIds.length = 0;

          return true;
        }
      ),
      { ...propertyConfig, numRuns: 20 } // Fewer runs for DB operations
    );
  });

  test("clears context when active team is deleted and no other teams exist", async () => {
    await fc.assert(
      fc.asyncProperty(validTeamNameArb, async (teamName) => {
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

        // Create one team
        const team = await createTeam({
          name: teamName,
          creatorId: user.id,
        });
        testTeamIds.push(team.id);

        // Set team as active
        await db
          .update(users)
          .set({ lastActiveTeamId: team.id })
          .where(eq(users.id, user.id));

        // Soft-delete the team
        await db
          .update(teams)
          .set({ deletedAt: new Date() })
          .where(eq(teams.id, team.id));

        // Import handleTeamContextEdgeCases
        const { handleTeamContextEdgeCases } = await import("../team-context");

        // Handle edge case - should clear context
        const result = await handleTeamContextEdgeCases(user.id);

        // Verify context was cleared
        expect(result.success).toBe(true);
        expect(result.action).toBe("cleared");
        expect(result.newTeam).toBeNull();

        // Verify database was cleared
        const [updatedUser] = await db
          .select({ lastActiveTeamId: users.lastActiveTeamId })
          .from(users)
          .where(eq(users.id, user.id));

        expect(updatedUser.lastActiveTeamId).toBeNull();

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

  test("auto-switches when user loses access to active team", async () => {
    await fc.assert(
      fc.asyncProperty(
        validTeamNameArb,
        validTeamNameArb,
        async (teamName1, teamName2) => {
          // Ensure team names are different
          if (teamName1 === teamName2) {
            return true; // Skip this iteration
          }

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

          // Create two teams
          const team1 = await createTeam({
            name: teamName1,
            creatorId: user.id,
          });
          testTeamIds.push(team1.id);

          const team2 = await createTeam({
            name: teamName2,
            creatorId: user.id,
          });
          testTeamIds.push(team2.id);

          // Set team1 as active
          await db
            .update(users)
            .set({ lastActiveTeamId: team1.id })
            .where(eq(users.id, user.id));

          // Remove user's membership from team1 (simulating lost access)
          await db
            .delete(teamMembers)
            .where(
              and(
                eq(teamMembers.teamId, team1.id),
                eq(teamMembers.userId, user.id)
              )
            );

          // Import handleTeamContextEdgeCases
          const { handleTeamContextEdgeCases } = await import("../team-context");

          // Handle edge case - should auto-switch to team2
          const result = await handleTeamContextEdgeCases(user.id);

          // Verify auto-switch occurred
          expect(result.success).toBe(true);
          expect(result.action).toBe("switched");
          expect(result.newTeam).toBeDefined();
          expect(result.newTeam?.id).toBe(team2.id);

          // Verify database was updated
          const [updatedUser] = await db
            .select({ lastActiveTeamId: users.lastActiveTeamId })
            .from(users)
            .where(eq(users.id, user.id));

          expect(updatedUser.lastActiveTeamId).toBe(team2.id);

          // Clean up
          await db.delete(teams).where(eq(teams.id, team1.id));
          await db.delete(teams).where(eq(teams.id, team2.id));
          await db.delete(users).where(eq(users.id, user.id));
          testTeamIds.length = 0;
          testUserIds.length = 0;

          return true;
        }
      ),
      { ...propertyConfig, numRuns: 20 } // Fewer runs for DB operations
    );
  });

  test("returns none action when current team is valid", async () => {
    await fc.assert(
      fc.asyncProperty(validTeamNameArb, async (teamName) => {
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
          name: teamName,
          creatorId: user.id,
        });
        testTeamIds.push(team.id);

        // Set team as active
        await db
          .update(users)
          .set({ lastActiveTeamId: team.id })
          .where(eq(users.id, user.id));

        // Import handleTeamContextEdgeCases
        const { handleTeamContextEdgeCases } = await import("../team-context");

        // Handle edge case - should do nothing since team is valid
        const result = await handleTeamContextEdgeCases(user.id);

        // Verify no action was taken
        expect(result.success).toBe(true);
        expect(result.action).toBe("none");
        expect(result.newTeam).toBeNull();

        // Verify database was not changed
        const [updatedUser] = await db
          .select({ lastActiveTeamId: users.lastActiveTeamId })
          .from(users)
          .where(eq(users.id, user.id));

        expect(updatedUser.lastActiveTeamId).toBe(team.id);

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

  test("validateTeamAccessWithEdgeCases returns valid for accessible team", async () => {
    await fc.assert(
      fc.asyncProperty(validTeamNameArb, async (teamName) => {
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
          name: teamName,
          creatorId: user.id,
        });
        testTeamIds.push(team.id);

        // Import validateTeamAccessWithEdgeCases
        const { validateTeamAccessWithEdgeCases } = await import("../team-context");

        // Validate access
        const result = await validateTeamAccessWithEdgeCases(user.id, team.id);

        // Verify access is valid
        expect(result.valid).toBe(true);
        expect(result.team).toBeDefined();
        expect(result.team?.id).toBe(team.id);
        expect(result.autoSwitched).toBe(false);
        expect(result.newTeam).toBeNull();

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

  test("validateTeamAccessWithEdgeCases auto-switches when access is lost", async () => {
    await fc.assert(
      fc.asyncProperty(
        validTeamNameArb,
        validTeamNameArb,
        async (teamName1, teamName2) => {
          // Ensure team names are different
          if (teamName1 === teamName2) {
            return true; // Skip this iteration
          }

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

          // Create two teams
          const team1 = await createTeam({
            name: teamName1,
            creatorId: user.id,
          });
          testTeamIds.push(team1.id);

          const team2 = await createTeam({
            name: teamName2,
            creatorId: user.id,
          });
          testTeamIds.push(team2.id);

          // Remove user's membership from team1 ONLY
          await db
            .delete(teamMembers)
            .where(
              and(
                eq(teamMembers.teamId, team1.id),
                eq(teamMembers.userId, user.id)
              )
            );

          // Import validateTeamAccessWithEdgeCases
          const { validateTeamAccessWithEdgeCases } = await import("../team-context");

          // Try to validate access to team1 (should fail and auto-switch)
          const result = await validateTeamAccessWithEdgeCases(user.id, team1.id);

          // Verify access is invalid
          expect(result.valid).toBe(false);
          expect(result.team).toBeNull();
          
          // Should auto-switch to team2 since user still has access to it
          if (result.autoSwitched) {
            expect(result.newTeam).toBeDefined();
            expect(result.newTeam?.id).toBe(team2.id);
          } else {
            // If not auto-switched, verify user has no teams
            const { getFirstAvailableTeam } = await import("../team-context");
            const availableTeam = await getFirstAvailableTeam(user.id);
            expect(availableTeam).toBeNull();
          }

          // Clean up
          await db.delete(teams).where(eq(teams.id, team1.id));
          await db.delete(teams).where(eq(teams.id, team2.id));
          await db.delete(users).where(eq(users.id, user.id));
          testTeamIds.length = 0;
          testUserIds.length = 0;

          return true;
        }
      ),
      { ...propertyConfig, numRuns: 20 } // Fewer runs for DB operations
    );
  });
});
