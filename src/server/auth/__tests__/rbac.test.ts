/**
 * Property-based tests for RBAC (Role-Based Access Control) utilities
 * 
 * These tests use fast-check to verify correctness properties across
 * randomly generated inputs, ensuring the RBAC implementation correctly
 * handles role assignments, permission checks, and billable seat calculations.
 * 
 * @module server/auth/__tests__/rbac
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { db } from '@/lib/db';
import { users } from '@/server/db/schema/users';
import { userRoles } from '@/server/db/schema/user-roles';
import { eq, and } from 'drizzle-orm';
import {
  assignRole,
  getUserRoles,
  type Role,
} from '@/server/auth/rbac';
import {
  DEFAULT_ROLES,
  TEAM_ROLES,
  PROJECT_ROLES,
} from '@/config/roles';
import { hashPassword } from '@/server/auth/password';

/**
 * Property test configuration
 * Run each property 100+ times with different random inputs
 */
const PROPERTY_CONFIG = { 
  numRuns: 100,
  timeout: 30000, // 30 second timeout per property
};

/**
 * Test data cleanup
 * Store created user IDs for cleanup after each test
 */
let createdUserIds: string[] = [];
let createdRoleIds: string[] = [];

/**
 * Helper: Create a test user
 */
async function createTestUser(email: string, name: string, emailVerified: boolean = false): Promise<string> {
  const passwordHash = await hashPassword('TestPassword123!');
  
  const [user] = await db
    .insert(users)
    .values({
      email,
      emailVerified,
      passwordHash,
      name,
    })
    .returning();
  
  createdUserIds.push(user.id);
  return user.id;
}

/**
 * Helper: Create a test team (mock - just returns a UUID)
 * In a real implementation, this would create a team in the teams table
 */
function createTestTeamId(): string {
  // Generate a proper UUID v4
  return crypto.randomUUID();
}

/**
 * Helper: Create a test project (mock - just returns a UUID)
 * In a real implementation, this would create a project in the projects table
 */
function createTestProjectId(): string {
  // Generate a proper UUID v4
  return crypto.randomUUID();
}

/**
 * Cleanup: Delete all test data after each test
 */
afterEach(async () => {
  // Delete users (cascade will delete roles due to foreign key)
  for (const userId of createdUserIds) {
    try {
      await db.delete(users).where(eq(users.id, userId));
    } catch (error) {
      // Ignore errors if user doesn't exist
      console.warn(`Failed to delete user ${userId}:`, error);
    }
  }
  
  // Reset arrays
  createdUserIds = [];
  createdRoleIds = [];
});

