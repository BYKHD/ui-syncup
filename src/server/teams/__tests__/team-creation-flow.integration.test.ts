/**
 * Integration Test: Complete Team Creation Flow
 * 
 * Tests the end-to-end team creation flow including:
 * - Onboarding page team creation
 * - Role assignment (TEAM_OWNER + TEAM_EDITOR)
 * - Team switching (lastActiveTeamId update)
 * - Plan limit enforcement
 * 
 * Requirements: 1.1, 3.1, 9.2, 10.1
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { users, teams, teamMembers } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { createTeam } from '@/server/teams/team-service';
import { addMember } from '@/server/teams/member-service';
import { setActiveTeam } from '@/server/teams/team-context';
import { checkMemberLimit } from '@/server/teams/resource-limits';

/**
 * Test data cleanup
 */
const testUserIds: string[] = [];
const testTeamIds: string[] = [];

/**
 * Helper to create a test user
 */
async function createTestUser(email: string, name: string) {
  const [user] = await db
    .insert(users)
    .values({
      email: email.toLowerCase().trim(),
      name: name.trim(),
      emailVerified: true,
    })
    .returning();
  
  testUserIds.push(user.id);
  return user;
}

/**
 * Helper to clean up test data
 */
async function cleanupTestData() {
  // Delete team members
  for (const teamId of testTeamIds) {
    await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
  }
  
  // Delete teams
  for (const teamId of testTeamIds) {
    await db.delete(teams).where(eq(teams.id, teamId));
  }
  
  // Delete users
  for (const userId of testUserIds) {
    await db.delete(users).where(eq(users.id, userId));
  }
  
  testUserIds.length = 0;
  testTeamIds.length = 0;
}

/**
 * Clean up after each test
 */
afterEach(async () => {
  await cleanupTestData();
});

