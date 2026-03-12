
import { describe, test, expect, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { users, teams, teamMembers } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { createTeam } from '@/server/teams/team-service';
import { addMember, getMembersByTeam } from '@/server/teams/member-service';

const testUserIds: string[] = [];
const testTeamIds: string[] = [];

async function createTestUser(email: string, name: string) {
  const [user] = await db
    .insert(users)
    .values({
      email: email.toLowerCase().trim(),
      name: name.trim(),
      emailVerified: true,
      passwordHash: 'test-hash',
    })
    .returning();
  
  testUserIds.push(user.id);
  return user;
}

async function cleanupTestData() {
  for (const teamId of testTeamIds) {
    await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
  }
  for (const teamId of testTeamIds) {
    await db.delete(teams).where(eq(teams.id, teamId));
  }
  for (const userId of testUserIds) {
    await db.delete(users).where(eq(users.id, userId));
  }
  testUserIds.length = 0;
  testTeamIds.length = 0;
}

afterEach(async () => {
  await cleanupTestData();
});

describe('Integration Test: Get Team Members', () => {
  test('should return all team members including owner and admin', async () => {
    // 1. Create Owner
    const owner = await createTestUser(
      `owner-get-${Date.now()}@example.com`,
      'Owner'
    );
    
    // 2. Create Team
    const team = await createTeam({
      name: 'Get Members Team',
      description: 'Testing get members',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);

    // 3. Create Admin
    const admin = await createTestUser(
      `admin-get-${Date.now()}@example.com`,
      'Admin'
    );
    await addMember({
      teamId: team.id,
      userId: admin.id,
      managementRole: 'WORKSPACE_ADMIN',
      operationalRole: 'WORKSPACE_MEMBER',
      invitedBy: owner.id,
    });

    // 4. Create Member
    const member = await createTestUser(
      `member-get-${Date.now()}@example.com`,
      'Member'
    );
    await addMember({
      teamId: team.id,
      userId: member.id,
      operationalRole: 'WORKSPACE_MEMBER',
      invitedBy: owner.id,
    });

    // 5. Get Members
    const { members, total } = await getMembersByTeam(team.id);

    // 6. Assertions
    expect(total).toBe(3);
    expect(members).toHaveLength(3);
    
    const ownerMember = members.find(m => m.userId === owner.id);
    expect(ownerMember).toBeDefined();
    expect(ownerMember?.managementRole).toBe('WORKSPACE_OWNER');

    const adminMember = members.find(m => m.userId === admin.id);
    expect(adminMember).toBeDefined();
    expect(adminMember?.managementRole).toBe('WORKSPACE_ADMIN');

    const regularMember = members.find(m => m.userId === member.id);
    expect(regularMember).toBeDefined();
    expect(regularMember?.managementRole).toBeNull();
  });
});
