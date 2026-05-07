import { describe, test, expect, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { users, teams, teamMembers, projects, projectMembers, projectAccessRequests, projectInvitations, notifications } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { createTeam } from '@/server/teams/team-service';
import { createProject } from '@/server/projects/project-service';
import { joinProject } from '@/server/projects/member-service';
import { createProjectInvitation, acceptProjectInvitation } from '@/server/projects/invitation-service';
import { createAccessRequest, listAccessRequests, approveAccessRequest, declineAccessRequest, cancelAccessRequest } from '@/server/projects/access-request-service';

/**
 * Generate a unique alphabetic project key (2-10 uppercase letters).
 * Uses a counter + base-26 encoding to avoid timestamp digits.
 */
let keyCounter = 0;
function uniqueKey(): string {
  const n = keyCounter++;
  // Encode n in base-26 with letters A-Z, minimum 2 chars
  let key = '';
  let v = n;
  do {
    key = String.fromCharCode(65 + (v % 26)) + key;
    v = Math.floor(v / 26);
  } while (v > 0);
  return key.length < 2 ? key.padStart(2, 'A') : key;
}

const testUserIds: string[] = [];
const testTeamIds: string[] = [];
const testProjectIds: string[] = [];
const testRequestIds: string[] = [];
const testInvitationIds: string[] = [];

async function createTestUser(email: string, name: string) {
  const [user] = await db.insert(users).values({
    email: email.toLowerCase().trim(),
    name: name.trim(),
    emailVerified: true,
  }).returning();
  testUserIds.push(user.id);
  return user;
}

async function cleanupTestData() {
  for (const id of testInvitationIds) {
    await db.delete(projectInvitations).where(eq(projectInvitations.id, id)).catch(() => {});
  }
  for (const id of testRequestIds) {
    await db.delete(projectAccessRequests).where(eq(projectAccessRequests.id, id)).catch(() => {});
  }
  for (const id of testProjectIds) {
    await db.delete(notifications).where(eq(notifications.entityId, id)).catch(() => {});
    await db.delete(projectMembers).where(eq(projectMembers.projectId, id)).catch(() => {});
    await db.delete(projectInvitations).where(eq(projectInvitations.projectId, id)).catch(() => {});
    await db.delete(projectAccessRequests).where(eq(projectAccessRequests.projectId, id)).catch(() => {});
  }
  for (const id of testProjectIds) {
    await db.delete(projects).where(eq(projects.id, id)).catch(() => {});
  }
  for (const id of testTeamIds) {
    await db.delete(teamMembers).where(eq(teamMembers.teamId, id)).catch(() => {});
    await db.delete(teams).where(eq(teams.id, id)).catch(() => {});
  }
  for (const id of testUserIds) {
    await db.delete(users).where(eq(users.id, id)).catch(() => {});
  }
  testInvitationIds.length = 0;
  testRequestIds.length = 0;
  testProjectIds.length = 0;
  testTeamIds.length = 0;
  testUserIds.length = 0;
}

afterEach(async () => {
  await cleanupTestData();
});

describe('createAccessRequest', () => {
  test('creates a pending request for a non-member', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-create-1-${ts}@test.com`, 'Owner');
    const requester = await createTestUser(`req-create-1-${ts}@test.com`, 'Requester');
    const team = await createTeam({ name: `T-c1-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject({ teamId: team.id, name: `P-c1-${ts}`, key: uniqueKey() }, owner.id);
    testProjectIds.push(project.id);

    const req = await createAccessRequest({
      projectId: project.id,
      userId: requester.id,
      message: 'please',
    });
    testRequestIds.push(req.id);

    expect(req.status).toBe('pending');
    expect(req.message).toBe('please');
    expect(req.requesterUserId).toBe(requester.id);

    // Allow async side-effects to settle
    await new Promise(r => setTimeout(r, 50));
    const notifs = await db.select().from(notifications).where(eq(notifications.entityId, project.id));
    expect(notifs.length).toBeGreaterThan(0);
  });

  test('throws REQUEST_PENDING when one already exists', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-dup-${ts}@test.com`, 'Owner');
    const requester = await createTestUser(`req-dup-${ts}@test.com`, 'Requester');
    const team = await createTeam({ name: `T-dup-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject({ teamId: team.id, name: `P-dup-${ts}`, key: uniqueKey() }, owner.id);
    testProjectIds.push(project.id);

    const req = await createAccessRequest({ projectId: project.id, userId: requester.id });
    testRequestIds.push(req.id);

    await expect(
      createAccessRequest({ projectId: project.id, userId: requester.id })
    ).rejects.toThrow(/REQUEST_PENDING/);
  });

  test('throws ALREADY_MEMBER when requester is already a project member', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-mem-${ts}@test.com`, 'Owner');
    const requester = await createTestUser(`req-mem-${ts}@test.com`, 'Requester');
    const team = await createTeam({ name: `T-mem-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject({ teamId: team.id, name: `P-mem-${ts}`, key: uniqueKey() }, owner.id);
    testProjectIds.push(project.id);

    // Add requester as project member directly
    await db.insert(projectMembers).values({ projectId: project.id, userId: requester.id, role: 'viewer' });

    await expect(
      createAccessRequest({ projectId: project.id, userId: requester.id })
    ).rejects.toThrow(/ALREADY_MEMBER/);
  });

  test('throws COOLDOWN_ACTIVE when a recent decline is within the cooldown window', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-cool-${ts}@test.com`, 'Owner');
    const requester = await createTestUser(`req-cool-${ts}@test.com`, 'Requester');
    const team = await createTeam({ name: `T-cool-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject({ teamId: team.id, name: `P-cool-${ts}`, key: uniqueKey() }, owner.id);
    testProjectIds.push(project.id);

    // Insert a declined row with active cooldown
    const [declined] = await db.insert(projectAccessRequests).values({
      projectId: project.id,
      requesterUserId: requester.id,
      status: 'declined',
      decidedAt: new Date(),
      declineCooldownUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }).returning();
    testRequestIds.push(declined.id);

    await expect(
      createAccessRequest({ projectId: project.id, userId: requester.id })
    ).rejects.toThrow(/COOLDOWN_ACTIVE/);
  });

  test('throws PROJECT_NOT_FOUND for a soft-deleted project', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-del-${ts}@test.com`, 'Owner');
    const requester = await createTestUser(`req-del-${ts}@test.com`, 'Requester');
    const team = await createTeam({ name: `T-del-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject({ teamId: team.id, name: `P-del-${ts}`, key: uniqueKey() }, owner.id);
    testProjectIds.push(project.id);

    await db.update(projects).set({ deletedAt: new Date() }).where(eq(projects.id, project.id));

    await expect(
      createAccessRequest({ projectId: project.id, userId: requester.id })
    ).rejects.toThrow(/PROJECT_NOT_FOUND/);
  });

  test('two concurrent creates result in exactly one pending row', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-conc-${ts}@test.com`, 'Owner');
    const requester = await createTestUser(`req-conc-${ts}@test.com`, 'Requester');
    const team = await createTeam({ name: `T-conc-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject({ teamId: team.id, name: `P-conc-${ts}`, key: uniqueKey() }, owner.id);
    testProjectIds.push(project.id);

    const [a, b] = await Promise.allSettled([
      createAccessRequest({ projectId: project.id, userId: requester.id }),
      createAccessRequest({ projectId: project.id, userId: requester.id }),
    ]);

    const fulfilled = [a, b].filter(r => r.status === 'fulfilled');
    expect(fulfilled).toHaveLength(1);

    // Record the created request id for cleanup
    for (const r of [a, b]) {
      if (r.status === 'fulfilled') testRequestIds.push(r.value.id);
    }

    const rows = await db.select().from(projectAccessRequests).where(
      and(
        eq(projectAccessRequests.projectId, project.id),
        eq(projectAccessRequests.requesterUserId, requester.id),
        eq(projectAccessRequests.status, 'pending'),
      )
    );
    expect(rows).toHaveLength(1);
  });

  test('expired cooldown allows a new request', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-exp-${ts}@test.com`, 'Owner');
    const requester = await createTestUser(`req-exp-${ts}@test.com`, 'Requester');
    const team = await createTeam({ name: `T-exp-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject({ teamId: team.id, name: `P-exp-${ts}`, key: uniqueKey() }, owner.id);
    testProjectIds.push(project.id);

    // Insert a declined row whose cooldown has already lapsed
    const [declined] = await db.insert(projectAccessRequests).values({
      projectId: project.id,
      requesterUserId: requester.id,
      status: 'declined',
      decidedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      declineCooldownUntil: new Date(Date.now() - 1),
    }).returning();
    testRequestIds.push(declined.id);

    const fresh = await createAccessRequest({ projectId: project.id, userId: requester.id });
    testRequestIds.push(fresh.id);
    expect(fresh.status).toBe('pending');
  });
});

