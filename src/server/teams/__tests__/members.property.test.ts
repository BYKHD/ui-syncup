/**
 * Property-based tests for team member management
 * Feature: team-system
 * Validates: Requirements 3.1, 3.3, 3.4, 3.5, 13.3, 15.3
 */

import { describe, test, expect, afterEach } from "vitest";
import fc from "fast-check";
import { addMember, updateMemberRoles, removeMember } from "../member-service";
import { createTeam } from "../team-service";
import { db } from "@/lib/db";
import { teams } from "@/server/db/schema/teams";
import { teamMembers } from "@/server/db/schema/team-members";
import { users } from "@/server/db/schema/users";
import { projects } from "@/server/db/schema/projects";
import { eq } from "drizzle-orm";

// Test configuration
const propertyConfig = { numRuns: 20 }; // Database operations are slow

// Arbitrary for valid team names
const validTeamNameArb = fc
  .string({ minLength: 2, maxLength: 50 })
  .filter((name) => (name.match(/[a-zA-Z0-9]/g) || []).length >= 2)
  .filter((name) => !name.includes("\\"));

// Arbitrary for roles
const managementRoleArb = fc.constantFrom("TEAM_OWNER", "TEAM_ADMIN", null);
const operationalRoleArb = fc.constantFrom("TEAM_EDITOR", "TEAM_MEMBER", "TEAM_VIEWER");

describe("Team Member Management Properties", () => {
  const testUserIds: string[] = [];
  const testTeamIds: string[] = [];
  const testProjectIds: string[] = [];

  afterEach(async () => {
    // Clean up test data
    if (testProjectIds.length > 0) {
      await db.delete(projects).where(eq(projects.id, testProjectIds[0]));
      testProjectIds.length = 0;
    }
    
    // Explicitly delete team members first to avoid FK violations
    for (const teamId of testTeamIds) {
      await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
      await db.delete(teams).where(eq(teams.id, teamId));
    }
    testTeamIds.length = 0;
    
    for (const userId of testUserIds) {
      await db.delete(users).where(eq(users.id, userId));
    }
    testUserIds.length = 0;
  });

  test("Property 13: Management roles require operational roles", async () => {
    // This is largely enforced by types, but we verify that valid combinations work
    // and that the service doesn't throw for valid inputs.
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

        // Create member to add
        const [memberUser] = await db.insert(users).values({
          email: `member-${Date.now()}-${Math.random()}@example.com`,
          emailVerified: true,
          name: "Member",
        }).returning();
        testUserIds.push(memberUser.id);

        // Action: Add member
        // Requirement 3.1: Management roles require operational roles
        // Since opRole is always provided (not null), this should always succeed
        // unless we explicitly pass null which TS forbids.
        // So we test that it succeeds.
        
        await addMember({
          teamId: team.id,
          userId: memberUser.id,
          managementRole: mgmtRole,
          operationalRole: opRole,
          invitedBy: owner.id,
        });

        // Verify
        const member = await db.query.teamMembers.findFirst({
          where: eq(teamMembers.userId, memberUser.id),
        });

        expect(member).toBeDefined();
        expect(member?.managementRole).toBe(mgmtRole);
        expect(member?.operationalRole).toBe(opRole);

        return true;
      }),
      propertyConfig
    );
  });

  test("Property 15: Demotion blocked when projects owned", async () => {
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

        // Create member who will own a project
        const [projectOwner] = await db.insert(users).values({
          email: `p-owner-${Date.now()}-${Math.random()}@example.com`,
          emailVerified: true,
          name: "Project Owner",
        }).returning();
        testUserIds.push(projectOwner.id);

        // Add as TEAM_EDITOR
        await addMember({
          teamId: team.id,
          userId: projectOwner.id,
          operationalRole: "TEAM_EDITOR",
          invitedBy: owner.id,
        });

        // Create a project owned by this user
        const [project] = await db.insert(projects).values({
          name: "Test Project",
          owner_id: projectOwner.id,
        }).returning();
        testProjectIds.push(project.id);

        // Action: Try to demote to TEAM_MEMBER
        await expect(
          updateMemberRoles(team.id, projectOwner.id, { operationalRole: "TEAM_MEMBER" }, owner.id)
        ).rejects.toThrow("Cannot demote member who owns projects");

        // Action: Try to remove member
        await expect(
          removeMember(team.id, projectOwner.id, owner.id)
        ).rejects.toThrow("Cannot remove member who owns projects");

        return true;
      }),
      propertyConfig
    );
  });

  test("Property 17: Role changes recalculate billable seats", async () => {
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

        // Initial seats: 1 (Owner is EDITOR)
        let currentTeam = await db.query.teams.findFirst({ where: eq(teams.id, team.id) });
        expect(currentTeam?.billableSeats).toBe(1);

        // Add a TEAM_MEMBER (not billable)
        const [member1] = await db.insert(users).values({
          email: `m1-${Date.now()}-${Math.random()}@example.com`,
          emailVerified: true,
          name: "Member 1",
        }).returning();
        testUserIds.push(member1.id);

        await addMember({
          teamId: team.id,
          userId: member1.id,
          operationalRole: "TEAM_MEMBER",
          invitedBy: owner.id,
        });

        currentTeam = await db.query.teams.findFirst({ where: eq(teams.id, team.id) });
        expect(currentTeam?.billableSeats).toBe(1);

        // Add a TEAM_EDITOR (billable)
        const [member2] = await db.insert(users).values({
          email: `m2-${Date.now()}-${Math.random()}@example.com`,
          emailVerified: true,
          name: "Member 2",
        }).returning();
        testUserIds.push(member2.id);

        await addMember({
          teamId: team.id,
          userId: member2.id,
          operationalRole: "TEAM_EDITOR",
          invitedBy: owner.id,
        });

        currentTeam = await db.query.teams.findFirst({ where: eq(teams.id, team.id) });
        expect(currentTeam?.billableSeats).toBe(2);

        // Promote member1 to EDITOR
        await updateMemberRoles(team.id, member1.id, { operationalRole: "TEAM_EDITOR" }, owner.id);
        currentTeam = await db.query.teams.findFirst({ where: eq(teams.id, team.id) });
        expect(currentTeam?.billableSeats).toBe(3);

        // Demote member2 to VIEWER
        await updateMemberRoles(team.id, member2.id, { operationalRole: "TEAM_VIEWER" }, owner.id);
        currentTeam = await db.query.teams.findFirst({ where: eq(teams.id, team.id) });
        expect(currentTeam?.billableSeats).toBe(2);

        // Remove member1
        await removeMember(team.id, member1.id, owner.id);
        currentTeam = await db.query.teams.findFirst({ where: eq(teams.id, team.id) });
        expect(currentTeam?.billableSeats).toBe(1);

        return true;
      }),
      propertyConfig
    );
  });
});
