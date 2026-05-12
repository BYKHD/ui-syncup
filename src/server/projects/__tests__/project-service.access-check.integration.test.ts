import { describe, test, expect, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { users, teams, teamMembers, projects, projectMembers } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { createTeam } from '@/server/teams/team-service';
import { createProject } from '@/server/projects/project-service';
import { getProjectForAccessCheck, canViewIssue } from '@/server/projects/project-service';

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

  test('non-team-member, public project: returns project + hasAccess false (cross-team leak closed)', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-pac-public-${ts}@test.com`, 'Owner');
    const outsider = await createTestUser(`out-pac-public-${ts}@test.com`, 'Outsider');
    const team = await createTeam({ name: `T-pac-public-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject(
      { teamId: team.id, name: `P-pac-public-${ts}`, key: uniqueKey(), visibility: 'public' },
      owner.id
    );
    testProjectIds.push(project.id);

    const result = await getProjectForAccessCheck(project.id, outsider.id);
    expect(result).not.toBeNull();
    expect(result!.hasAccess).toBe(false);
    expect(result!.project.id).toBe(project.id);
  });

  test('team-member but not project-member, public project: returns project + hasAccess true', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-pac-tm-${ts}@test.com`, 'Owner');
    const teamMate = await createTestUser(`tm-pac-tm-${ts}@test.com`, 'TeamMate');
    const team = await createTeam({ name: `T-pac-tm-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);

    // Add teamMate to the team as a plain TEAM_MEMBER (no project membership)
    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: teamMate.id,
      operationalRole: 'TEAM_MEMBER',
    });

    const project = await createProject(
      { teamId: team.id, name: `P-pac-tm-${ts}`, key: uniqueKey(), visibility: 'public' },
      owner.id
    );
    testProjectIds.push(project.id);

    const result = await getProjectForAccessCheck(project.id, teamMate.id);
    expect(result).not.toBeNull();
    expect(result!.hasAccess).toBe(true);
    expect(result!.project.id).toBe(project.id);
  });

  test('team owner, private project: returns project + hasAccess true without project membership', async () => {
    const ts = Date.now();
    const teamOwner = await createTestUser(`team-owner-pac-${ts}@test.com`, 'Team Owner');
    const projectOwner = await createTestUser(`project-owner-pac-${ts}@test.com`, 'Project Owner');
    const team = await createTeam({ name: `T-pac-owner-${ts}`, creatorId: teamOwner.id });
    testTeamIds.push(team.id);
    const project = await createProject(
      { teamId: team.id, name: `P-pac-owner-${ts}`, key: uniqueKey(), visibility: 'private' },
      projectOwner.id
    );
    testProjectIds.push(project.id);

    const directMembership = await db
      .select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, project.id), eq(projectMembers.userId, teamOwner.id)))
      .limit(1);

    const result = await getProjectForAccessCheck(project.id, teamOwner.id);
    expect(directMembership).toHaveLength(0);
    expect(result).not.toBeNull();
    expect(result!.hasAccess).toBe(true);
    expect(result!.project.id).toBe(project.id);
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

describe('canViewIssue', () => {
  test('returns false for non-existent project (issue points at deleted/missing project)', async () => {
    const ts = Date.now();
    const user = await createTestUser(`user-cvi1-${ts}@test.com`, 'U');
    const result = await canViewIssue(user.id, { projectId: crypto.randomUUID() });
    expect(result).toBe(false);
  });

  test('returns true for project owner (private project)', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-cvi2-${ts}@test.com`, 'Owner');
    const team = await createTeam({ name: `T-cvi2-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject(
      { teamId: team.id, name: `P-cvi2-${ts}`, key: uniqueKey(), visibility: 'private' },
      owner.id
    );
    testProjectIds.push(project.id);

    const result = await canViewIssue(owner.id, { projectId: project.id });
    expect(result).toBe(true);
  });

  test('returns true for same-team non-project-member on public project (the bug fix)', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-cvi3-${ts}@test.com`, 'Owner');
    const teamMate = await createTestUser(`tm-cvi3-${ts}@test.com`, 'TeamMate');
    const team = await createTeam({ name: `T-cvi3-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: teamMate.id,
      operationalRole: 'TEAM_MEMBER',
    });
    const project = await createProject(
      { teamId: team.id, name: `P-cvi3-${ts}`, key: uniqueKey(), visibility: 'public' },
      owner.id
    );
    testProjectIds.push(project.id);

    const result = await canViewIssue(teamMate.id, { projectId: project.id });
    expect(result).toBe(true);
  });

  test('returns false for cross-team user on public project', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-cvi4-${ts}@test.com`, 'Owner');
    const outsider = await createTestUser(`out-cvi4-${ts}@test.com`, 'Outsider');
    const team = await createTeam({ name: `T-cvi4-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject(
      { teamId: team.id, name: `P-cvi4-${ts}`, key: uniqueKey(), visibility: 'public' },
      owner.id
    );
    testProjectIds.push(project.id);

    const result = await canViewIssue(outsider.id, { projectId: project.id });
    expect(result).toBe(false);
  });

  test('returns false for soft-deleted project', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-cvi5-${ts}@test.com`, 'Owner');
    const team = await createTeam({ name: `T-cvi5-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject(
      { teamId: team.id, name: `P-cvi5-${ts}`, key: uniqueKey() },
      owner.id
    );
    testProjectIds.push(project.id);

    await db.update(projects).set({ deletedAt: new Date() }).where(eq(projects.id, project.id));

    const result = await canViewIssue(owner.id, { projectId: project.id });
    expect(result).toBe(false);
  });

  test('returns false for same-team non-member on private project', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-cvi6-${ts}@test.com`, 'Owner');
    const teamMate = await createTestUser(`tm-cvi6-${ts}@test.com`, 'TeamMate');
    const team = await createTeam({ name: `T-cvi6-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: teamMate.id,
      operationalRole: 'TEAM_MEMBER',
    });
    const project = await createProject(
      { teamId: team.id, name: `P-cvi6-${ts}`, key: uniqueKey(), visibility: 'private' },
      owner.id
    );
    testProjectIds.push(project.id);

    const result = await canViewIssue(teamMate.id, { projectId: project.id });
    expect(result).toBe(false);
  });

  test('returns true for team admin without project membership on private project', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-cvi7-${ts}@test.com`, 'Owner');
    const admin = await createTestUser(`admin-cvi7-${ts}@test.com`, 'Admin');
    const team = await createTeam({ name: `T-cvi7-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: admin.id,
      operationalRole: 'TEAM_MEMBER',
      managementRole: 'TEAM_ADMIN',
    });
    const project = await createProject(
      { teamId: team.id, name: `P-cvi7-${ts}`, key: uniqueKey(), visibility: 'private' },
      owner.id
    );
    testProjectIds.push(project.id);

    const result = await canViewIssue(admin.id, { projectId: project.id });
    expect(result).toBe(true);
  });
});
