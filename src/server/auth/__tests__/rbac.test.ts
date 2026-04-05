/**
 * Property-based tests for RBAC (Role-Based Access Control) utilities
 *
 * These tests verify correctness properties across randomly generated inputs,
 * ensuring the RBAC implementation correctly handles role assignments and
 * permission checks via team_members and project_members.
 *
 * @module server/auth/__tests__/rbac
 */

import { describe, test, expect, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { db } from '@/lib/db';
import { users } from '@/server/db/schema/users';
import { teams } from '@/server/db/schema/teams';
import { teamMembers } from '@/server/db/schema/team-members';
import { eq, and } from 'drizzle-orm';
import {
  assignRole,
  getUserRoles,
} from '@/server/auth/rbac';
import {
  type Role,
  DEFAULT_ROLES,
  TEAM_ROLES,
  TEAM_OPERATIONAL_ROLES,
  PROJECT_ROLES,
} from '@/config/roles';

/**
 * Property test configuration
 */
const PROPERTY_CONFIG = {
  numRuns: 25,
  timeout: 30000,
};

const userNameArb = fc
  .string({ minLength: 1, maxLength: 120 })
  .filter((value) => value.trim().length > 0 && !value.includes("\\"));

let createdUserIds: string[] = [];
let createdTeamIds: string[] = [];

async function createTestUser(
  email: string,
  name: string,
  emailVerified = false
): Promise<string> {
  const [user] = await db
    .insert(users)
    .values({ email, emailVerified, name })
    .returning();
  createdUserIds.push(user.id);
  return user.id;
}

async function createTestTeam(): Promise<string> {
  const slug = `test-team-${crypto.randomUUID()}`;
  const [team] = await db
    .insert(teams)
    .values({ name: 'Test Team', slug })
    .returning();
  createdTeamIds.push(team.id);
  return team.id;
}

afterEach(async () => {
  // Delete teams first (cascades to team_members)
  for (const teamId of createdTeamIds) {
    try {
      await db.delete(teams).where(eq(teams.id, teamId));
    } catch {
      // ignore
    }
  }
  // Delete users (cascades to team_members, project_members, sessions, etc.)
  for (const userId of createdUserIds) {
    try {
      await db.delete(users).where(eq(users.id, userId));
    } catch {
      // ignore
    }
  }
  createdUserIds = [];
  createdTeamIds = [];
});

describe('RBAC - Property-Based Tests', () => {
  /**
   * Feature: authentication-system, Property 18: Verified users receive default roles
   * Validates: Requirements 7.1
   *
   * Since DEFAULT_ROLES are null, a new user has no roles. Once a team is
   * created and a role is assigned via assignRole, getUserRoles must reflect it.
   */
  test('Property 18: Verified users receive default roles', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        userNameArb,
        async (email, name) => {
          const uniqueEmail = `${Date.now()}-${Math.random()}-${email}`;
          const userId = await createTestUser(uniqueEmail, name, true);

          // No roles yet
          const roles = await getUserRoles(userId);
          expect(roles).toEqual([]);

          expect(DEFAULT_ROLES.team).toBeNull();
          expect(DEFAULT_ROLES.project).toBeNull();

          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);
          expect(user).toBeDefined();
          expect(user.emailVerified).toBe(true);

          // Assign an operational role — requires a real team
          const teamId = await createTestTeam();
          const testRole = TEAM_ROLES.TEAM_MEMBER;

          await assignRole({
            userId,
            role: testRole,
            resourceType: 'team',
            resourceId: teamId,
          });

          const rolesAfterAssignment = await getUserRoles(userId);
          // getUserRoles returns one entry per role column; TEAM_MEMBER is
          // an operational role so there is exactly one entry (no management role)
          expect(rolesAfterAssignment).toHaveLength(1);
          expect(rolesAfterAssignment[0].role).toBe(testRole);
          expect(rolesAfterAssignment[0].userId).toBe(userId);
          expect(rolesAfterAssignment[0].resourceType).toBe('team');
          expect(rolesAfterAssignment[0].resourceId).toBe(teamId);
        }
      ),
      PROPERTY_CONFIG
    );
  }, 60000);

  /**
   * Property: Role assignment is idempotent
   *
   * Assigning the same operational role twice should not create duplicate
   * records and should return the same membership id both times.
   *
   * (Restricted to operational roles because management roles create a
   * separate column and would yield two getUserRoles entries.)
   */
  test('Property: Role assignment is idempotent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        userNameArb,
        fc.constantFrom(...Object.values(TEAM_OPERATIONAL_ROLES)),
        async (email, name, role) => {
          const uniqueEmail = `${Date.now()}-${Math.random()}-${email}`;
          const userId = await createTestUser(uniqueEmail, name, true);
          const teamId = await createTestTeam();

          const role1 = await assignRole({
            userId,
            role: role as Role,
            resourceType: 'team',
            resourceId: teamId,
          });

          const role2 = await assignRole({
            userId,
            role: role as Role,
            resourceType: 'team',
            resourceId: teamId,
          });

          // Idempotent: same underlying record id
          expect(role2.id).toBe(role1.id);

          // Only one team_members row, no management role set → one getUserRoles entry
          const roles = await getUserRoles(userId);
          expect(roles).toHaveLength(1);
        }
      ),
      { numRuns: 50, timeout: 30000 }
    );
  }, 60000);

  /**
   * Property: Role assignment validates role type
   *
   * Team roles on team resources and project roles on project resources
   * must succeed. Mismatched types must throw.
   */
  test('Property: Role assignment validates role type', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        userNameArb,
        async (email, name) => {
          const uniqueEmail = `${Date.now()}-${Math.random()}-${email}`;
          const userId = await createTestUser(uniqueEmail, name, true);
          const teamId = await createTestTeam();
          // Use a random UUID for project — the validation throw happens before
          // the DB insert for cross-type errors, so no real project needed.
          const projectId = crypto.randomUUID();

          // Valid: team role on team resource
          const teamRole = await assignRole({
            userId,
            role: TEAM_ROLES.TEAM_MEMBER,
            resourceType: 'team',
            resourceId: teamId,
          });
          expect(teamRole).toBeDefined();

          // Invalid: team role on project resource — throws before DB
          await expect(
            assignRole({
              userId,
              role: TEAM_ROLES.TEAM_MEMBER,
              resourceType: 'project',
              resourceId: projectId,
            })
          ).rejects.toThrow('is not a project role');

          // Invalid: project role on team resource — throws before DB
          await expect(
            assignRole({
              userId,
              role: PROJECT_ROLES.PROJECT_VIEWER,
              resourceType: 'team',
              resourceId: teamId,
            })
          ).rejects.toThrow('is not a team role');
        }
      ),
      { numRuns: 20, timeout: 30000 }
    );
  }, 60000);

  /**
   * Property: Multiple users can have the same role
   *
   * Any number of users can hold the same role on the same team.
   * Each user's role is independent.
   */
  test('Property: Multiple users can have the same role', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.emailAddress(), { minLength: 2, maxLength: 5 }),
        fc.array(userNameArb, { minLength: 2, maxLength: 5 }),
        fc.constantFrom(...Object.values(TEAM_OPERATIONAL_ROLES)),
        async (emails, names, role) => {
          const userCount = Math.min(emails.length, names.length);
          const uniqueEmails = [...new Set(emails.slice(0, userCount))];
          fc.pre(uniqueEmails.length >= 2);

          const teamId = await createTestTeam();
          const userIds: string[] = [];

          for (let i = 0; i < uniqueEmails.length; i++) {
            const uniqueEmail = `${Date.now()}-${Math.random()}-${uniqueEmails[i]}`;
            const userId = await createTestUser(uniqueEmail, names[i], true);
            userIds.push(userId);

            await assignRole({
              userId,
              role: role as Role,
              resourceType: 'team',
              resourceId: teamId,
            });
          }

          // Verify all users have the role
          for (const userId of userIds) {
            const roles = await getUserRoles(userId);
            expect(roles).toHaveLength(1);
            expect(roles[0].role).toBe(role);
            expect(roles[0].resourceId).toBe(teamId);
          }

          // Verify count in team_members
          const allMembers = await db
            .select()
            .from(teamMembers)
            .where(
              and(
                eq(teamMembers.operationalRole, role as string),
                eq(teamMembers.teamId, teamId)
              )
            );

          expect(allMembers.length).toBe(uniqueEmails.length);
        }
      ),
      { numRuns: 20, timeout: 30000 }
    );
  }, 60000);

  /**
   * Edge case: Unverified users can still have roles assigned
   */
  test('Edge case: Unverified users can have roles assigned', async () => {
    const userId = await createTestUser('unverified@example.com', 'Unverified User', false);
    const teamId = await createTestTeam();

    const role = await assignRole({
      userId,
      role: TEAM_ROLES.TEAM_MEMBER,
      resourceType: 'team',
      resourceId: teamId,
    });

    expect(role).toBeDefined();
    expect(role.userId).toBe(userId);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    expect(user.emailVerified).toBe(false);
  });

  /**
   * Edge case: Invalid role throws error
   */
  test('Edge case: Invalid role throws error', async () => {
    const userId = await createTestUser('test@example.com', 'Test User', true);
    const teamId = await createTestTeam();

    await expect(
      assignRole({
        userId,
        role: 'INVALID_ROLE' as Role,
        resourceType: 'team',
        resourceId: teamId,
      })
    ).rejects.toThrow('Invalid role');
  });

  /**
   * Edge case: User can have multiple roles in different resources
   */
  test('Edge case: User can have multiple roles in different resources', async () => {
    const userId = await createTestUser('multi@example.com', 'Multi Role User', true);

    const team1Id = await createTestTeam();
    const team2Id = await createTestTeam();

    await assignRole({ userId, role: TEAM_ROLES.TEAM_EDITOR, resourceType: 'team', resourceId: team1Id });
    await assignRole({ userId, role: TEAM_ROLES.TEAM_MEMBER, resourceType: 'team', resourceId: team2Id });

    const roles = await getUserRoles(userId);

    const teamRoles = roles.filter((r) => r.resourceType === 'team');
    expect(teamRoles).toHaveLength(2);

    const team1Role = teamRoles.find((r) => r.resourceId === team1Id);
    const team2Role = teamRoles.find((r) => r.resourceId === team2Id);

    expect(team1Role?.role).toBe(TEAM_ROLES.TEAM_EDITOR);
    expect(team2Role?.role).toBe(TEAM_ROLES.TEAM_MEMBER);
  });
});
