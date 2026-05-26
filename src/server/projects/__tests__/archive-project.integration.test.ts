import { afterEach, describe, expect, test } from 'vitest';
import { db } from '@/lib/db';
import {
  users,
  teams,
  teamMembers,
  projects,
  projectMembers,
  issues,
  projectActivities,
} from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { createTeam } from '@/server/teams/team-service';
import {
  createProject,
  archiveProject,
  unarchiveProject,
} from '@/server/projects/project-service';

const testUserIds: string[] = [];
const testTeamIds: string[] = [];
const testProjectIds: string[] = [];

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

let issueSeq = 0;
async function insertIssue({
  teamId,
  projectId,
  reporterId,
  projectKey,
  status,
}: {
  teamId: string;
  projectId: string;
  reporterId: string;
  projectKey: string;
  status: 'open' | 'resolved' | 'archived';
}) {
  const issueNumber = ++issueSeq;

  await db.insert(issues).values({
    teamId,
    projectId,
    reporterId,
    issueKey: `${projectKey}-${issueNumber}`,
    issueNumber,
    title: `Issue ${issueNumber}`,
    status,
    type: 'bug',
    priority: 'medium',
  });
}

async function cleanupTestData() {
  for (const id of testProjectIds) {
    await db.delete(projectActivities).where(eq(projectActivities.projectId, id)).catch(() => {});
    await db.delete(issues).where(eq(issues.projectId, id)).catch(() => {});
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

afterEach(cleanupTestData);

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

async function makeProject(suffix: string) {
  const ts = Date.now();
  const owner = await createTestUser(`owner-${suffix}-${ts}@test.com`, 'Owner');
  const team = await createTeam({ name: `T-${suffix}-${ts}`, creatorId: owner.id });
  testTeamIds.push(team.id);
  const project = await createProject(
    { teamId: team.id, name: `P-${suffix}-${ts}`, key: uniqueKey() },
    owner.id,
  );
  testProjectIds.push(project.id);
  return { owner, team, project };
}

describe('archiveProject', () => {
  test('archives when all issues are completed', async () => {
    const { owner, team, project } = await makeProject('arch-all');
    await insertIssue({
      teamId: team.id,
      projectId: project.id,
      reporterId: owner.id,
      projectKey: project.key,
      status: 'resolved',
    });
    await insertIssue({
      teamId: team.id,
      projectId: project.id,
      reporterId: owner.id,
      projectKey: project.key,
      status: 'archived',
    });

    const updated = await archiveProject(project.id, owner.id);

    expect(updated.status).toBe('archived');

    const activities = await db
      .select()
      .from(projectActivities)
      .where(eq(projectActivities.projectId, project.id));
    expect(activities).toHaveLength(1);
    expect(activities[0].type).toBe('project_archived');
    expect(activities[0].actorId).toBe(owner.id);
  });

  test('refuses to archive when an issue is open', async () => {
    const { owner, team, project } = await makeProject('arch-open');
    await insertIssue({
      teamId: team.id,
      projectId: project.id,
      reporterId: owner.id,
      projectKey: project.key,
      status: 'resolved',
    });
    await insertIssue({
      teamId: team.id,
      projectId: project.id,
      reporterId: owner.id,
      projectKey: project.key,
      status: 'open',
    });

    await expect(archiveProject(project.id, owner.id)).rejects.toThrow(
      /All issues must be resolved before archiving/,
    );

    const [row] = await db.select().from(projects).where(eq(projects.id, project.id));
    expect(row.status).toBe('active');

    const activities = await db
      .select()
      .from(projectActivities)
      .where(eq(projectActivities.projectId, project.id));
    expect(activities).toHaveLength(0);
  });

  test('refuses to archive a zero-issue project', async () => {
    const { owner, project } = await makeProject('arch-zero');

    await expect(archiveProject(project.id, owner.id)).rejects.toThrow(
      /All issues must be resolved before archiving/,
    );

    const [row] = await db.select().from(projects).where(eq(projects.id, project.id));
    expect(row.status).toBe('active');
  });

  test('archiving an already-archived project is a no-op', async () => {
    const { owner, team, project } = await makeProject('arch-idem');
    await insertIssue({
      teamId: team.id,
      projectId: project.id,
      reporterId: owner.id,
      projectKey: project.key,
      status: 'resolved',
    });
    await archiveProject(project.id, owner.id);

    const before = await db
      .select()
      .from(projectActivities)
      .where(eq(projectActivities.projectId, project.id));
    expect(before).toHaveLength(1);

    const second = await archiveProject(project.id, owner.id);
    expect(second.status).toBe('archived');

    const after = await db
      .select()
      .from(projectActivities)
      .where(eq(projectActivities.projectId, project.id));
    expect(after).toHaveLength(1);
  });

  test('throws on nonexistent project', async () => {
    const fake = '00000000-0000-0000-0000-000000000000';

    await expect(archiveProject(fake, fake)).rejects.toThrow(/Project not found/);
  });
});

describe('unarchiveProject', () => {
  test('flips archived to active and logs project_unarchived', async () => {
    const { owner, team, project } = await makeProject('un-flip');
    await insertIssue({
      teamId: team.id,
      projectId: project.id,
      reporterId: owner.id,
      projectKey: project.key,
      status: 'resolved',
    });
    await archiveProject(project.id, owner.id);

    const restored = await unarchiveProject(project.id, owner.id);

    expect(restored.status).toBe('active');

    const activities = await db
      .select()
      .from(projectActivities)
      .where(eq(projectActivities.projectId, project.id));
    expect(activities).toHaveLength(2);
    expect(activities.map((activity) => activity.type).sort()).toEqual([
      'project_archived',
      'project_unarchived',
    ]);
  });

  test('unarchiving an active project is a no-op', async () => {
    const { owner, project } = await makeProject('un-idem');

    const result = await unarchiveProject(project.id, owner.id);

    expect(result.status).toBe('active');

    const activities = await db
      .select()
      .from(projectActivities)
      .where(eq(projectActivities.projectId, project.id));
    expect(activities).toHaveLength(0);
  });
});
