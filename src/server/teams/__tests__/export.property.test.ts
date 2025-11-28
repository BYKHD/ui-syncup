/**
 * Property-based tests for team data export
 * Feature: team-system, Property 22: Data export generates complete JSON
 * Validates: Requirements 5A.2
 */

import { describe, test, expect, afterEach, beforeEach } from "vitest";
import fc from "fast-check";
import { exportTeamData, clearExportRateLimit } from "../export-service";
import { createTeam } from "../team-service";
import { addMember } from "../member-service";
import { createInvitation } from "../invitation-service";
import { db } from "@/lib/db";
import { teams } from "@/server/db/schema/teams";
import { teamMembers } from "@/server/db/schema/team-members";
import { teamInvitations } from "@/server/db/schema/team-invitations";
import { users } from "@/server/db/schema/users";
import { projects } from "@/server/db/schema/projects";
import { eq, inArray } from "drizzle-orm";

// Test configuration: run 20 iterations for DB operations
const propertyConfig = { numRuns: 20 };

// Arbitrary for valid team names
const validTeamNameArb = fc
  .string({ minLength: 2, maxLength: 50 })
  .filter((name) => {
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

// Arbitrary for number of additional members (0-3)
const memberCountArb = fc.integer({ min: 0, max: 3 });

// Arbitrary for number of invitations (0-2)
const invitationCountArb = fc.integer({ min: 0, max: 2 });

// Arbitrary for number of projects (0-2)
const projectCountArb = fc.integer({ min: 0, max: 2 });

describe("Property 22: Data export generates complete JSON", () => {
  const testUserIds: string[] = [];
  const testTeamIds: string[] = [];
  const testProjectIds: string[] = [];

  beforeEach(() => {
    // Clear arrays before each test
    testUserIds.length = 0;
    testTeamIds.length = 0;
    testProjectIds.length = 0;
  });

  afterEach(async () => {
    // Clean up test data
    if (testProjectIds.length > 0) {
      await db.delete(projects).where(inArray(projects.id, testProjectIds));
      testProjectIds.length = 0;
    }
    if (testTeamIds.length > 0) {
      await db.delete(teams).where(inArray(teams.id, testTeamIds));
      testTeamIds.length = 0;
    }
    if (testUserIds.length > 0) {
      await db.delete(users).where(inArray(users.id, testUserIds));
      testUserIds.length = 0;
    }
  });

  test("export includes team metadata", async () => {
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

        // Clear rate limit for testing
        clearExportRateLimit(team.id);

        // Export team data
        const exportData = await exportTeamData(team.id, user.id);

        // Verify team metadata is present
        expect(exportData.team).toBeDefined();
        expect(exportData.team.id).toBe(team.id);
        expect(exportData.team.name).toBe(team.name);
        expect(exportData.team.slug).toBe(team.slug);
        expect(exportData.team.description).toBe(team.description);
        expect(exportData.team.planId).toBe("free");
        expect(exportData.team.createdAt).toBeDefined();
        expect(exportData.team.updatedAt).toBeDefined();

        return true;
      }),
      propertyConfig
    );
  });

  test("export includes all team members", async () => {
    await fc.assert(
      fc.asyncProperty(
        teamDataArb,
        memberCountArb,
        async (data, additionalMemberCount) => {
          // Create test owner
          const [owner] = await db
            .insert(users)
            .values({
              email: `owner-${Date.now()}-${Math.random()}@example.com`,
              emailVerified: true,
              name: "Team Owner",
            })
            .returning();

          testUserIds.push(owner.id);

          // Create team
          const team = await createTeam({
            ...data,
            description: data.description ?? undefined,
            creatorId: owner.id,
          });

          testTeamIds.push(team.id);

          // Add additional members
          const memberIds = [owner.id];
          for (let i = 0; i < additionalMemberCount; i++) {
            const [member] = await db
              .insert(users)
              .values({
                email: `member-${i}-${Date.now()}-${Math.random()}@example.com`,
                emailVerified: true,
                name: `Member ${i}`,
              })
              .returning();

            testUserIds.push(member.id);
            memberIds.push(member.id);

            await addMember({
              teamId: team.id,
              userId: member.id,
              operationalRole: "TEAM_MEMBER",
              addedBy: owner.id,
            });
          }

          // Clear rate limit for testing
          clearExportRateLimit(team.id);

          // Export team data
          const exportData = await exportTeamData(team.id, owner.id);

          // Verify all members are included
          expect(exportData.members).toBeDefined();
          expect(exportData.members).toHaveLength(memberIds.length);

          // Verify each member has required fields
          for (const exportedMember of exportData.members) {
            expect(exportedMember.id).toBeDefined();
            expect(exportedMember.userId).toBeDefined();
            expect(exportedMember.userEmail).toBeDefined();
            expect(exportedMember.operationalRole).toBeDefined();
            expect(exportedMember.joinedAt).toBeDefined();
            expect(memberIds).toContain(exportedMember.userId);
          }

          return true;
        }
      ),
      propertyConfig
    );
  });

  test("export includes all pending invitations", async () => {
    await fc.assert(
      fc.asyncProperty(
        teamDataArb,
        invitationCountArb,
        async (data, invitationCount) => {
          // Create test owner
          const [owner] = await db
            .insert(users)
            .values({
              email: `owner-${Date.now()}-${Math.random()}@example.com`,
              emailVerified: true,
              name: "Team Owner",
            })
            .returning();

          testUserIds.push(owner.id);

          // Create team
          const team = await createTeam({
            ...data,
            description: data.description ?? undefined,
            creatorId: owner.id,
          });

          testTeamIds.push(team.id);

          // Create invitations
          const invitationEmails: string[] = [];
          for (let i = 0; i < invitationCount; i++) {
            const email = `invite-${i}-${Date.now()}-${Math.random()}@example.com`;
            invitationEmails.push(email);

            await createInvitation({
              teamId: team.id,
              email,
              operationalRole: "TEAM_MEMBER",
              invitedBy: owner.id,
            });
          }

          // Clear rate limit for testing
          clearExportRateLimit(team.id);

          // Export team data
          const exportData = await exportTeamData(team.id, owner.id);

          // Verify all invitations are included
          expect(exportData.invitations).toBeDefined();
          expect(exportData.invitations).toHaveLength(invitationCount);

          // Verify each invitation has required fields
          for (const invitation of exportData.invitations) {
            expect(invitation.id).toBeDefined();
            expect(invitation.email).toBeDefined();
            expect(invitation.operationalRole).toBeDefined();
            expect(invitation.invitedBy).toBe(owner.id);
            expect(invitation.expiresAt).toBeDefined();
            expect(invitation.status).toBeDefined();
            expect(invitation.createdAt).toBeDefined();
            expect(invitationEmails).toContain(invitation.email);
          }

          return true;
        }
      ),
      propertyConfig
    );
  });

  test("export includes all projects", async () => {
    await fc.assert(
      fc.asyncProperty(
        teamDataArb,
        projectCountArb,
        async (data, projectCount) => {
          // Create test owner
          const [owner] = await db
            .insert(users)
            .values({
              email: `owner-${Date.now()}-${Math.random()}@example.com`,
              emailVerified: true,
              name: "Team Owner",
            })
            .returning();

          testUserIds.push(owner.id);

          // Create team
          const team = await createTeam({
            ...data,
            description: data.description ?? undefined,
            creatorId: owner.id,
          });

          testTeamIds.push(team.id);

          // Create projects
          const projectIds: string[] = [];
          for (let i = 0; i < projectCount; i++) {
            const [project] = await db
              .insert(projects)
              .values({
                name: `Project ${i}`,
                description: `Test project ${i}`,
                owner_id: owner.id,
                is_active: true,
              })
              .returning();

            projectIds.push(project.id);
            testProjectIds.push(project.id);
          }

          // Clear rate limit for testing
          clearExportRateLimit(team.id);

          // Export team data
          const exportData = await exportTeamData(team.id, owner.id);

          // Verify all projects are included
          expect(exportData.projects).toBeDefined();
          expect(exportData.projects).toHaveLength(projectCount);

          // Verify each project has required fields
          for (const project of exportData.projects) {
            expect(project.id).toBeDefined();
            expect(project.name).toBeDefined();
            expect(project.ownerId).toBe(owner.id);
            expect(project.isActive).toBeDefined();
            expect(project.createdAt).toBeDefined();
            expect(project.updatedAt).toBeDefined();
            expect(projectIds).toContain(project.id);
          }

          return true;
        }
      ),
      propertyConfig
    );
  });

  test("export includes metadata with timestamp and version", async () => {
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

        // Clear rate limit for testing
        clearExportRateLimit(team.id);

        // Export team data
        const exportData = await exportTeamData(team.id, user.id);

        // Verify export metadata
        expect(exportData.exportMetadata).toBeDefined();
        expect(exportData.exportMetadata.exportedAt).toBeDefined();
        expect(exportData.exportMetadata.exportedBy).toBe(user.id);
        expect(exportData.exportMetadata.version).toBe("1.0");

        // Verify timestamp is valid ISO string
        const timestamp = new Date(exportData.exportMetadata.exportedAt);
        expect(timestamp.toISOString()).toBe(
          exportData.exportMetadata.exportedAt
        );

        return true;
      }),
      propertyConfig
    );
  });

  test("export data is valid JSON serializable", async () => {
    await fc.assert(
      fc.asyncProperty(
        teamDataArb,
        memberCountArb,
        projectCountArb,
        async (data, memberCount, projectCount) => {
          // Create test owner
          const [owner] = await db
            .insert(users)
            .values({
              email: `owner-${Date.now()}-${Math.random()}@example.com`,
              emailVerified: true,
              name: "Team Owner",
            })
            .returning();

          testUserIds.push(owner.id);

          // Create team
          const team = await createTeam({
            ...data,
            description: data.description ?? undefined,
            creatorId: owner.id,
          });

          testTeamIds.push(team.id);

          // Add members
          for (let i = 0; i < memberCount; i++) {
            const [member] = await db
              .insert(users)
              .values({
                email: `member-${i}-${Date.now()}-${Math.random()}@example.com`,
                emailVerified: true,
                name: `Member ${i}`,
              })
              .returning();

            testUserIds.push(member.id);

            await addMember({
              teamId: team.id,
              userId: member.id,
              operationalRole: "TEAM_MEMBER",
              addedBy: owner.id,
            });
          }

          // Create projects
          for (let i = 0; i < projectCount; i++) {
            const [project] = await db
              .insert(projects)
              .values({
                name: `Project ${i}`,
                description: `Test project ${i}`,
                owner_id: owner.id,
                is_active: true,
              })
              .returning();

            testProjectIds.push(project.id);
          }

          // Clear rate limit for testing
          clearExportRateLimit(team.id);

          // Export team data
          const exportData = await exportTeamData(team.id, owner.id);

          // Verify data can be serialized to JSON and back
          const jsonString = JSON.stringify(exportData);
          expect(jsonString).toBeDefined();

          const parsed = JSON.parse(jsonString);
          expect(parsed).toBeDefined();
          expect(parsed.team.id).toBe(team.id);
          expect(parsed.members).toHaveLength(memberCount + 1); // +1 for owner
          expect(parsed.projects).toHaveLength(projectCount);

          return true;
        }
      ),
      propertyConfig
    );
  });

  test("export respects rate limiting", async () => {
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

        // Clear rate limit for testing
        clearExportRateLimit(team.id);

        // First export should succeed
        const firstExport = await exportTeamData(team.id, user.id);
        expect(firstExport).toBeDefined();

        // Second export immediately should fail due to rate limit
        await expect(exportTeamData(team.id, user.id)).rejects.toThrow(
          "rate limit"
        );

        // Clear rate limit for cleanup
        clearExportRateLimit(team.id);

        return true;
      }),
      propertyConfig
    );
  });
});