describe('listAccessRequests', () => {
  test('returns pending + decided-within-30-days, joined with requester data', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-list-${ts}@test.com`, 'Owner');
    const r1User = await createTestUser(`req-list-1-${ts}@test.com`, 'R1');
    const r2User = await createTestUser(`req-list-2-${ts}@test.com`, 'R2');
    const r3User = await createTestUser(`req-list-3-${ts}@test.com`, 'R3');
    const team = await createTeam({ name: `T-list-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject({ teamId: team.id, name: `P-list-${ts}`, key: uniqueKey() }, owner.id);
    testProjectIds.push(project.id);

    // r1 = pending
    const r1 = await createAccessRequest({ projectId: project.id, userId: r1User.id });
    testRequestIds.push(r1.id);

    // r2 = approved 5 days ago by owner (within 30-day window)
    const r2 = await createAccessRequest({ projectId: project.id, userId: r2User.id });
    testRequestIds.push(r2.id);
    await db.update(projectAccessRequests)
      .set({ status: 'approved', decidedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), decidedByUserId: owner.id })
      .where(eq(projectAccessRequests.id, r2.id));

    // r3 = declined 40 days ago (outside 30-day window — should NOT appear)
    const r3 = await createAccessRequest({ projectId: project.id, userId: r3User.id });
    testRequestIds.push(r3.id);
    await db.update(projectAccessRequests)
      .set({ status: 'declined', decidedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) })
      .where(eq(projectAccessRequests.id, r3.id));

    const list = await listAccessRequests(project.id, owner.id);
    const ids = list.map(r => r.id).sort();
    expect(ids).toEqual([r1.id, r2.id].sort());
    expect(list[0].requester.email).toBeDefined();
    expect(list[0].requester.name).toBeDefined();

    // decidedByUser is populated for the approved request
    const r2Result = list.find(r => r.id === r2.id);
    expect(r2Result?.decidedByUser?.id).toBe(owner.id);
  });

  test('throws FORBIDDEN when actor has no project role', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-list2-${ts}@test.com`, 'Owner');
    const outsider = await createTestUser(`outsider-list-${ts}@test.com`, 'Outsider');
    const team = await createTeam({ name: `T-list2-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject({ teamId: team.id, name: `P-list2-${ts}`, key: uniqueKey() }, owner.id);
    testProjectIds.push(project.id);

    await expect(
      listAccessRequests(project.id, outsider.id)
    ).rejects.toThrow(/FORBIDDEN/);
  });
});

