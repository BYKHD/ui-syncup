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
import { createProject } from '@/server/projects/project-service';

const mockGetSession = vi.fn();

vi.mock('@/server/auth/session', () => ({ getSession: mockGetSession }));

const { PATCH } = await import('../route');

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

function makePatchRequest(projectId: string, body: object) {
  return new NextRequest(`http://localhost/api/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('PATCH /api/projects/[id]', () => {
  test('rejects status-only updates and leaves the project active', async () => {
    const { owner, project } = await makeProject('patch-bypass');
    mockGetSession.mockResolvedValue({ id: owner.id });

    const res = await PATCH(makePatchRequest(project.id, { status: 'archived' }), {
      params: Promise.resolve({ id: project.id }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('INVALID_INPUT');

    const [row] = await db.select().from(projects).where(eq(projects.id, project.id));
    expect(row.status).toBe('active');
  });

  test('still allows legitimate project name updates', async () => {
    const { owner, project } = await makeProject('patch-name');
    mockGetSession.mockResolvedValue({ id: owner.id });

    const res = await PATCH(makePatchRequest(project.id, { name: 'Renamed' }), {
      params: Promise.resolve({ id: project.id }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.project.name).toBe('Renamed');
  });
});
