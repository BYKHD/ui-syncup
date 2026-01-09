/**
 * Integration Test: Project Activity Logging
 *
 * Tests the activity logging integration for project invitations including:
 * - invitation_sent
 * - invitation_accepted
 * - invitation_declined
 * - invitation_revoked
 * - member_added (via invitation)
 */

import { describe, test, expect, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { users, teams, teamMembers, projects, projectMembers, projectInvitations, projectActivities } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { createTeam } from '@/server/teams/team-service';
import { createProject } from '@/server/projects/project-service';
import {
  createProjectInvitation,
  revokeProjectInvitation,
  acceptProjectInvitation,
  declineProjectInvitation
} from '@/server/projects/invitation-service';
import { PROJECT_ROLES } from '@/config/roles';

/**
 * Test data cleanup
 */
const testUserIds: string[] = [];
const testTeamIds: string[] = [];
const testProjectIds: string[] = [];
const testInvitationIds: string[] = [];

/**
 * Helper to create a test user
 */
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

/**
 * Helper to clean up test data
 */
async function cleanupTestData() {
  // Delete project activities
  for (const projectId of testProjectIds) {
    await db.delete(projectActivities).where(eq(projectActivities.projectId, projectId));
  }

  // Delete invitations
  for (const invitationId of testInvitationIds) {
    await db.delete(projectInvitations).where(eq(projectInvitations.id, invitationId));
  }

  // Delete project members
  for (const projectId of testProjectIds) {
    await db.delete(projectMembers).where(eq(projectMembers.projectId, projectId));
  }

  // Delete projects
  for (const projectId of testProjectIds) {
    await db.delete(projects).where(eq(projects.id, projectId));
  }

  // Delete team members
  for (const teamId of testTeamIds) {
    await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
  }

  // Delete teams
  for (const teamId of testTeamIds) {
    await db.delete(teams).where(eq(teams.id, teamId));
  }

  // Delete users
  for (const userId of testUserIds) {
    await db.delete(users).where(eq(users.id, userId));
  }

  testUserIds.length = 0;
  testTeamIds.length = 0;
  testProjectIds.length = 0;
  testInvitationIds.length = 0;
}

/**
 * Clean up after each test
 */
afterEach(async () => {
  await cleanupTestData();
});

describe('Integration Test: Project Activity Logging', () => {
  test('should log invitation_sent activity when creating invitation', async () => {
    // Setup
    const owner = await createTestUser(
      `owner-log-sent-${Date.now()}@example.com`,
      'Owner Log'
    );

    const team = await createTeam({
      name: 'Log Sent Team',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);

    const project = await createProject({
      teamId: team.id,
      name: 'Log Sent Project',
      key: 'LGS',
    }, owner.id);
    testProjectIds.push(project.id);

    const inviteeEmail = `invitee-log-sent-${Date.now()}@example.com`;

    // Act: Create invitation
    const { invitation } = await createProjectInvitation({
      projectId: project.id,
      email: inviteeEmail,
      role: PROJECT_ROLES.PROJECT_DEVELOPER,
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);

    // Assert: Check activity log
    const activities = await db
      .select()
      .from(projectActivities)
      .where(eq(projectActivities.projectId, project.id));

    expect(activities).toHaveLength(1);
    const activity = activities[0];

    expect(activity.type).toBe('invitation_sent');
    expect(activity.actorId).toBe(owner.id);
    expect(activity.teamId).toBe(team.id);
    expect(activity.projectId).toBe(project.id);

    // Verify metadata
    const metadata = activity.metadata as any;
    expect(metadata.invitationId).toBe(invitation.id);
    expect(metadata.email).toBe(inviteeEmail);
    expect(metadata.role).toBe(PROJECT_ROLES.PROJECT_DEVELOPER);
  });

  test('should log invitation_revoked activity when revoking invitation', async () => {
    // Setup
    const owner = await createTestUser(
      `owner-log-revoke-${Date.now()}@example.com`,
      'Owner Log Revoke'
    );

    const team = await createTeam({
      name: 'Log Revoke Team',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);

    const project = await createProject({
      teamId: team.id,
      name: 'Log Revoke Project',
      key: 'LGR',
    }, owner.id);
    testProjectIds.push(project.id);

    const inviteeEmail = `invitee-log-revoke-${Date.now()}@example.com`;
    const { invitation } = await createProjectInvitation({
      projectId: project.id,
      email: inviteeEmail,
      role: PROJECT_ROLES.PROJECT_VIEWER,
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);

    // Act: Revoke invitation
    await revokeProjectInvitation(invitation.id, owner.id);

    // Assert: Check activity log
    const activities = await db
      .select()
      .from(projectActivities)
      .where(eq(projectActivities.projectId, project.id))
      .orderBy(projectActivities.createdAt);

    // Should have 2 activities: sent and revoked
    expect(activities).toHaveLength(2);

    const revokeActivity = activities.find(a => a.type === 'invitation_revoked');
    expect(revokeActivity).toBeDefined();
    expect(revokeActivity?.actorId).toBe(owner.id);

    const metadata = revokeActivity?.metadata as any;
    expect(metadata.invitationId).toBe(invitation.id);
    expect(metadata.email).toBe(inviteeEmail);
  });

  test('should log invitation_accepted and member_added activities when accepting', async () => {
    // Setup
    const owner = await createTestUser(
      `owner-log-accept-${Date.now()}@example.com`,
      'Owner Log Accept'
    );

    const team = await createTeam({
      name: 'Log Accept Team',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);

    const project = await createProject({
      teamId: team.id,
      name: 'Log Accept Project',
      key: 'LGA',
    }, owner.id);
    testProjectIds.push(project.id);

    const inviteeEmail = `invitee-log-accept-${Date.now()}@example.com`;
    const { invitation, token } = await createProjectInvitation({
      projectId: project.id,
      email: inviteeEmail,
      role: PROJECT_ROLES.PROJECT_EDITOR,
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);

    const inviteeUser = await createTestUser(inviteeEmail, 'Invitee Log Accept');

    // Act: Accept invitation
    await acceptProjectInvitation(token, inviteeUser.id);

    // Assert: Check activity log
    const activities = await db
      .select()
      .from(projectActivities)
      .where(eq(projectActivities.projectId, project.id))
      .orderBy(projectActivities.createdAt);

    // expecting invitation_sent, invitation_accepted, member_added
    expect(activities.length).toBeGreaterThanOrEqual(3);

    const acceptActivity = activities.find(a => a.type === 'invitation_accepted');
    expect(acceptActivity).toBeDefined();
    expect(acceptActivity?.actorId).toBe(inviteeUser.id);

    const acceptMetadata = acceptActivity?.metadata as any;
    expect(acceptMetadata.invitationId).toBe(invitation.id);
    expect(acceptMetadata.userId).toBe(inviteeUser.id);
    expect(acceptMetadata.userName).toBe(inviteeUser.name);
    expect(acceptMetadata.role).toBe(PROJECT_ROLES.PROJECT_EDITOR);

    const memberAddedActivity = activities.find(a => a.type === 'member_added');
    expect(memberAddedActivity).toBeDefined();
    expect(memberAddedActivity?.actorId).toBe(inviteeUser.id); // For invitation acceptance, actor is the new member

    const memberAddedMetadata = memberAddedActivity?.metadata as any;
    expect(memberAddedMetadata.userId).toBe(inviteeUser.id);
    expect(memberAddedMetadata.role).toBe(PROJECT_ROLES.PROJECT_EDITOR);
    expect(memberAddedMetadata.addedVia).toBe('invitation');
  });

  test('should log invitation_declined activity when declining invitation', async () => {
    // Setup
    const owner = await createTestUser(
      `owner-log-decline-${Date.now()}@example.com`,
      'Owner Log Decline'
    );

    const team = await createTeam({
      name: 'Log Decline Team',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);

    const project = await createProject({
      teamId: team.id,
      name: 'Log Decline Project',
      key: 'LGD',
    }, owner.id);
    testProjectIds.push(project.id);

    const inviteeEmail = `invitee-log-decline-${Date.now()}@example.com`;
    const { invitation, token } = await createProjectInvitation({
      projectId: project.id,
      email: inviteeEmail,
      role: PROJECT_ROLES.PROJECT_DEVELOPER,
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);

    // Act: Decline invitation
    await declineProjectInvitation(token);

    // Assert: Check activity log
    const activities = await db
      .select()
      .from(projectActivities)
      .where(eq(projectActivities.projectId, project.id))
      .orderBy(projectActivities.createdAt);

    const declineActivity = activities.find(a => a.type === 'invitation_declined');
    expect(declineActivity).toBeDefined();
    expect(declineActivity?.actorId).toBeNull(); // No actor for decline

    const metadata = declineActivity?.metadata as any;
    expect(metadata.invitationId).toBe(invitation.id);
    expect(metadata.email).toBe(inviteeEmail);
  });
});