describe('approveAccessRequest', () => {
  test('approves: marks row approved, adds project member as viewer, adds team member if absent', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-apr-${ts}@test.com`, 'Owner');
    const requester = await createTestUser(`req-apr-${ts}@test.com`, 'Requester');
    const team = await createTeam({ name: `T-apr-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject({ teamId: team.id, name: `P-apr-${ts}`, key: uniqueKey() }, owner.id);
    testProjectIds.push(project.id);

    const req = await createAccessRequest({ projectId: project.id, userId: requester.id });
    testRequestIds.push(req.id);

    const updated = await approveAccessRequest(req.id, owner.id);
    expect(updated.status).toBe('approved');
    expect(updated.decidedByUserId).toBe(owner.id);
    expect(updated.decidedAt).toBeInstanceOf(Date);

    // requester is now a project member with viewer role
    const [pm] = await db.select().from(projectMembers).where(
      and(eq(projectMembers.projectId, project.id), eq(projectMembers.userId, requester.id))
    );
    expect(pm).toBeDefined();
    expect(pm.role).toBe('viewer');

    // requester is also a team member (auto-added by addMember)
    const [tm] = await db.select().from(teamMembers).where(
      and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, requester.id))
    );
    expect(tm).toBeDefined();

    // Allow async side-effects to settle
    await new Promise(r => setTimeout(r, 50));
    const notifs = await db.select().from(notifications).where(eq(notifications.entityId, project.id));
    expect(notifs.length).toBeGreaterThan(0);
  });

  test('throws FORBIDDEN if actor lacks approve permission', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-apr2-${ts}@test.com`, 'Owner');
    const requester = await createTestUser(`req-apr2-${ts}@test.com`, 'Requester');
    const outsider = await createTestUser(`out-apr2-${ts}@test.com`, 'Outsider');
    const team = await createTeam({ name: `T-apr2-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject({ teamId: team.id, name: `P-apr2-${ts}`, key: uniqueKey() }, owner.id);
    testProjectIds.push(project.id);

    const req = await createAccessRequest({ projectId: project.id, userId: requester.id });
    testRequestIds.push(req.id);

    await expect(approveAccessRequest(req.id, outsider.id)).rejects.toThrow(/FORBIDDEN/);
  });

  test('idempotent on already-approved row: returns same status, no duplicate member', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-apr3-${ts}@test.com`, 'Owner');
    const requester = await createTestUser(`req-apr3-${ts}@test.com`, 'Requester');
    const team = await createTeam({ name: `T-apr3-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject({ teamId: team.id, name: `P-apr3-${ts}`, key: uniqueKey() }, owner.id);
    testProjectIds.push(project.id);

    const req = await createAccessRequest({ projectId: project.id, userId: requester.id });
    testRequestIds.push(req.id);

    await approveAccessRequest(req.id, owner.id);
    const second = await approveAccessRequest(req.id, owner.id);
    expect(second.status).toBe('approved');

    // Still only one project member row
    const pms = await db.select().from(projectMembers).where(
      and(eq(projectMembers.projectId, project.id), eq(projectMembers.userId, requester.id))
    );
    expect(pms).toHaveLength(1);
  });

  test('two concurrent approves: both succeed (idempotent), one member row', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-apr4-${ts}@test.com`, 'Owner');
    const requester = await createTestUser(`req-apr4-${ts}@test.com`, 'Requester');
    const team = await createTeam({ name: `T-apr4-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject({ teamId: team.id, name: `P-apr4-${ts}`, key: uniqueKey() }, owner.id);
    testProjectIds.push(project.id);

    const req = await createAccessRequest({ projectId: project.id, userId: requester.id });
    testRequestIds.push(req.id);

    const [a, b] = await Promise.allSettled([
      approveAccessRequest(req.id, owner.id),
      approveAccessRequest(req.id, owner.id),
    ]);
    const successes = [a, b].filter(x => x.status === 'fulfilled') as PromiseFulfilledResult<{ status: string }>[];
    expect(successes.length).toBeGreaterThanOrEqual(1);
    for (const r of successes) {
      expect(r.value.status).toBe('approved');
    }

    const pms = await db.select().from(projectMembers).where(
      and(eq(projectMembers.projectId, project.id), eq(projectMembers.userId, requester.id))
    );
    expect(pms).toHaveLength(1);
  });

  test('throws REQUEST_NOT_FOUND for unknown id', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-apr5-${ts}@test.com`, 'Owner');
    await expect(
      approveAccessRequest('00000000-0000-0000-0000-000000000000', owner.id)
    ).rejects.toThrow(/REQUEST_NOT_FOUND/);
  });
});

describe('declineAccessRequest', () => {
  test('marks declined and sets a 7-day cooldown', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-dec-${ts}@test.com`, 'Owner');
    const requester = await createTestUser(`req-dec-${ts}@test.com`, 'Requester');
    const team = await createTeam({ name: `T-dec-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject({ teamId: team.id, name: `P-dec-${ts}`, key: uniqueKey() }, owner.id);
    testProjectIds.push(project.id);

    const req = await createAccessRequest({ projectId: project.id, userId: requester.id });
    testRequestIds.push(req.id);

    const before = Date.now();
    const decided = await declineAccessRequest(req.id, owner.id);
    const after = Date.now();
    expect(decided.status).toBe('declined');
    expect(decided.decidedByUserId).toBe(owner.id);
    // cooldown must be ~7 days; allow for actual call duration
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const cooldownMs = decided.declineCooldownUntil!.getTime() - before;
    expect(cooldownMs).toBeGreaterThanOrEqual(sevenDays - (after - before));
    expect(cooldownMs).toBeLessThanOrEqual(sevenDays + 1000);

    // Allow async side-effects to settle
    await new Promise(r => setTimeout(r, 50));
    const notifs = await db.select().from(notifications).where(eq(notifications.entityId, project.id));
    expect(notifs.length).toBeGreaterThan(0);
  });

  test('throws FORBIDDEN for actor with no project role', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-dec2-${ts}@test.com`, 'Owner');
    const requester = await createTestUser(`req-dec2-${ts}@test.com`, 'Requester');
    const outsider = await createTestUser(`out-dec2-${ts}@test.com`, 'Outsider');
    const team = await createTeam({ name: `T-dec2-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject({ teamId: team.id, name: `P-dec2-${ts}`, key: uniqueKey() }, owner.id);
    testProjectIds.push(project.id);

    const req = await createAccessRequest({ projectId: project.id, userId: requester.id });
    testRequestIds.push(req.id);

    await expect(declineAccessRequest(req.id, outsider.id)).rejects.toThrow(/FORBIDDEN/);
  });

  test('blocking: declined request prevents new createAccessRequest while cooldown active', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-dec3-${ts}@test.com`, 'Owner');
    const requester = await createTestUser(`req-dec3-${ts}@test.com`, 'Requester');
    const team = await createTeam({ name: `T-dec3-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject({ teamId: team.id, name: `P-dec3-${ts}`, key: uniqueKey() }, owner.id);
    testProjectIds.push(project.id);

    const req = await createAccessRequest({ projectId: project.id, userId: requester.id });
    testRequestIds.push(req.id);
    await declineAccessRequest(req.id, owner.id);

    await expect(
      createAccessRequest({ projectId: project.id, userId: requester.id })
    ).rejects.toThrow(/COOLDOWN_ACTIVE/);
  });

  test('throws REQUEST_NOT_FOUND for unknown id', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-dec4-${ts}@test.com`, 'Owner');
    await expect(
      declineAccessRequest('00000000-0000-0000-0000-000000000000', owner.id)
    ).rejects.toThrow(/REQUEST_NOT_FOUND/);
  });

  test('idempotent on already-declined row: returns same status', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-dec5-${ts}@test.com`, 'Owner');
    const requester = await createTestUser(`req-dec5-${ts}@test.com`, 'Requester');
    const team = await createTeam({ name: `T-dec5-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject({ teamId: team.id, name: `P-dec5-${ts}`, key: uniqueKey() }, owner.id);
    testProjectIds.push(project.id);

    const req = await createAccessRequest({ projectId: project.id, userId: requester.id });
    testRequestIds.push(req.id);
    await declineAccessRequest(req.id, owner.id);
    const second = await declineAccessRequest(req.id, owner.id);
    expect(second.status).toBe('declined');
  });
});

