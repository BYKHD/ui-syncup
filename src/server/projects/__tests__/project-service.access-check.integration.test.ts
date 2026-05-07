import { describe, test, expect, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { users, teams, teamMembers, projects, projectMembers } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { createTeam } from '@/server/teams/team-service';
import { createProject } from '@/server/projects/project-service';
import { getProjectForAccessCheck } from '@/server/projects/project-service';

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

async function cleanupTestData() {
  for (const id of testProjectIds) {
    await db.delete(projectMembers).where(eq(projectMembers.projectId, id)).catch(() => {});
    await db.delete(projects).where(eq(projects.id, id)).catch(() => {});
  }
  for (const id of testTeamIds) {
    await db.delete(teamMembers).where(eq(teamMembers.teamId, id)).catch(() => {});
    await db.delete(teams).where(eq(teams.id, id)).catch(() => {});
  }
  for (const id of testUserIds) {
    await db.delete(users).where(eq(users.id, id)).catch(() => {});
  }
  testProjectIds.length = 0;
  testTeamIds.length = 0;
  testUserIds.length = 0;
}

afterEach(async () => {
  await cleanupTestData();
});

let keySeq = 0;
function uniqueKey(): string {
  const n = keySeq++;
  let key = '';
  let v = n;
  do {
    key = String.fromCharCode(65 + (v % 26)) + key;
    v = Math.floor(v / 26);
  } while (v > 0);
  return key.length < 2 ? key.padStart(2, 'A') : key;
}

describe('getProjectForAccessCheck', () => {
  test('member: returns project + hasAccess true', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-pac1-${ts}@test.com`, 'Owner');
    const team = await createTeam({ name: `T-pac1-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject(
      { teamId: team.id, name: `P-pac1-${ts}`, key: uniqueKey() },
      owner.id
    );
    testProjectIds.push(project.id);

    const result = await getProjectForAccessCheck(project.id, owner.id);
    expect(result).not.toBeNull();
    expect(result!.hasAccess).toBe(true);
    expect(result!.project.id).toBe(project.id);
    expect(result!.project.name).toBeDefined();
  });

  test('non-member, private project: returns project + hasAccess false (does NOT throw)', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-pac2-${ts}@test.com`, 'Owner');
    const outsider = await createTestUser(`out-pac2-${ts}@test.com`, 'Outsider');
    const team = await createTeam({ name: `T-pac2-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject(
      { teamId: team.id, name: `P-pac2-${ts}`, key: uniqueKey(), visibility: 'private' },
      owner.id
    );
    testProjectIds.push(project.id);

    const result = await getProjectForAccessCheck(project.id, outsider.id);
    expect(result).not.toBeNull();
    expect(result!.hasAccess).toBe(false);
    expect(result!.project.id).toBe(project.id);
    expect(result!.project.name).toBeDefined();
  });

  test('soft-deleted project: returns null', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-pac3-${ts}@test.com`, 'Owner');
    const team = await createTeam({ name: `T-pac3-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject(
      { teamId: team.id, name: `P-pac3-${ts}`, key: uniqueKey() },
      owner.id
    );
    testProjectIds.push(project.id);

    await db.update(projects).set({ deletedAt: new Date() }).where(eq(projects.id, project.id));

    const result = await getProjectForAccessCheck(project.id, owner.id);
    expect(result).toBeNull();
  });

  test('non-existent project id: returns null', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-pac4-${ts}@test.com`, 'Owner');

    const result = await getProjectForAccessCheck(crypto.randomUUID(), owner.id);
    expect(result).toBeNull();
  });
});
