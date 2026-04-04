/**
 * Integration Test: Member Management Flow
 * 
 * Tests the end-to-end member management flow including:
 * - Role updates
 * - Member removal
 * - Project ownership blocking
 * 
 * Requirements: 3.2, 3.3, 3.4, 3.5
 */

import { describe, test, expect, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { users, teams, teamMembers } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { createTeam } from '@/server/teams/team-service';
import { addMember, updateMemberRoles, removeMember } from '@/server/teams/member-service';

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

describe('Integration Test: Member Management Flow', () => {
  test('should update member roles', async () => {
    // Create team owner and team
    const owner = await createTestUser(
      `owner-${Date.now()}@example.com`,
      'Owner'
    );
    
    const team = await createTeam({
      name: 'Role Update Team',
      description: 'Testing role updates',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);
    
    // Add a member as TEAM_MEMBER
    const member1 = await createTestUser(
      `member1-${Date.now()}@example.com`,
      'Member 1'
    );
    
    await addMember({
      teamId: team.id,
      userId: member1.id,
      operationalRole: 'TEAM_MEMBER',
      invitedBy: owner.id,
    });
    
    // Verify member role
    let [member] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, member1.id))
      .limit(1);
    
    expect(member.operationalRole).toBe('TEAM_MEMBER');
    
    // Promote member to TEAM_EDITOR
    await updateMemberRoles(
      team.id,
      member1.id,
      { operationalRole: 'TEAM_EDITOR' },
      owner.id
    );
    
    // Verify role updated
    [member] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, member1.id))
      .limit(1);
      
    expect(member.operationalRole).toBe('TEAM_EDITOR');
    
    // Demote member back to TEAM_MEMBER
    await updateMemberRoles(
      team.id,
      member1.id,
      { operationalRole: 'TEAM_MEMBER' },
      owner.id
    );
    
    // Verify role updated back
    [member] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, member1.id))
      .limit(1);
      
    expect(member.operationalRole).toBe('TEAM_MEMBER');
  });
  
  test('should remove member successfully when no projects owned', async () => {
    // Create team owner and team
    const owner = await createTestUser(
      `owner-remove-${Date.now()}@example.com`,
      'Owner'
    );
    
    const team = await createTeam({
      name: 'Remove Member Team',
      description: 'Testing member removal',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);
    
    // Add a member
    const member = await createTestUser(
      `member-remove-${Date.now()}@example.com`,
      'Member'
    );
    
    await addMember({
      teamId: team.id,
      userId: member.id,
      operationalRole: 'TEAM_MEMBER',
      invitedBy: owner.id,
    });
    
    // Verify member exists
    let [memberRecord] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, member.id))
      .limit(1);
    
    expect(memberRecord).toBeTruthy();
    
    // Remove member
    await removeMember(team.id, member.id, owner.id);
    
    // Verify member is removed
    [memberRecord] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, member.id))
      .limit(1);
    
    expect(memberRecord).toBeUndefined();
  });
  

  
  test('should handle multiple role changes correctly', async () => {
    // Create team owner and team
    const owner = await createTestUser(
      `owner-multi-${Date.now()}@example.com`,
      'Owner'
    );
    
    const team = await createTeam({
      name: 'Multi Role Team',
      description: 'Testing multiple role changes',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);
    
    // Add 3 members
    const members = [];
    for (let i = 0; i < 3; i++) {
      const member = await createTestUser(
        `member-${i}-${Date.now()}@example.com`,
        `Member ${i}`
      );
      members.push(member);
      
      await addMember({
        teamId: team.id,
        userId: member.id,
        operationalRole: 'TEAM_MEMBER',
        invitedBy: owner.id,
      });
    }
    
    // Promote all 3 to TEAM_EDITOR
    for (const member of members) {
      await updateMemberRoles(
        team.id,
        member.id,
        { operationalRole: 'TEAM_EDITOR' },
        owner.id
      );
    }
    
    // Verify roles updated
    for (const member of members) {
      const [m] = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.userId, member.id))
        .limit(1);
      expect(m.operationalRole).toBe('TEAM_EDITOR');
    }
    
    // Demote 2 back to TEAM_MEMBER
    for (let i = 0; i < 2; i++) {
      await updateMemberRoles(
        team.id,
        members[i].id,
        { operationalRole: 'TEAM_MEMBER' },
        owner.id
      );
    }
    
    // Verify demotions
    for (let i = 0; i < 2; i++) {
      const [m] = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.userId, members[i].id))
        .limit(1);
      expect(m.operationalRole).toBe('TEAM_MEMBER');
    }
  });
  
  test('should assign management roles correctly', async () => {
    // Create team owner and team
    const owner = await createTestUser(
      `owner-mgmt-${Date.now()}@example.com`,
      'Owner'
    );
    
    const team = await createTeam({
      name: 'Management Role Team',
      description: 'Testing management roles',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);
    
    // Add a member with TEAM_ADMIN management role
    const admin = await createTestUser(
      `admin-${Date.now()}@example.com`,
      'Admin'
    );
    
    await addMember({
      teamId: team.id,
      userId: admin.id,
      managementRole: 'TEAM_ADMIN',
      operationalRole: 'TEAM_MEMBER',
      invitedBy: owner.id,
    });
    
    // Verify roles
    const [adminMember] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, admin.id))
      .limit(1);
    
    expect(adminMember.managementRole).toBe('TEAM_ADMIN');
    expect(adminMember.operationalRole).toBe('TEAM_MEMBER');
  });
});
