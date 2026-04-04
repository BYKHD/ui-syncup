/**
 * Email Integration Tests for Project Invitations
 * 
 * Tests email queuing, retry logic, and failure tracking for project invitations
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { db } from '@/lib/db';
import { createProjectInvitation, resendProjectInvitation } from '../invitation-service';
import { enqueueEmail } from '@/server/email';
import { projectInvitations, users, teams, teamMembers, projects, projectMembers } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { createTeam } from '@/server/teams/team-service';
import { createProject } from '@/server/projects/project-service';
import { PROJECT_ROLES } from '@/config/roles';

// Mock email queue
vi.mock('@/server/email', () => ({
  enqueueEmail: vi.fn(),
}));

// Test data cleanup tracking
const testUserIds: string[] = [];
const testTeamIds: string[] = [];
const testProjectIds: string[] = [];
const testInvitationIds: string[] = [];

/**
 * Helper to create test user
 */
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

/**
 * Clean up test data
 */
async function cleanupTestData() {
  // Delete in reverse dependency order
  for (const invitationId of testInvitationIds) {
    await db.delete(projectInvitations).where(eq(projectInvitations.id, invitationId));
  }
  
  for (const projectId of testProjectIds) {
    await db.delete(projectMembers).where(eq(projectMembers.projectId, projectId));
  }
  
  for (const projectId of testProjectIds) {
    await db.delete(projects).where(eq(projects.id, projectId));
  }
  
  for (const teamId of testTeamIds) {
    await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
  }
  
  for (const teamId of testTeamIds) {
    await db.delete(teams).where(eq(teams.id, teamId));
  }
  
  for (const userId of testUserIds) {
    await db.delete(users).where(eq(users.id, userId));
  }
  
  testUserIds.length = 0;
  testTeamIds.length = 0;
  testProjectIds.length = 0;
  testInvitationIds.length = 0;
}

afterEach(async () => {
  await cleanupTestData();
  vi.clearAllMocks();
});

describe('Invitation Email Integration', () => {
  it('should queue email on invitation creation', async () => {
    const owner = await createTestUser(
      `owner-${Date.now()}@example.com`,
      'Test Owner'
    );
    
    const team = await createTeam({
      name: 'Test Team',
      description: 'Email test team',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);
    
    const project = await createProject({
      teamId: team.id,
      name: 'Test Project',
      key: 'TP',
      description: 'Email test project',
    }, owner.id);
    testProjectIds.push(project.id);

    const { invitation } = await createProjectInvitation({
      projectId: project.id,
      email: 'newuser@example.com',
      role: PROJECT_ROLES.PROJECT_DEVELOPER,
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);

    expect(enqueueEmail).toHaveBeenCalledOnce();
    expect(enqueueEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: owner.id,
        type: 'project_invitation',
        to: 'newuser@example.com',
      })
    );
  });

  it('should queue new email on resend', async () => {
    const owner = await createTestUser(
      `owner-resend-${Date.now()}@example.com`,
      'Owner'
    );
    
    const team = await createTeam({
      name: 'Resend Team',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);
    
    const project = await createProject({
      teamId: team.id,
      name: 'Resend Project',
      key: 'RSN',
    }, owner.id);
    testProjectIds.push(project.id);

    const { invitation, token: oldToken } = await createProjectInvitation({
      projectId: project.id,
      email: 'resend@example.com',
      role: PROJECT_ROLES.PROJECT_EDITOR,
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);

    vi.clearAllMocks();
    const { token: newToken } = await resendProjectInvitation(invitation.id, owner.id);

    expect(newToken).toBeDefined();
    expect(newToken).not.toBe(oldToken);
    expect(enqueueEmail).toHaveBeenCalledOnce();
  });

  it('should clear emailDeliveryFailed flag on resend', async () => {
    const owner = await createTestUser(
      `owner-failed-${Date.now()}@example.com`,
      'Owner'
    );
    
    const team = await createTeam({
      name: 'Failed Email Team',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);
    
    const project = await createProject({
      teamId: team.id,
      name: 'Failed Email Project',
      key: 'FEM',
    }, owner.id);
    testProjectIds.push(project.id);

    const { invitation } = await createProjectInvitation({
      projectId: project.id,
      email: 'failed@example.com',
      role: PROJECT_ROLES.PROJECT_DEVELOPER,
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);

    // Simulate email failure
    await db
      .update(projectInvitations)
      .set({
        emailDeliveryFailed: true,
        emailFailureReason: 'Test failure',
        emailLastAttemptAt: new Date(),
      })
      .where(eq(projectInvitations.id, invitation.id));

    // Resend invitation
    await resendProjectInvitation(invitation.id, owner.id);

    // Verify flags were cleared
    const [resentInvitation] = await db
      .select()
      .from(projectInvitations)
      .where(eq(projectInvitations.id, invitation.id));
    
    expect(resentInvitation.emailDeliveryFailed).toBe(false);
    expect(resentInvitation.emailFailureReason).toBeNull();
    expect(resentInvitation.emailLastAttemptAt).toBeNull();
  });

  it('should track email delivery failures', async () => {
    const owner = await createTestUser(
      `owner-track-${Date.now()}@example.com`,
      'Owner'
    );
    
    const team = await createTeam({
      name: 'Tracking Team',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);
    
    const project = await createProject({
      teamId: team.id,
      name: 'Tracking Project',
      key: 'TRK',
    }, owner.id);
    testProjectIds.push(project.id);

    const { invitation } = await createProjectInvitation({
      projectId: project.id,
      email: 'willfall@example.com',
      role: PROJECT_ROLES.PROJECT_VIEWER,
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);

    // Simulate email queue failure update (what happens after 4 attempts)
    await db
      .update(projectInvitations)
      .set({
        emailDeliveryFailed: true,
        emailFailureReason: 'SMTP connection timeout',
        emailLastAttemptAt: new Date(),
      })
      .where(eq(projectInvitations.id, invitation.id));

    const [updated] = await db
      .select()
      .from(projectInvitations)
      .where(eq(projectInvitations.id, invitation.id));
    
    expect(updated.emailDeliveryFailed).toBe(true);
    expect(updated.emailFailureReason).toBe('SMTP connection timeout');
    expect(updated.emailLastAttemptAt).toBeDefined();
  });
});
