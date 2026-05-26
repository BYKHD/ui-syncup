import { afterEach, describe, expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  issues,
  projectActivities,
  projectMembers,
  projects,
  teamMembers,
  teams,
  users,
} from '@/server/db/schema';
import { createTeam } from '@/server/teams/team-service';
import { archiveProject, createProject } from '@/server/projects/project-service';

const mockGetSession = vi.fn();

vi.mock('@/server/auth/session', () => ({ getSession: mockGetSession }));

const { POST } = await import('../route');

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
  status: 'resolved';
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

afterEach(async () => {
  vi.clearAllMocks();
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

describe('POST /api/projects/[id]/join', () => {
  test('returns 403 PROJECT_ARCHIVED when the public project is archived', async () => {
    const { owner, team, project } = await makeProject('join-arch');
    await insertIssue({
      teamId: team.id,
      projectId: project.id,
      reporterId: owner.id,
      projectKey: project.key,
      status: 'resolved',
    });
    await db.update(projects).set({ visibility: 'public' }).where(eq(projects.id, project.id));
    await archiveProject(project.id, owner.id);

    const outsider = await createTestUser(`out-${Date.now()}@test.com`, 'Outsider');
    mockGetSession.mockResolvedValue({ id: outsider.id });

    const req = new NextRequest(`http://localhost/api/projects/${project.id}/join`, {
      method: 'POST',
    });
    const res = await POST(req, { params: Promise.resolve({ id: project.id }) });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe('PROJECT_ARCHIVED');
  });
});