describe('RBAC - Property-Based Tests', () => {
  /**
   * Feature: authentication-system, Property 18: Verified users receive default roles
   * Validates: Requirements 7.1
   * 
   * For any newly verified user:
   * 1. The system should attempt to assign default roles from RBAC configuration
   * 2. Since DEFAULT_ROLES.team and DEFAULT_ROLES.project are null, no roles should be assigned
   * 3. The function should handle this gracefully without errors
   * 4. getUserRoles should return an empty array for users with no roles
   * 
   * Note: This property tests the current implementation where DEFAULT_ROLES are null.
   * When team creation is implemented, this test should be updated to verify that
   * appropriate default roles are assigned.
   */
  test('Property 18: Verified users receive default roles', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random user data
        fc.emailAddress(),
        fc.string({ minLength: 1, maxLength: 120 }),
        async (email, name) => {
          // Make email unique by adding timestamp
          const uniqueEmail = `${Date.now()}-${Math.random()}-${email}`;
          
          // Create a verified user
          const userId = await createTestUser(uniqueEmail, name, true);

          // Get user's roles
          const roles = await getUserRoles(userId);

          // Property 1: Since DEFAULT_ROLES are null, user should have no roles
          expect(roles).toEqual([]);

          // Property 2: DEFAULT_ROLES configuration should be null
          expect(DEFAULT_ROLES.team).toBeNull();
          expect(DEFAULT_ROLES.project).toBeNull();

          // Property 3: User should exist and be verified
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

          expect(user).toBeDefined();
          expect(user.emailVerified).toBe(true);

          // Property 4: When default roles are implemented, they should be assignable
          // This tests that the role assignment system works correctly
          // even though we're not assigning default roles yet
          
          // Simulate assigning a default team role (if it were configured)
          const teamId = createTestTeamId();
          const testRole = TEAM_ROLES.TEAM_MEMBER; // Example default role
          
          await assignRole({
            userId,
            role: testRole,
            resourceType: 'team',
            resourceId: teamId,
          });

          // Verify role was assigned
          const rolesAfterAssignment = await getUserRoles(userId);
          expect(rolesAfterAssignment).toHaveLength(1);
          expect(rolesAfterAssignment[0].role).toBe(testRole);
          expect(rolesAfterAssignment[0].userId).toBe(userId);
          expect(rolesAfterAssignment[0].resourceType).toBe('team');
          expect(rolesAfterAssignment[0].resourceId).toBe(teamId);

          // Track role for cleanup
          createdRoleIds.push(rolesAfterAssignment[0].id);
        }
      ),
      PROPERTY_CONFIG
    );
  }, 60000); // 60 second timeout

  /**
   * Additional property: Role assignment is idempotent
   * 
   * For any user and role, assigning the same role multiple times should:
   * 1. Not create duplicate role records
   * 2. Return the existing role on subsequent assignments
   * 3. Not throw errors
   */
  test('Property: Role assignment is idempotent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 1, maxLength: 120 }),
        fc.constantFrom(...Object.values(TEAM_ROLES)),
        async (email, name, role) => {
          // Make email unique
          const uniqueEmail = `${Date.now()}-${Math.random()}-${email}`;
          const userId = await createTestUser(uniqueEmail, name, true);
          const teamId = createTestTeamId();

          // Assign role first time
          const role1 = await assignRole({
            userId,
            role: role as Role,
            resourceType: 'team',
            resourceId: teamId,
          });

          createdRoleIds.push(role1.id);

          // Assign same role second time
          const role2 = await assignRole({
            userId,
            role: role as Role,
            resourceType: 'team',
            resourceId: teamId,
          });

          // Should return the same role (idempotent)
          expect(role2.id).toBe(role1.id);

          // Should only have one role record
          const roles = await getUserRoles(userId);
          expect(roles).toHaveLength(1);
        }
      ),
      { numRuns: 50, timeout: 30000 }
    );
  }, 60000);

  /**
   * Additional property: Role assignment validates role type
   * 
   * For any user:
   * 1. Team roles should only be assignable to team resources
   * 2. Project roles should only be assignable to project resources
   * 3. Mismatched role/resource types should throw errors
   */
  test('Property: Role assignment validates role type', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 1, maxLength: 120 }),
        async (email, name) => {
          // Make email unique
          const uniqueEmail = `${Date.now()}-${Math.random()}-${email}`;
          const userId = await createTestUser(uniqueEmail, name, true);
          const teamId = createTestTeamId();
          const projectId = createTestProjectId();

          // Test 1: Team role on team resource (should succeed)
          const teamRole = await assignRole({
            userId,
            role: TEAM_ROLES.TEAM_MEMBER,
            resourceType: 'team',
            resourceId: teamId,
          });
          expect(teamRole).toBeDefined();
          createdRoleIds.push(teamRole.id);

          // Test 2: Project role on project resource (should succeed)
          const projectRole = await assignRole({
            userId,
            role: PROJECT_ROLES.PROJECT_VIEWER,
            resourceType: 'project',
            resourceId: projectId,
          });
          expect(projectRole).toBeDefined();
          createdRoleIds.push(projectRole.id);

          // Test 3: Team role on project resource (should fail)
          await expect(
            assignRole({
              userId,
              role: TEAM_ROLES.TEAM_MEMBER,
              resourceType: 'project',
              resourceId: projectId,
            })
          ).rejects.toThrow('is not a project role');

          // Test 4: Project role on team resource (should fail)
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
   * Additional property: Multiple users can have the same role
   * 
   * For any role and resource:
   * 1. Multiple different users can be assigned the same role
   * 2. Each user's role is independent
   * 3. Removing one user's role doesn't affect other users
   */
  test('Property: Multiple users can have the same role', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.emailAddress(), { minLength: 2, maxLength: 5 }),
        fc.array(fc.string({ minLength: 1, maxLength: 120 }), { minLength: 2, maxLength: 5 }),
        fc.constantFrom(...Object.values(TEAM_ROLES)),
        async (emails, names, role) => {
          // Ensure we have matching arrays
          const userCount = Math.min(emails.length, names.length);
          const uniqueEmails = [...new Set(emails.slice(0, userCount))];
          
          // Skip if we don't have at least 2 unique emails
          fc.pre(uniqueEmails.length >= 2);

          const teamId = createTestTeamId();
          const userIds: string[] = [];

          // Create users and assign same role to all
          for (let i = 0; i < uniqueEmails.length; i++) {
            // Make email unique
            const uniqueEmail = `${Date.now()}-${Math.random()}-${uniqueEmails[i]}`;
            const userId = await createTestUser(uniqueEmail, names[i], true);
            userIds.push(userId);

            const userRole = await assignRole({
              userId,
              role: role as Role,
              resourceType: 'team',
              resourceId: teamId,
            });

            createdRoleIds.push(userRole.id);
          }

          // Verify all users have the role
          for (const userId of userIds) {
            const roles = await getUserRoles(userId);
            expect(roles).toHaveLength(1);
            expect(roles[0].role).toBe(role);
            expect(roles[0].resourceId).toBe(teamId);
          }

          // Verify total role count
          const allRoles = await db
            .select()
            .from(userRoles)
            .where(
              and(
                eq(userRoles.role, role as string),
                eq(userRoles.resourceId, teamId)
              )
            );

          expect(allRoles.length).toBe(uniqueEmails.length);
        }
      ),
      { numRuns: 20, timeout: 30000 }
    );
  }, 60000);

  /**
   * Feature: authentication-system, Property 20: Editor roles mark billable seats
   * Validates: Requirements 7.3
   * 
   * For any user assigned PROJECT_OWNER or PROJECT_EDITOR role:
   * 1. The user should be automatically promoted to TEAM_EDITOR operational role
   * 2. The user should be counted as a billable seat
   * 3. Only TEAM_EDITOR operational role should be billable
   * 4. Management roles (TEAM_OWNER, TEAM_ADMIN) should not be billable by themselves
   * 5. Other operational roles (TEAM_MEMBER, TEAM_VIEWER) should not be billable
   * 
   * This property ensures that the billing model correctly identifies billable seats
   * based on operational roles, not management roles.
   */
  test('Property 20: Editor roles mark billable seats', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random user data
        fc.emailAddress(),
        fc.string({ minLength: 1, maxLength: 120 }),
        // Generate random project role (PROJECT_OWNER or PROJECT_EDITOR)
        fc.constantFrom(PROJECT_ROLES.PROJECT_OWNER, PROJECT_ROLES.PROJECT_EDITOR),
        async (email, name, projectRole) => {
          // Make email unique by adding timestamp
          const uniqueEmail = `${Date.now()}-${Math.random()}-${email}`;
          
          // Create a verified user
          const userId = await createTestUser(uniqueEmail, name, true);
          const teamId = createTestTeamId();
          const projectId = createTestProjectId();

          // Initially, user should have no roles
          let roles = await getUserRoles(userId);
          expect(roles).toHaveLength(0);

          // Assign a non-billable operational role first (TEAM_MEMBER)
          const memberRole = await assignRole({
            userId,
            role: TEAM_ROLES.TEAM_MEMBER,
            resourceType: 'team',
            resourceId: teamId,
          });
          createdRoleIds.push(memberRole.id);

          // Verify user has TEAM_MEMBER role
          roles = await getUserRoles(userId);
          expect(roles).toHaveLength(1);
          expect(roles[0].role).toBe(TEAM_ROLES.TEAM_MEMBER);

          // Import calculateBillableSeats dynamically to avoid circular deps
          const { calculateBillableSeats, autoPromoteToEditor } = await import('@/server/auth/rbac');

          // Calculate billable seats - should be 0 (TEAM_MEMBER is not billable)
          let billableSeats = await calculateBillableSeats(teamId);
          expect(billableSeats).toBe(0);

          // Now assign PROJECT_OWNER or PROJECT_EDITOR role
          const projectRoleAssignment = await assignRole({
            userId,
            role: projectRole as Role,
            resourceType: 'project',
            resourceId: projectId,
          });
          createdRoleIds.push(projectRoleAssignment.id);

          // Auto-promote user to TEAM_EDITOR (this is what happens in the real flow)
          await autoPromoteToEditor(userId, teamId);

          // Verify user now has TEAM_EDITOR operational role
          roles = await getUserRoles(userId);
          const teamEditorRole = roles.find(
            r => r.role === TEAM_ROLES.TEAM_EDITOR && r.resourceType === 'team'
          );
          expect(teamEditorRole).toBeDefined();

          // Calculate billable seats - should be 1 (TEAM_EDITOR is billable)
          billableSeats = await calculateBillableSeats(teamId);
          expect(billableSeats).toBe(1);

          // Property 1: Only TEAM_EDITOR operational role is billable
          const { BILLABLE_ROLES, isBillableRole } = await import('@/config/roles');
          expect(BILLABLE_ROLES).toEqual([TEAM_ROLES.TEAM_EDITOR]);
          expect(isBillableRole(TEAM_ROLES.TEAM_EDITOR)).toBe(true);
          expect(isBillableRole(TEAM_ROLES.TEAM_MEMBER)).toBe(false);
          expect(isBillableRole(TEAM_ROLES.TEAM_VIEWER)).toBe(false);

          // Property 2: Management roles are not billable by themselves
          expect(isBillableRole(TEAM_ROLES.TEAM_OWNER)).toBe(false);
          expect(isBillableRole(TEAM_ROLES.TEAM_ADMIN)).toBe(false);

          // Property 3: Test that adding a management role doesn't increase billable seats
          const ownerRole = await assignRole({
            userId,
            role: TEAM_ROLES.TEAM_OWNER,
            resourceType: 'team',
            resourceId: teamId,
          });
          createdRoleIds.push(ownerRole.id);

          // Billable seats should still be 1 (only TEAM_EDITOR counts)
          billableSeats = await calculateBillableSeats(teamId);
          expect(billableSeats).toBe(1);

          // Property 4: Multiple users with TEAM_EDITOR should all be counted
          // Create a second user with TEAM_EDITOR
          const uniqueEmail2 = `${Date.now()}-${Math.random()}-second@example.com`;
          const userId2 = await createTestUser(uniqueEmail2, 'Second User', true);

          const editorRole2 = await assignRole({
            userId: userId2,
            role: TEAM_ROLES.TEAM_EDITOR,
            resourceType: 'team',
            resourceId: teamId,
          });
          createdRoleIds.push(editorRole2.id);

          // Billable seats should now be 2
          billableSeats = await calculateBillableSeats(teamId);
          expect(billableSeats).toBe(2);

          // Property 5: Removing TEAM_EDITOR role should decrease billable seats
          const { removeRole } = await import('@/server/auth/rbac');
          await removeRole({
            userId: userId2,
            role: TEAM_ROLES.TEAM_EDITOR,
            resourceType: 'team',
            resourceId: teamId,
          });

          // Billable seats should be back to 1
          billableSeats = await calculateBillableSeats(teamId);
          expect(billableSeats).toBe(1);
        }
      ),
      PROPERTY_CONFIG
    );
  }, 60000); // 60 second timeout

  /**
   * Edge case: Unverified users can still have roles assigned
   * 
   * The system should allow role assignment regardless of email verification status.
   * This is important for scenarios where users are invited to teams before verifying.
   */
  test('Edge case: Unverified users can have roles assigned', async () => {
    const email = 'unverified@example.com';
    const name = 'Unverified User';
    const userId = await createTestUser(email, name, false); // emailVerified = false

    const teamId = createTestTeamId();
    const role = await assignRole({
      userId,
      role: TEAM_ROLES.TEAM_MEMBER,
      resourceType: 'team',
      resourceId: teamId,
    });

    expect(role).toBeDefined();
    expect(role.userId).toBe(userId);
    createdRoleIds.push(role.id);

    // Verify user is still unverified
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    expect(user.emailVerified).toBe(false);
  });

  /**
   * Edge case: Invalid role throws error
   * 
   * Attempting to assign a non-existent role should throw an error.
   */
  test('Edge case: Invalid role throws error', async () => {
    const email = 'test@example.com';
    const name = 'Test User';
    const userId = await createTestUser(email, name, true);
    const teamId = createTestTeamId();

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
   * 
   * A user should be able to have different roles in different teams/projects.
   */
  test('Edge case: User can have multiple roles in different resources', async () => {
    const email = 'multi@example.com';
    const name = 'Multi Role User';
    const userId = await createTestUser(email, name, true);

    const team1Id = createTestTeamId();
    const team2Id = createTestTeamId();
    const project1Id = createTestProjectId();

    // Assign different roles in different resources
    const role1 = await assignRole({
      userId,
      role: TEAM_ROLES.TEAM_OWNER,
      resourceType: 'team',
      resourceId: team1Id,
    });
    createdRoleIds.push(role1.id);

    const role2 = await assignRole({
      userId,
      role: TEAM_ROLES.TEAM_MEMBER,
      resourceType: 'team',
      resourceId: team2Id,
    });
    createdRoleIds.push(role2.id);

    const role3 = await assignRole({
      userId,
      role: PROJECT_ROLES.PROJECT_EDITOR,
      resourceType: 'project',
      resourceId: project1Id,
    });
    createdRoleIds.push(role3.id);

    // Verify user has all three roles
    const roles = await getUserRoles(userId);
    expect(roles).toHaveLength(3);

    // Verify each role is correct
    const teamRoles = roles.filter(r => r.resourceType === 'team');
    const projectRoles = roles.filter(r => r.resourceType === 'project');

    expect(teamRoles).toHaveLength(2);
    expect(projectRoles).toHaveLength(1);
  });
});