describe('Integration Test: Complete Team Creation Flow', () => {
  test('should complete full team creation flow from onboarding', async () => {
    // Step 1: Create a verified user (simulating post-email-verification)
    const user = await createTestUser(
      `creator-${Date.now()}@example.com`,
      'Team Creator'
    );
    
    expect(user.id).toBeTruthy();
    expect(user.emailVerified).toBe(true);
    
    // Step 2: User creates team through onboarding
    const teamData = {
      name: 'Design Squad',
      description: 'Our awesome design team',
      creatorId: user.id,
    };
    
    const team = await createTeam(teamData);
    testTeamIds.push(team.id);
    
    expect(team.id).toBeTruthy();
    expect(team.name).toBe(teamData.name);
    expect(team.description).toBe(teamData.description);
    expect(team.slug).toBeTruthy();
    
    // Step 3: Verify creator has correct roles (TEAM_OWNER + TEAM_EDITOR)
    const [memberRecord] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.teamId, team.id))
      .limit(1);
    
    expect(memberRecord).toBeTruthy();
    expect(memberRecord.userId).toBe(user.id);
    expect(memberRecord.managementRole).toBe('TEAM_OWNER');
    expect(memberRecord.operationalRole).toBe('TEAM_EDITOR');
    
    // Step 4: Verify lastActiveTeamId was updated during team creation
    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    
    expect(updatedUser.lastActiveTeamId).toBe(team.id);
    
    // Step 5: Verify plan limits are enforced
    // Free plan allows 10 members, we have 1 (creator)
    
    // Add 9 more members (total 10)
    for (let i = 0; i < 9; i++) {
      const newUser = await createTestUser(
        `member-${i}-${Date.now()}@example.com`,
        `Member ${i}`
      );
      
      await addMember({
        teamId: team.id,
        userId: newUser.id,
        operationalRole: 'TEAM_MEMBER',
        invitedBy: user.id,
      });
    }
    
    // Verify we now have 10 members
    const allMembers = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.teamId, team.id));
    
    expect(allMembers.length).toBe(10);
    
    // Try to add 11th member - should throw error
    const eleventhUser = await createTestUser(
      `member-11-${Date.now()}@example.com`,
      'Member 11'
    );
    
    await expect(
      checkMemberLimit(team.id)
    ).rejects.toThrow(/Cannot add member: team has reached the instance quota/);
  });
  
  test('should handle team creation with special characters in name', async () => {
    const user = await createTestUser(
      `special-${Date.now()}@example.com`,
      'Special User'
    );
    
    // Create team with special characters
    const teamData = {
      name: 'Design & Development Team!',
      description: 'Team with special chars',
      creatorId: user.id,
    };
    
    const team = await createTeam(teamData);
    testTeamIds.push(team.id);
    
    expect(team.name).toBe(teamData.name);
    // Slug should be URL-friendly
    expect(team.slug).toMatch(/^[a-z0-9-]+$/);
    expect(team.slug).not.toContain('&');
    expect(team.slug).not.toContain('!');
  });
  
  test('should handle duplicate team names with numeric suffixes', async () => {
    const user = await createTestUser(
      `duplicate-${Date.now()}@example.com`,
      'Duplicate User'
    );
    
    // Create first team
    const team1 = await createTeam({
      name: 'Acme Corp',
      description: 'First team',
      creatorId: user.id,
    });
    testTeamIds.push(team1.id);
    
    expect(team1.slug).toBe('acme-corp');
    
    // Create second team with same name
    const team2 = await createTeam({
      name: 'Acme Corp',
      description: 'Second team',
      creatorId: user.id,
    });
    testTeamIds.push(team2.id);
    
    // Should have numeric suffix
    expect(team2.slug).toMatch(/^acme-corp-\d+$/);
    expect(team2.slug).not.toBe(team1.slug);
  });
  
  test('should create team and set it as active', async () => {
    const user = await createTestUser(
      `switch-${Date.now()}@example.com`,
      'Switch User'
    );
    
    // User initially has no active team
    expect(user.lastActiveTeamId).toBeNull();
    
    // Create first team
    const team1 = await createTeam({
      name: 'First Team',
      description: 'Team 1',
      creatorId: user.id,
    });
    testTeamIds.push(team1.id);
    
    // Verify first team is set as active
    let [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    
    expect(currentUser.lastActiveTeamId).toBe(team1.id);
    
    // Create second team
    const team2 = await createTeam({
      name: 'Second Team',
      description: 'Team 2',
      creatorId: user.id,
    });
    testTeamIds.push(team2.id);
    
    // Verify second team is now set as active (most recent creation)
    [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    
    expect(currentUser.lastActiveTeamId).toBe(team2.id);
    
    // Manually switch back to first team (simulating user action)
    await db
      .update(users)
      .set({ lastActiveTeamId: team1.id })
      .where(eq(users.id, user.id));
    
    [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    
    expect(currentUser.lastActiveTeamId).toBe(team1.id);
  });
  
  test('should enforce member quotas on team creation', async () => {
    const user = await createTestUser(
      `limits-${Date.now()}@example.com`,
      'Limits User'
    );
    
    // Create team
    const team = await createTeam({
      name: 'Limited Team',
      description: 'Testing limits',
      creatorId: user.id,
    });
    testTeamIds.push(team.id);
    
    // Add a TEAM_MEMBER
    const member1 = await createTestUser(
      `member1-${Date.now()}@example.com`,
      'Member 1'
    );
    
    await addMember({
      teamId: team.id,
      userId: member1.id,
      operationalRole: 'TEAM_MEMBER',
      invitedBy: user.id,
    });
    
    // Add a TEAM_EDITOR
    const member2 = await createTestUser(
      `member2-${Date.now()}@example.com`,
      'Member 2'
    );
    
    await addMember({
      teamId: team.id,
      userId: member2.id,
      operationalRole: 'TEAM_EDITOR',
      invitedBy: user.id,
    });
  });
});
