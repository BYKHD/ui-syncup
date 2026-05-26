/**
 * Integration tests for the archive write-freeze.
 *
 * Verifies that once a project's status flips to 'archived', the two
 * permission chokepoints — `hasPermission` (issue/project mutations) and
 * `getAnnotationPermissions` (annotation/comment mutations) — deny writes
 * even for owners. Reads remain permitted, and `project:archive` itself
 * stays granted so owners can unarchive.
 */

import { afterEach, describe, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
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
import { createTeam } from '@/server/teams/team-service';
import {
  createProject,
  archiveProject,
} from '@/server/projects/project-service';
import { hasPermission } from '@/server/auth/rbac';
import { getAnnotationPermissions } from '@/server/annotations/permission-utils';
import { PERMISSIONS } from '@/config/roles';

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
async function insertResolvedIssue({
  teamId,
  projectId,
  reporterId,
  projectKey,
}: {
  teamId: string;
  projectId: string;
  reporterId: string;
  projectKey: string;
}) {
  const issueNumber = ++issueSeq;
  await db.insert(issues).values({
    teamId,
    projectId,
    reporterId,
    issueKey: `${projectKey}-${issueNumber}`,
    issueNumber,
    title: `Issue ${issueNumber}`,
    status: 'resolved',
    type: 'bug',
    priority: 'medium',
  });
}

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

async function archive(projectId: string, actorId: string, teamId: string, reporterId: string, projectKey: string) {
  // archiveProject requires at least one issue and all-resolved
  await insertResolvedIssue({ teamId, projectId, reporterId, projectKey });
  await archiveProject(projectId, actorId);
}

afterEach(async () => {
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
});

describe('archive freeze — hasPermission', () => {
  test('denies ISSUE_UPDATE for project owner once archived', async () => {
    const { owner, team, project } = await makeProject('hp-update');

    // Active project: owner has issue:update
    expect(
      await hasPermission({
        userId: owner.id,
        permission: PERMISSIONS.ISSUE_UPDATE,
        resourceId: project.id,
        resourceType: 'project',
      }),
    ).toBe(true);

    await archive(project.id, owner.id, team.id, owner.id, project.key);

    // Archived project: same owner now denied
    expect(
      await hasPermission({
        userId: owner.id,
        permission: PERMISSIONS.ISSUE_UPDATE,
        resourceId: project.id,
        resourceType: 'project',
      }),
    ).toBe(false);
  });

  test('still grants PROJECT_ARCHIVE on archived project (so owner can unarchive)', async () => {
    const { owner, team, project } = await makeProject('hp-unarchive');
    await archive(project.id, owner.id, team.id, owner.id, project.key);

    expect(
      await hasPermission({
        userId: owner.id,
        permission: PERMISSIONS.PROJECT_ARCHIVE,
        resourceId: project.id,
        resourceType: 'project',
      }),
    ).toBe(true);
  });

  test('still grants ISSUE_VIEW on archived project', async () => {
    const { owner, team, project } = await makeProject('hp-view');
    await archive(project.id, owner.id, team.id, owner.id, project.key);

    expect(
      await hasPermission({
        userId: owner.id,
        permission: PERMISSIONS.ISSUE_VIEW,
        resourceId: project.id,
        resourceType: 'project',
      }),
    ).toBe(true);
  });
});

describe('archive freeze — getAnnotationPermissions', () => {
  test('zeros out write flags on archived project, keeps canView', async () => {
    const { owner, team, project } = await makeProject('ap-freeze');

    // Active project baseline: owner can create/edit/etc.
    const active = await getAnnotationPermissions(owner.id, team.id, project.id);
    expect(active.canView).toBe(true);
    expect(active.canCreate).toBe(true);
    expect(active.canEditAll).toBe(true);

    await archive(project.id, owner.id, team.id, owner.id, project.key);

    const frozen = await getAnnotationPermissions(owner.id, team.id, project.id);
    expect(frozen.canView).toBe(true);
    expect(frozen.canCreate).toBe(false);
    expect(frozen.canEdit).toBe(false);
    expect(frozen.canEditAll).toBe(false);
    expect(frozen.canDelete).toBe(false);
    expect(frozen.canDeleteAll).toBe(false);
    expect(frozen.canComment).toBe(false);
  });
});
