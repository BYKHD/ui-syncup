/**
 * Property-based tests for team invitations
 * Feature: team-system
 * Validates: Requirements 2.1, 2.3, 2.5, 2A.5
 */

import { describe, test, expect, afterEach, vi } from "vitest";
import fc from "fast-check";
import { createInvitation, acceptInvitation } from "../invitation-service";
import { createTeam } from "../team-service";
import { db } from "@/lib/db";
import { teams } from "@/server/db/schema/teams";
import { teamMembers } from "@/server/db/schema/team-members";
import { teamInvitations } from "@/server/db/schema/team-invitations";
import { users } from "@/server/db/schema/users";
import { eq } from "drizzle-orm";

// Mock email queue
vi.mock("@/server/email", () => ({
  enqueueEmail: vi.fn().mockResolvedValue(undefined),
}));

// Test configuration
const propertyConfig = { numRuns: 20 };

// Arbitrary for valid team names
const validTeamNameArb = fc
  .string({ minLength: 2, maxLength: 50 })
  .filter((name) => (name.match(/[a-zA-Z0-9]/g) || []).length >= 2);

// Arbitrary for roles
const managementRoleArb = fc.constantFrom("TEAM_OWNER", "TEAM_ADMIN", null);
const operationalRoleArb = fc.constantFrom("TEAM_EDITOR", "TEAM_MEMBER", "TEAM_VIEWER");

describe("Team Invitation Properties", () => {
  const testUserIds: string[] = [];
  const testTeamIds: string[] = [];

  afterEach(async () => {
    // Clean up test data
    // Teams cleanup cascades to members and invitations
    for (const teamId of testTeamIds) {
      await db.delete(teams).where(eq(teams.id, teamId));
    }
    testTeamIds.length = 0;
    
    for (const userId of testUserIds) {
      await db.delete(users).where(eq(users.id, userId));
    }
    testUserIds.length = 0;
    
    vi.clearAllMocks();
  });

  test("Property 6: Invitations have 7-day expiration", async () => {
    await fc.assert(
      fc.asyncProperty(validTeamNameArb, async (teamName) => {
        // Setup: Create owner and team
        const [owner] = await db.insert(users).values({
          email: `owner-${Date.now()}-${Math.random()}@example.com`,
          emailVerified: true,
          name: "Owner",
        }).returning();
        testUserIds.push(owner.id);

        const team = await createTeam({
          name: teamName,
          creatorId: owner.id,
        });
        testTeamIds.push(team.id);

        // Action: Create invitation
        const email = `invitee-${Date.now()}-${Math.random()}@example.com`;
        const { invitation } = await createInvitation({
          teamId: team.id,
          email,
          operationalRole: "TEAM_MEMBER",
          invitedBy: owner.id,
        });

        // Verify expiration is roughly 7 days from now
        const now = new Date();
        const expectedExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        // Allow 1 minute variance
        const diff = Math.abs(invitation.expiresAt.getTime() - expectedExpiresAt.getTime());
        expect(diff).toBeLessThan(60 * 1000);

        return true;
      }),
      propertyConfig
    );
  });

  test("Property 7: Invitation acceptance adds user with correct roles", async () => {
    await fc.assert(
      fc.asyncProperty(validTeamNameArb, managementRoleArb, operationalRoleArb, async (teamName, mgmtRole, opRole) => {
        // Setup: Create owner and team
        const [owner] = await db.insert(users).values({
          email: `owner-${Date.now()}-${Math.random()}@example.com`,
          emailVerified: true,
          name: "Owner",
        }).returning();
        testUserIds.push(owner.id);

        const team = await createTeam({
          name: teamName,
          creatorId: owner.id,
        });
        testTeamIds.push(team.id);

        // Create user to accept invitation
        const [invitee] = await db.insert(users).values({
          email: `invitee-${Date.now()}-${Math.random()}@example.com`,
          emailVerified: true,
          name: "Invitee",
        }).returning();
        testUserIds.push(invitee.id);

        // Action: Create invitation
        const { token } = await createInvitation({
          teamId: team.id,
          email: invitee.email,
          managementRole: mgmtRole,
          operationalRole: opRole,
          invitedBy: owner.id,
        });

        // Action: Accept invitation
        await acceptInvitation(token, invitee.id);

        // Verify membership
        const member = await db.query.teamMembers.findFirst({
          where: eq(teamMembers.userId, invitee.id),
        });

        expect(member).toBeDefined();
        expect(member?.managementRole).toBe(mgmtRole);
        expect(member?.operationalRole).toBe(opRole);
        expect(member?.invitedBy).toBe(owner.id);

        return true;
      }),
      propertyConfig
    );
  });

  test("Property 9: Invalid invitations are rejected", async () => {
    await fc.assert(
      fc.asyncProperty(validTeamNameArb, async (teamName) => {
        // Setup: Create owner and team
        const [owner] = await db.insert(users).values({
          email: `owner-${Date.now()}-${Math.random()}@example.com`,
          emailVerified: true,
          name: "Owner",
        }).returning();
        testUserIds.push(owner.id);

        const team = await createTeam({
          name: teamName,
          creatorId: owner.id,
        });
        testTeamIds.push(team.id);

        // Create user to accept invitation
        const [invitee] = await db.insert(users).values({
          email: `invitee-${Date.now()}-${Math.random()}@example.com`,
          emailVerified: true,
          name: "Invitee",
        }).returning();
        testUserIds.push(invitee.id);

        // Action: Create invitation
        const { token } = await createInvitation({
          teamId: team.id,
          email: invitee.email,
          operationalRole: "TEAM_MEMBER",
          invitedBy: owner.id,
        });

        // Test invalid token
        await expect(acceptInvitation("invalid-token", invitee.id)).rejects.toThrow("Invalid invitation token");

        // Test already used token
        await acceptInvitation(token, invitee.id);
        await expect(acceptInvitation(token, invitee.id)).rejects.toThrow("Invitation already used");

        return true;
      }),
      propertyConfig
    );
  });

  test("Property 12: Invitation rate limiting enforced", async () => {
    await fc.assert(
      fc.asyncProperty(validTeamNameArb, async (teamName) => {
        // Setup: Create owner and team
        const [owner] = await db.insert(users).values({
          email: `owner-${Date.now()}-${Math.random()}@example.com`,
          emailVerified: true,
          name: "Owner",
        }).returning();
        testUserIds.push(owner.id);

        const team = await createTeam({
          name: teamName,
          creatorId: owner.id,
        });
        testTeamIds.push(team.id);

        // Action: Create 10 invitations (limit)
        for (let i = 0; i < 10; i++) {
          await createInvitation({
            teamId: team.id,
            email: `invitee-${i}-${Date.now()}@example.com`,
            operationalRole: "TEAM_MEMBER",
            invitedBy: owner.id,
          });
        }

        // Action: Create 11th invitation (should fail)
        await expect(createInvitation({
          teamId: team.id,
          email: `invitee-11-${Date.now()}@example.com`,
          operationalRole: "TEAM_MEMBER",
          invitedBy: owner.id,
        })).rejects.toThrow("Invitation rate limit exceeded");

        return true;
      }),
      { ...propertyConfig, numRuns: 5 } // Very few runs as this creates many DB records
    );
  });
});
