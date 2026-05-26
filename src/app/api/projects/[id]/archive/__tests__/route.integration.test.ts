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

const { POST, DELETE } = await import('../route');

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

function makeRequest(projectId: string, method: 'POST' | 'DELETE') {
  return new NextRequest(`http://localhost/api/projects/${projectId}/archive`, { method });
}

describe('POST /api/projects/[id]/archive', () => {
  test('archives when the project owner has completed all issues', async () => {
    const { owner, team, project } = await makeProject('route-arch-ok');
    await insertIssue({
      teamId: team.id,
      projectId: project.id,
      reporterId: owner.id,
      projectKey: project.key,
      status: 'resolved',
    });
    mockGetSession.mockResolvedValue({ id: owner.id });

    const res = await POST(makeRequest(project.id, 'POST'), {
      params: Promise.resolve({ id: project.id }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.project.status).toBe('archived');
    expect(body.project.createdAt).toEqual(expect.any(String));
    expect(body.project.updatedAt).toEqual(expect.any(String));
  });

  test('returns 400 PROJECT_INCOMPLETE when issues are still open', async () => {
    const { owner, team, project } = await makeProject('route-arch-bad');
    await insertIssue({
      teamId: team.id,
      projectId: project.id,
      reporterId: owner.id,
      projectKey: project.key,
      status: 'open',
    });
    mockGetSession.mockResolvedValue({ id: owner.id });

    const res = await POST(makeRequest(project.id, 'POST'), {
      params: Promise.resolve({ id: project.id }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('PROJECT_INCOMPLETE');
    expect(body.error.message).toMatch(/All issues must be resolved/);
  });

  test('returns 403 when the user lacks PROJECT_ARCHIVE', async () => {
    const { project } = await makeProject('route-arch-403');
    const stranger = await createTestUser(`str-${Date.now()}@test.com`, 'Stranger');
    mockGetSession.mockResolvedValue({ id: stranger.id });

    const res = await POST(makeRequest(project.id, 'POST'), {
      params: Promise.resolve({ id: project.id }),
    });

    expect(res.status).toBe(403);
  });

  test('returns 404 for a nonexistent project when the caller already belongs to a project', async () => {
    const { owner } = await makeProject('route-arch-404');
    const fake = '00000000-0000-4000-8000-000000000000';
    mockGetSession.mockResolvedValue({ id: owner.id });

    const res = await POST(makeRequest(fake, 'POST'), {
      params: Promise.resolve({ id: fake }),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  test('returns 403 for a nonexistent project when the caller has no project or team relationship', async () => {
    const stranger = await createTestUser(`str-fake-${Date.now()}@test.com`, 'Stranger');
    const fake = '00000000-0000-4000-8000-000000000000';
    mockGetSession.mockResolvedValue({ id: stranger.id });

    const res = await POST(makeRequest(fake, 'POST'), {
      params: Promise.resolve({ id: fake }),
    });

    expect(res.status).toBe(403);
  });

  test('returns 401 when unauthenticated', async () => {
    const { project } = await makeProject('route-arch-401');
    mockGetSession.mockResolvedValue(null);

    const res = await POST(makeRequest(project.id, 'POST'), {
      params: Promise.resolve({ id: project.id }),
    });

    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/projects/[id]/archive', () => {
  test('unarchives an archived project for the project owner', async () => {
    const { owner, team, project } = await makeProject('route-unarch-ok');
    await insertIssue({
      teamId: team.id,
      projectId: project.id,
      reporterId: owner.id,
      projectKey: project.key,
      status: 'resolved',
    });
    await archiveProject(project.id, owner.id);
    mockGetSession.mockResolvedValue({ id: owner.id });

    const res = await DELETE(makeRequest(project.id, 'DELETE'), {
      params: Promise.resolve({ id: project.id }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.project.status).toBe('active');
  });

  test('returns 403 when the user lacks PROJECT_ARCHIVE', async () => {
    const { owner, team, project } = await makeProject('route-unarch-403');
    await insertIssue({
      teamId: team.id,
      projectId: project.id,
      reporterId: owner.id,
      projectKey: project.key,
      status: 'resolved',
    });
    await archiveProject(project.id, owner.id);
    const stranger = await createTestUser(`str-un-${Date.now()}@test.com`, 'Stranger');
    mockGetSession.mockResolvedValue({ id: stranger.id });

    const res = await DELETE(makeRequest(project.id, 'DELETE'), {
      params: Promise.resolve({ id: project.id }),
    });

    expect(res.status).toBe(403);
  });

  test('returns 404 for a nonexistent project when the caller already belongs to a project', async () => {
    const { owner } = await makeProject('route-unarch-404');
    const fake = '00000000-0000-4000-8000-000000000000';
    mockGetSession.mockResolvedValue({ id: owner.id });

    const res = await DELETE(makeRequest(fake, 'DELETE'), {
      params: Promise.resolve({ id: fake }),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  test('returns 403 for a nonexistent project when the caller has no project or team relationship', async () => {
    const stranger = await createTestUser(`str-un-fake-${Date.now()}@test.com`, 'Stranger');
    const fake = '00000000-0000-4000-8000-000000000000';
    mockGetSession.mockResolvedValue({ id: stranger.id });

    const res = await DELETE(makeRequest(fake, 'DELETE'), {
      params: Promise.resolve({ id: fake }),
    });

    expect(res.status).toBe(403);
  });
});