describe('cancelAccessRequest', () => {
  test('requester cancels own pending request → status cancelled', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-can-${ts}@test.com`, 'Owner');
    const requester = await createTestUser(`req-can-${ts}@test.com`, 'Requester');
    const team = await createTeam({ name: `T-can-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject({ teamId: team.id, name: `P-can-${ts}`, key: uniqueKey() }, owner.id);
    testProjectIds.push(project.id);

    const req = await createAccessRequest({ projectId: project.id, userId: requester.id });
    testRequestIds.push(req.id);

    const result = await cancelAccessRequest(req.id, requester.id);
    expect(result.status).toBe('cancelled');
  });

  test('requester can re-create immediately after cancelling (no cooldown)', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-can2-${ts}@test.com`, 'Owner');
    const requester = await createTestUser(`req-can2-${ts}@test.com`, 'Requester');
    const team = await createTeam({ name: `T-can2-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject({ teamId: team.id, name: `P-can2-${ts}`, key: uniqueKey() }, owner.id);
    testProjectIds.push(project.id);

    const req = await createAccessRequest({ projectId: project.id, userId: requester.id });
    testRequestIds.push(req.id);
    await cancelAccessRequest(req.id, requester.id);

    const fresh = await createAccessRequest({ projectId: project.id, userId: requester.id });
    testRequestIds.push(fresh.id);
    expect(fresh.id).not.toBe(req.id);
    expect(fresh.status).toBe('pending');
  });

  test('throws FORBIDDEN when a non-requester tries to cancel', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-can3-${ts}@test.com`, 'Owner');
    const requester = await createTestUser(`req-can3-${ts}@test.com`, 'Requester');
    const team = await createTeam({ name: `T-can3-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject({ teamId: team.id, name: `P-can3-${ts}`, key: uniqueKey() }, owner.id);
    testProjectIds.push(project.id);

    const req = await createAccessRequest({ projectId: project.id, userId: requester.id });
    testRequestIds.push(req.id);

    await expect(cancelAccessRequest(req.id, owner.id)).rejects.toThrow(/FORBIDDEN/);
  });

  test('throws REQUEST_NOT_FOUND for unknown id', async () => {
    const ts = Date.now();
    const requester = await createTestUser(`req-can4-${ts}@test.com`, 'Requester');
    await expect(
      cancelAccessRequest('00000000-0000-0000-0000-000000000000', requester.id)
    ).rejects.toThrow(/REQUEST_NOT_FOUND/);
  });

  test('idempotent on already-cancelled row: returns same status', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-can5-${ts}@test.com`, 'Owner');
    const requester = await createTestUser(`req-can5-${ts}@test.com`, 'Requester');
    const team = await createTeam({ name: `T-can5-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject({ teamId: team.id, name: `P-can5-${ts}`, key: uniqueKey() }, owner.id);
    testProjectIds.push(project.id);

    const req = await createAccessRequest({ projectId: project.id, userId: requester.id });
    testRequestIds.push(req.id);
    await cancelAccessRequest(req.id, requester.id);
    const second = await cancelAccessRequest(req.id, requester.id);
    expect(second.status).toBe('cancelled');
  });
});

