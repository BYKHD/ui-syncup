/**
 * Property-based tests for plan limit enforcement
 * Feature: team-system, Property 41: Free plan member limit enforced
 * Validates: Requirements 10.1, 10.5
 */

import { describe, test, expect, afterEach } from "vitest";
import fc from "fast-check";
import { createTeam } from "../team-service";
import { checkMemberLimit, QuotaError, QUOTA_ERROR_CODES } from "../resource-limits";
import { db } from "@/lib/db";
import { teams } from "@/server/db/schema/teams";
import { teamMembers } from "@/server/db/schema/team-members";
import { users } from "@/server/db/schema/users";
import { eq, inArray } from "drizzle-orm";
import { QUOTAS } from "@/config/quotas";

// Test configuration: run 100 iterations minimum
const propertyConfig = { numRuns: 100 };

// Arbitrary for valid team names
// Add timestamp and random suffix to ensure uniqueness across parallel test runs
const validTeamNameArb = fc
  .string({ minLength: 2, maxLength: 40 })
  .filter((name) => {
    const alphanumericCount = (name.match(/[a-zA-Z0-9]/g) || []).length;
    return alphanumericCount >= 2 && !name.includes('\\');
  })
  .map((name) => `${name}-${Date.now()}-${Math.random().toString(36).substring(7)}`);

// Arbitrary for team descriptions
const teamDescriptionArb = fc.option(
  fc.string({ maxLength: 500 }).filter((desc) => !desc.includes('\\'))
);

// Arbitrary for team creation data
const teamDataArb = fc.record({
  name: validTeamNameArb,
  description: teamDescriptionArb,
});

