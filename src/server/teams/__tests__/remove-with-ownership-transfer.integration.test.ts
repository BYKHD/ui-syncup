/**
 * Integration Test: Remove Member with Ownership Transfer
 */
import { describe, test, expect, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { users, teams, teamMembers, projectMembers } from '@/server/db/schema';
import { projects } from '@/server/db/schema/projects';
import { eq, and } from 'drizzle-orm';
import { createTeam } from '@/server/teams/team-service';
import { addMember } from '@/server/teams/member-service';
import { getOwnedProjectsWithDetails, removeWithOwnershipTransfer } from '@/server/teams/member-service';

const testUserIds: string[] = [];
const testTeamIds: string[] = [];
const testProjectIds: string[] = [];

async function createTestUser(email: string, name: string) {
  const [user] = await db
    .insert(users)
    .values({ email: email.toLowerCase().trim(), name: name.trim(), emailVerified: true })
    .returning();
  testUserIds.push(user.id);
  return user;
}

async function createTestProject(teamId: string, name: string, key: string) {
  const [project] = await db
    .insert(projects)
    .values({ teamId, name, key, slug: key.toLowerCase(), visibility: 'private', status: 'active' })
    .returning();
  testProjectIds.push(project.id);
  return project;
}

async function cleanupTestData() {
  for (const projectId of testProjectIds) {
    await db.delete(projectMembers).where(eq(projectMembers.projectId, projectId));
    await db.delete(projects).where(eq(projects.id, projectId));
  }
  for (const teamId of testTeamIds) {
    await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
    await db.delete(teams).where(eq(teams.id, teamId));
  }
  for (const userId of testUserIds) {
    await db.delete(users).where(eq(users.id, userId));
  }
  testUserIds.length = 0;
  testTeamIds.length = 0;
  testProjectIds.length = 0;
}

afterEach(async () => { await cleanupTestData(); });

describe('getOwnedProjectsWithDetails', () => {
  test('returns owned projects with name and key for a user', async () => {
    const owner = await createTestUser(`owner-${Date.now()}@example.com`, 'Owner');
    const team = await createTeam({ name: `Team ${Date.now()}`, creatorId: owner.id });
    testTeamIds.push(team.id);

    const project = await createTestProject(team.id, 'Dashboard', 'DASH');
    await db.insert(projectMembers).values({ projectId: project.id, userId: owner.id, role: 'owner' });

    const result = await getOwnedProjectsWithDetails(owner.id, team.id);

    expect(result.ownedProjects).toHaveLength(1);
    expect(result.ownedProjects[0]).toMatchObject({ id: project.id, name: 'Dashboard', key: 'DASH' });
  });

  test('returns empty list when user owns no projects', async () => {
    const member = await createTestUser(`member-${Date.now()}@example.com`, 'Member');
    const team = await createTeam({ name: `Team ${Date.now()}`, creatorId: member.id });
    testTeamIds.push(team.id);

    const result = await getOwnedProjectsWithDetails(member.id, team.id);

    expect(result.ownedProjects).toHaveLength(0);
  });

  test('returns eligible owners (TEAM_EDITOR members, excluding the removed user)', async () => {
    const owner = await createTestUser(`owner-${Date.now()}@example.com`, 'Owner');
    const editor = await createTestUser(`editor-${Date.now()}@example.com`, 'Editor');
    const team = await createTeam({ name: `Team ${Date.now()}`, creatorId: owner.id });
    testTeamIds.push(team.id);

    await addMember({ teamId: team.id, userId: editor.id, operationalRole: 'TEAM_EDITOR', invitedBy: owner.id });

    const project = await createTestProject(team.id, 'App', 'APP');
    await db.insert(projectMembers).values({ projectId: project.id, userId: owner.id, role: 'owner' });

    const result = await getOwnedProjectsWithDetails(owner.id, team.id);

    expect(result.eligibleOwners.some(u => u.userId === editor.id)).toBe(true);
    expect(result.eligibleOwners.some(u => u.userId === owner.id)).toBe(false);
  });
});

describe('removeWithOwnershipTransfer', () => {
  test('transfers project ownership and removes team member atomically', async () => {
    const owner = await createTestUser(`owner-${Date.now()}@example.com`, 'Owner');
    const newOwner = await createTestUser(`new-${Date.now()}@example.com`, 'New Owner');
    const team = await createTeam({ name: `Team ${Date.now()}`, creatorId: owner.id });
    testTeamIds.push(team.id);

    await addMember({ teamId: team.id, userId: newOwner.id, operationalRole: 'TEAM_EDITOR', invitedBy: owner.id });

    const project = await createTestProject(team.id, 'Dashboard', 'DASH');
    await db.insert(projectMembers).values({ projectId: project.id, userId: owner.id, role: 'owner' });
    await db.insert(projectMembers).values({ projectId: project.id, userId: newOwner.id, role: 'editor' });

    await removeWithOwnershipTransfer(
      team.id,
      owner.id,
      [{ projectId: project.id, newOwnerId: newOwner.id }],
      owner.id
    );

    // Owner should no longer be a team member
    const teamMember = await db.query.teamMembers.findFirst({
      where: and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, owner.id)),
    });
    expect(teamMember).toBeUndefined();

    // New owner should now own the project
    const projectMember = await db.query.projectMembers.findFirst({
      where: and(eq(projectMembers.projectId, project.id), eq(projectMembers.userId, newOwner.id)),
    });
    expect(projectMember?.role).toBe('owner');
  });

  test('throws OWNERSHIP_TRANSFER_REQUIRED if owned project has no transfer target', async () => {
    const owner = await createTestUser(`owner-${Date.now()}@example.com`, 'Owner');
    const team = await createTeam({ name: `Team ${Date.now()}`, creatorId: owner.id });
    testTeamIds.push(team.id);

    const project = await createTestProject(team.id, 'App', 'APP');
    await db.insert(projectMembers).values({ projectId: project.id, userId: owner.id, role: 'owner' });

    await expect(
      removeWithOwnershipTransfer(team.id, owner.id, [], owner.id)
    ).rejects.toThrow('OWNERSHIP_TRANSFER_REQUIRED');
  });

  test('removes member with no transfers when user owns no projects', async () => {
    const actor = await createTestUser(`actor-${Date.now()}@example.com`, 'Actor');
    const member = await createTestUser(`member-${Date.now()}@example.com`, 'Member');
    const team = await createTeam({ name: `Team ${Date.now()}`, creatorId: actor.id });
    testTeamIds.push(team.id);

    await addMember({ teamId: team.id, userId: member.id, operationalRole: 'TEAM_MEMBER', invitedBy: actor.id });

    await removeWithOwnershipTransfer(team.id, member.id, [], actor.id);

    const teamMember = await db.query.teamMembers.findFirst({
      where: and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, member.id)),
    });
    expect(teamMember).toBeUndefined();
  });
});