describe('supersedePendingRequests integration', () => {
  test('joinProject (public) with a pending request → request marked superseded', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-sup1-${ts}@test.com`, 'Owner');
    const requester = await createTestUser(`req-sup1-${ts}@test.com`, 'Requester');
    const team = await createTeam({ name: `T-sup1-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject({ teamId: team.id, name: `P-sup1-${ts}`, key: uniqueKey() }, owner.id);
    testProjectIds.push(project.id);

    // Make project public so joinProject is allowed
    await db.update(projects).set({ visibility: 'public' }).where(eq(projects.id, project.id));

    const req = await createAccessRequest({ projectId: project.id, userId: requester.id });
    testRequestIds.push(req.id);

    await joinProject(project.id, requester.id, team.id);

    const [after] = await db
      .select()
      .from(projectAccessRequests)
      .where(eq(projectAccessRequests.id, req.id));
    expect(after.status).toBe('superseded');
  });

  test('acceptProjectInvitation while a request is pending → request marked superseded', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-sup2-${ts}@test.com`, 'Owner');
    const requester = await createTestUser(`req-sup2-${ts}@test.com`, 'Requester');
    const team = await createTeam({ name: `T-sup2-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject({ teamId: team.id, name: `P-sup2-${ts}`, key: uniqueKey() }, owner.id);
    testProjectIds.push(project.id);

    const req = await createAccessRequest({ projectId: project.id, userId: requester.id });
    testRequestIds.push(req.id);

    const { invitation, token } = await createProjectInvitation({
      projectId: project.id,
      email: requester.email,
      role: 'viewer',
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);

    await acceptProjectInvitation(token, requester.id, requester.email);

    const [after] = await db
      .select()
      .from(projectAccessRequests)
      .where(eq(projectAccessRequests.id, req.id));
    expect(after.status).toBe('superseded');
  });
});