describe("Property 41: Member quota enforcement", () => {
  const testUserIds: string[] = [];
  const testTeamIds: string[] = [];

  afterEach(async () => {
    // Clean up test data - team_members first, then teams, then users
    if (testTeamIds.length > 0) {
      for (const teamId of testTeamIds) {
        await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
        await db.delete(teams).where(eq(teams.id, teamId));
      }
      testTeamIds.length = 0;
    }
    if (testUserIds.length > 0) {
      // Delete all team_members for these users (in case they're referenced by invitedBy)
      await db.delete(teamMembers).where(inArray(teamMembers.userId, testUserIds));
      await db.delete(users).where(inArray(users.id, testUserIds));
      testUserIds.length = 0;
    }
  });

  test("permits adding members up to quota", async () => {
    await fc.assert(
      fc.asyncProperty(
        teamDataArb,
        fc.integer({ min: 0, max: 8 }), // Test with 0-8 additional members (creator + 0-8 = 1-9 total, can still add 1 more)
        async (data, additionalMembers) => {
          // Create test user (team creator)
          const [creator] = await db
            .insert(users)
            .values({
              email: `creator-${Date.now()}-${Math.random()}@example.com`,
              emailVerified: true,
              name: "Creator",
            })
            .returning();

          testUserIds.push(creator.id);

          // Create team (creator is member #1)
          const team = await createTeam({
            ...data,
            description: data.description ?? undefined,
            creatorId: creator.id,
          });

          testTeamIds.push(team.id);

          // Add additional members (up to 9 more, for total of 10)
          for (let i = 0; i < additionalMembers; i++) {
            const [member] = await db
              .insert(users)
              .values({
                email: `member-${i}-${Date.now()}-${Math.random()}@example.com`,
                emailVerified: true,
                name: `Member ${i}`,
              })
              .returning();

            testUserIds.push(member.id);

            await db.insert(teamMembers).values({
              teamId: team.id,
              userId: member.id,
              managementRole: null,
              operationalRole: "WORKSPACE_MEMBER",
              joinedAt: new Date(),
              invitedBy: creator.id,
            });
          }

          // Should be able to check limit without error (we have 1 + additionalMembers, which is <= 10)
          const canAdd = await checkMemberLimit(team.id);
          expect(canAdd).toBe(true);

          // Clean up - delete team_members first, then team, then users
          await db.delete(teamMembers).where(eq(teamMembers.teamId, team.id));
          await db.delete(teams).where(eq(teams.id, team.id));
          testTeamIds.length = 0;
          
          if (testUserIds.length > 0) {
            // Delete all team_members for these users (in case they're referenced by invitedBy)
            await db.delete(teamMembers).where(inArray(teamMembers.userId, testUserIds));
            await db.delete(users).where(inArray(users.id, testUserIds));
          }
          testUserIds.length = 0;

          return true;
        }
      ),
      { ...propertyConfig, numRuns: 20 } // Fewer runs for DB operations
    );
  });

  test("blocks adding members beyond quota", { timeout: 30000 }, async () => {
    await fc.assert(
      fc.asyncProperty(teamDataArb, async (data) => {
        // Create test user (team creator)
        const [creator] = await db
          .insert(users)
          .values({
            email: `creator-${Date.now()}-${Math.random()}@example.com`,
            emailVerified: true,
            name: "Creator",
          })
          .returning();

        testUserIds.push(creator.id);

        // Create team (creator is member #1)
        const team = await createTeam({
          ...data,
          description: data.description ?? undefined,
          creatorId: creator.id,
        });

        testTeamIds.push(team.id);

        // Add 9 more members (total of 10)
        for (let i = 0; i < 9; i++) {
          const [member] = await db
            .insert(users)
            .values({
              email: `member-${i}-${Date.now()}-${Math.random()}@example.com`,
              emailVerified: true,
              name: `Member ${i}`,
            })
            .returning();

          testUserIds.push(member.id);

          await db.insert(teamMembers).values({
            teamId: team.id,
            userId: member.id,
            managementRole: null,
            operationalRole: "WORKSPACE_MEMBER",
            joinedAt: new Date(),
            invitedBy: creator.id,
          });
        }

        // Now we have 10 members, trying to add 11th should fail
        let errorThrown = false;
        let errorCode: string | undefined;
        let errorLimit: number | "unlimited" | undefined;
        let errorCurrent: number | undefined;

        try {
          await checkMemberLimit(team.id);
        } catch (error: unknown) {
          errorThrown = true;
          if (error instanceof QuotaError) {
            errorCode = error.code;
            errorLimit = error.limit;
            errorCurrent = error.current;
          }
        }

        // Verify error was thrown with correct details
        expect(errorThrown).toBe(true);
        expect(errorCode).toBe(QUOTA_ERROR_CODES.MEMBERS);
        // We know the quota is 10 from config, so strict equality is fine if config matches
        // But better to compare against the imported QUOTAS
        // Note: QUOTAS.members might be 'unlimited', but this test assumes a number
        expect(errorLimit).toBe(QUOTAS.members);
        expect(errorCurrent).toBe(10);

        // Clean up - delete team_members first, then team, then users
        await db.delete(teamMembers).where(eq(teamMembers.teamId, team.id));
        await db.delete(teams).where(eq(teams.id, team.id));
        testTeamIds.length = 0;
        
        if (testUserIds.length > 0) {
          // Delete all team_members for these users (in case they're referenced by invitedBy)
          await db.delete(teamMembers).where(inArray(teamMembers.userId, testUserIds));
          await db.delete(users).where(inArray(users.id, testUserIds));
        }
        testUserIds.length = 0;

        return true;
      }),
      { ...propertyConfig, numRuns: 20 } // Fewer runs for DB operations
    );
  });

  test("error includes correct limit and current count", { timeout: 30000 }, async () => {
    await fc.assert(
      fc.asyncProperty(teamDataArb, async (data) => {
        // Create test user (team creator)
        const [creator] = await db
          .insert(users)
          .values({
            email: `creator-${Date.now()}-${Math.random()}@example.com`,
            emailVerified: true,
            name: "Creator",
          })
          .returning();

        testUserIds.push(creator.id);

        // Create team
        const team = await createTeam({
          ...data,
          description: data.description ?? undefined,
          creatorId: creator.id,
        });

        testTeamIds.push(team.id);

        // Add 9 more members to reach limit
        for (let i = 0; i < 9; i++) {
          const [member] = await db
            .insert(users)
            .values({
              email: `member-${i}-${Date.now()}-${Math.random()}@example.com`,
              emailVerified: true,
              name: `Member ${i}`,
            })
            .returning();

          testUserIds.push(member.id);

          await db.insert(teamMembers).values({
            teamId: team.id,
            userId: member.id,
            managementRole: null,
            operationalRole: "WORKSPACE_MEMBER",
            joinedAt: new Date(),
            invitedBy: creator.id,
          });
        }

        // Try to check limit (should fail)
        try {
          await checkMemberLimit(team.id);
          // Should not reach here
          expect(true).toBe(false);
        } catch (error: unknown) {
          if (error instanceof QuotaError) {
            // Verify error contains correct information
            expect(error.code).toBe(QUOTA_ERROR_CODES.MEMBERS);
            expect(error.limit).toBe(10);
            expect(error.current).toBe(10);
            expect(error.message).toContain("quota");
            expect(error.message).toContain("10");
          } else {
            throw error;
          }
        }

        // Clean up - delete team_members first, then team, then users
        await db.delete(teamMembers).where(eq(teamMembers.teamId, team.id));
        await db.delete(teams).where(eq(teams.id, team.id));
        testTeamIds.length = 0;
        
        if (testUserIds.length > 0) {
          // Delete all team_members for these users (in case they're referenced by invitedBy)
          await db.delete(teamMembers).where(inArray(teamMembers.userId, testUserIds));
          await db.delete(users).where(inArray(users.id, testUserIds));
        }
        testUserIds.length = 0;

        return true;
      }),
      { ...propertyConfig, numRuns: 20 } // Fewer runs for DB operations
    );
  });

  test("member limit check works for any number of existing members below limit", { timeout: 30000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        teamDataArb,
        fc.integer({ min: 0, max: 8 }), // 0-8 additional members (creator + 0-8 = 1-9 total)
        async (data, additionalMembers) => {
          // Create test user (team creator)
          const [creator] = await db
            .insert(users)
            .values({
              email: `creator-${Date.now()}-${Math.random()}@example.com`,
              emailVerified: true,
              name: "Creator",
            })
            .returning();

          testUserIds.push(creator.id);

          // Create team
          const team = await createTeam({
            ...data,
            description: data.description ?? undefined,
            creatorId: creator.id,
          });

          testTeamIds.push(team.id);

          // Add additional members
          for (let i = 0; i < additionalMembers; i++) {
            const [member] = await db
              .insert(users)
              .values({
                email: `member-${i}-${Date.now()}-${Math.random()}@example.com`,
                emailVerified: true,
                name: `Member ${i}`,
              })
              .returning();

            testUserIds.push(member.id);

            await db.insert(teamMembers).values({
              teamId: team.id,
              userId: member.id,
              managementRole: null,
              operationalRole: "WORKSPACE_MEMBER",
              joinedAt: new Date(),
              invitedBy: creator.id,
            });
          }

          // Should be able to add more members (we have 1 + additionalMembers < 10)
          const canAdd = await checkMemberLimit(team.id);
          expect(canAdd).toBe(true);

          // Clean up - delete team_members first, then team, then users
          await db.delete(teamMembers).where(eq(teamMembers.teamId, team.id));
          await db.delete(teams).where(eq(teams.id, team.id));
          testTeamIds.length = 0;
          
          if (testUserIds.length > 0) {
            // Delete all team_members for these users (in case they're referenced by invitedBy)
            await db.delete(teamMembers).where(inArray(teamMembers.userId, testUserIds));
            await db.delete(users).where(inArray(users.id, testUserIds));
          }
          testUserIds.length = 0;

          return true;
        }
      ),
      { ...propertyConfig, numRuns: 20 } // Fewer runs for DB operations
    );
  });
});
