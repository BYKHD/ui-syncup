/**
 * Integration Test: Project Invitation Service
 * 
 * Tests the end-to-end invitation flow for project invitations including:
 * - Creating invitations with correct expiration
 * - Revoking invitations with cancelledAt timestamp
 * - Resending invitations with new token and extended expiration
 * - Rate limiting enforcement
 * - Invitation acceptance flow
 * 
 * Requirements: 1.5, 4.2, 4.3
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { users, teams, teamMembers, projects, projectMembers, projectInvitations } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { createTeam } from '@/server/teams/team-service';
import { createProject } from '@/server/projects/project-service';
import { 
  createProjectInvitation, 
  revokeProjectInvitation, 
  resendProjectInvitation,
  acceptProjectInvitation,
  listProjectInvitations
} from '@/server/projects/invitation-service';
import { PROJECT_ROLES } from '@/config/roles';
import { createHash } from 'crypto';

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

describe('Integration Test: Project Invitation Service', () => {
  test('should create invitation with correct expiration', async () => {
    // Step 1: Create owner and team
    const owner = await createTestUser(
      `owner-create-${Date.now()}@example.com`,
      'Project Owner'
    );
    
    const team = await createTeam({
      name: 'Test Team',
      description: 'Testing project invitations',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);
    
    // Step 2: Create project
    const project = await createProject({
      teamId: team.id,
      name: 'Test Project',
      key: 'TEST',
      description: 'Testing invitations',
    }, owner.id);
    testProjectIds.push(project.id);
    
    // Step 3: Create invitation
    const inviteeEmail = `invitee-create-${Date.now()}@example.com`;
    const { invitation, token } = await createProjectInvitation({
      projectId: project.id,
      email: inviteeEmail,
      role: PROJECT_ROLES.PROJECT_DEVELOPER,
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);
    
    // Verify invitation details
    expect(invitation.id).toBeTruthy();
    expect(invitation.email).toBe(inviteeEmail);
    expect(invitation.role).toBe(PROJECT_ROLES.PROJECT_DEVELOPER);
    expect(invitation.status).toBe('pending');
    expect(invitation.invitedBy).toBe(owner.id);
    expect(invitation.expiresAt).toBeTruthy();
    expect(invitation.usedAt).toBeNull();
    expect(invitation.cancelledAt).toBeNull();
    expect(token).toBeTruthy();
    
    // Verify expiration is 7 days in the future
    const expiresAt = new Date(invitation.expiresAt);
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const timeDiff = Math.abs(expiresAt.getTime() - sevenDaysFromNow.getTime());
    expect(timeDiff).toBeLessThan(5000); // Within 5 seconds
    
    // Verify token hash is stored correctly
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const [dbInvitation] = await db
      .select()
      .from(projectInvitations)
      .where(eq(projectInvitations.id, invitation.id))
      .limit(1);
    
    expect(dbInvitation.tokenHash).toBe(tokenHash);
  });
  
  test('should revoke invitation and set cancelledAt timestamp', async () => {
    // Setup
    const owner = await createTestUser(
      `owner-revoke-${Date.now()}@example.com`,
      'Owner'
    );
    
    const team = await createTeam({
      name: 'Revoke Test Team',
      description: 'Testing revocation',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);
    
    const project = await createProject({
      teamId: team.id,
      name: 'Revoke Test Project',
      key: 'REV',
    }, owner.id);
    testProjectIds.push(project.id);
    
    const inviteeEmail = `invitee-revoke-${Date.now()}@example.com`;
    const { invitation } = await createProjectInvitation({
      projectId: project.id,
      email: inviteeEmail,
      role: PROJECT_ROLES.PROJECT_VIEWER,
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);
    
    // Verify invitation is pending before revoke
    expect(invitation.cancelledAt).toBeNull();
    
    // Revoke invitation
    await revokeProjectInvitation(invitation.id, owner.id);
    
    // Verify cancelledAt is set
    const [revokedInvitation] = await db
      .select()
      .from(projectInvitations)
      .where(eq(projectInvitations.id, invitation.id))
      .limit(1);
    
    expect(revokedInvitation.cancelledAt).toBeTruthy();
    expect(revokedInvitation.cancelledAt).toBeInstanceOf(Date);
    expect(revokedInvitation.usedAt).toBeNull();
  });
  
  test('should prevent revoking already used invitation', async () => {
    // Setup
    const owner = await createTestUser(
      `owner-used-${Date.now()}@example.com`,
      'Owner'
    );
    
    const team = await createTeam({
      name: 'Used Test Team',
      description: 'Testing used invitations',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);
    
    const project = await createProject({
      teamId: team.id,
      name: 'Used Test Project',
      key: 'USD',
    }, owner.id);
    testProjectIds.push(project.id);
    
    const inviteeEmail = `invitee-used-${Date.now()}@example.com`;
    const { invitation } = await createProjectInvitation({
      projectId: project.id,
      email: inviteeEmail,
      role: PROJECT_ROLES.PROJECT_DEVELOPER,
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);
    
    // Mark invitation as used
    await db
      .update(projectInvitations)
      .set({ usedAt: new Date() })
      .where(eq(projectInvitations.id, invitation.id));
    
    // Try to revoke used invitation - should fail
    await expect(
      revokeProjectInvitation(invitation.id, owner.id)
    ).rejects.toThrow('Invitation is no longer active');
  });
  
  test('should resend invitation with new token and extended expiration', async () => {
    // Setup
    const owner = await createTestUser(
      `owner-resend-${Date.now()}@example.com`,
      'Owner'
    );
    
    const team = await createTeam({
      name: 'Resend Test Team',
      description: 'Testing resend',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);
    
    const project = await createProject({
      teamId: team.id,
      name: 'Resend Test Project',
      key: 'RSD',
    }, owner.id);
    testProjectIds.push(project.id);
    
    const inviteeEmail = `invitee-resend-${Date.now()}@example.com`;
    const { invitation, token: originalToken } = await createProjectInvitation({
      projectId: project.id,
      email: inviteeEmail,
      role: PROJECT_ROLES.PROJECT_EDITOR,
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);
    
    const originalExpiresAt = invitation.expiresAt;
    const originalTokenHash = createHash('sha256').update(originalToken).digest('hex');
    
    // Wait a bit to ensure timestamps differ
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Resend invitation
    const { token: newToken } = await resendProjectInvitation(invitation.id, owner.id);
    
    // Get updated invitation from database
    const [updatedInvitation] = await db
      .select()
      .from(projectInvitations)
      .where(eq(projectInvitations.id, invitation.id))
      .limit(1);
    
    // Verify new token is different
    expect(newToken).toBeTruthy();
    expect(newToken).not.toBe(originalToken);
    
    const newTokenHash = createHash('sha256').update(newToken).digest('hex');
    expect(newTokenHash).not.toBe(originalTokenHash);
    expect(updatedInvitation.tokenHash).toBe(newTokenHash);
    
    // Verify expiration is extended
    expect(new Date(updatedInvitation.expiresAt).getTime()).toBeGreaterThan(
      new Date(originalExpiresAt).getTime()
    );
    
    // Verify new expiration is approximately 7 days from now
    const newExpiresAt = new Date(updatedInvitation.expiresAt);
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const timeDiff = Math.abs(newExpiresAt.getTime() - sevenDaysFromNow.getTime());
    expect(timeDiff).toBeLessThan(5000); // Within 5 seconds
  });
  
  test('should prevent resending cancelled invitation', async () => {
    // Setup
    const owner = await createTestUser(
      `owner-cancelled-${Date.now()}@example.com`,
      'Owner'
    );
    
    const team = await createTeam({
      name: 'Cancelled Test Team',
      description: 'Testing cancelled invitations',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);
    
    const project = await createProject({
      teamId: team.id,
      name: 'Cancelled Test Project',
      key: 'CAN',
    }, owner.id);
    testProjectIds.push(project.id);
    
    const inviteeEmail = `invitee-cancelled-${Date.now()}@example.com`;
    const { invitation } = await createProjectInvitation({
      projectId: project.id,
      email: inviteeEmail,
      role: PROJECT_ROLES.PROJECT_DEVELOPER,
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);
    
    // Revoke invitation
    await revokeProjectInvitation(invitation.id, owner.id);
    
    // Try to resend cancelled invitation - should fail
    await expect(
      resendProjectInvitation(invitation.id, owner.id)
    ).rejects.toThrow('Invitation is no longer active');
  });
  
  test('should enforce rate limiting (10 invitations per hour)', async () => {
    // Setup
    const owner = await createTestUser(
      `owner-ratelimit-${Date.now()}@example.com`,
      'Owner'
    );
    
    const team = await createTeam({
      name: 'Rate Limit Test Team',
      description: 'Testing rate limits',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);
    
    const project = await createProject({
      teamId: team.id,
      name: 'Rate Limit Test Project',
      key: 'RLT',
    }, owner.id);
    testProjectIds.push(project.id);
    
    // Create 10 invitations (the limit)
    for (let i = 0; i < 10; i++) {
      const { invitation } = await createProjectInvitation({
        projectId: project.id,
        email: `invitee-${i}-${Date.now()}@example.com`,
        role: PROJECT_ROLES.PROJECT_DEVELOPER,
        invitedBy: owner.id,
      });
      testInvitationIds.push(invitation.id);
    }
    
    // 11th invitation should be rate limited
    await expect(
      createProjectInvitation({
        projectId: project.id,
        email: `invitee-11-${Date.now()}@example.com`,
        role: PROJECT_ROLES.PROJECT_DEVELOPER,
        invitedBy: owner.id,
      })
    ).rejects.toThrow('Invitation rate limit exceeded');
  });
  
  test('should accept invitation and create project member', async () => {
    // Setup
    const owner = await createTestUser(
      `owner-accept-${Date.now()}@example.com`,
      'Owner'
    );
    
    const team = await createTeam({
      name: 'Accept Test Team',
      description: 'Testing acceptance',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);
    
    const project = await createProject({
      teamId: team.id,
      name: 'Accept Test Project',
      key: 'ACC',
    }, owner.id);
    testProjectIds.push(project.id);
    
    const inviteeEmail = `invitee-accept-${Date.now()}@example.com`;
    const { invitation, token } = await createProjectInvitation({
      projectId: project.id,
      email: inviteeEmail,
      role: PROJECT_ROLES.PROJECT_EDITOR,
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);
    
    // Create invitee user
    const invitee = await createTestUser(inviteeEmail, 'Invitee User');
    
    // Accept invitation
    await acceptProjectInvitation(token, invitee.id);
    
    // Verify invitation is marked as used
    const [usedInvitation] = await db
      .select()
      .from(projectInvitations)
      .where(eq(projectInvitations.id, invitation.id))
      .limit(1);
    
    expect(usedInvitation.usedAt).toBeTruthy();
    expect(usedInvitation.usedAt).toBeInstanceOf(Date);
    
    // Verify user is now a project member
    const [member] = await db
      .select()
      .from(projectMembers)
      .where(and(
        eq(projectMembers.projectId, project.id),
        eq(projectMembers.userId, invitee.id)
      ))
      .limit(1);
    
    expect(member).toBeTruthy();
    expect(member.projectId).toBe(project.id);
    expect(member.userId).toBe(invitee.id);
    expect(member.role).toBe(PROJECT_ROLES.PROJECT_EDITOR);
  });
  
  test('should reject expired invitation on acceptance', async () => {
    // Setup
    const owner = await createTestUser(
      `owner-expired-${Date.now()}@example.com`,
      'Owner'
    );
    
    const team = await createTeam({
      name: 'Expired Test Team',
      description: 'Testing expiration',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);
    
    const project = await createProject({
      teamId: team.id,
      name: 'Expired Test Project',
      key: 'EXP',
    }, owner.id);
    testProjectIds.push(project.id);
    
    const inviteeEmail = `invitee-expired-${Date.now()}@example.com`;
    const { invitation, token } = await createProjectInvitation({
      projectId: project.id,
      email: inviteeEmail,
      role: PROJECT_ROLES.PROJECT_DEVELOPER,
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);
    
    // Manually expire the invitation
    await db
      .update(projectInvitations)
      .set({ expiresAt: new Date(Date.now() - 1000) }) // 1 second ago
      .where(eq(projectInvitations.id, invitation.id));
    
    // Create invitee user
    const invitee = await createTestUser(inviteeEmail, 'Invitee');
    
    // Try to accept expired invitation - should fail
    await expect(
      acceptProjectInvitation(token, invitee.id)
    ).rejects.toThrow('Invitation expired');
  });
  
  test('should list project invitations with status', async () => {
    // Setup
    const owner = await createTestUser(
      `owner-list-${Date.now()}@example.com`,
      'Owner'
    );
    
    const team = await createTeam({
      name: 'List Test Team',
      description: 'Testing list',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);
    
    const project = await createProject({
      teamId: team.id,
      name: 'List Test Project',
      key: 'LST',
    }, owner.id);
    testProjectIds.push(project.id);
    
    // Create multiple invitations
    const { invitation: inv1 } = await createProjectInvitation({
      projectId: project.id,
      email: `pending-${Date.now()}@example.com`,
      role: PROJECT_ROLES.PROJECT_DEVELOPER,
      invitedBy: owner.id,
    });
    testInvitationIds.push(inv1.id);
    
    const { invitation: inv2 } = await createProjectInvitation({
      projectId: project.id,
      email: `cancelled-${Date.now()}@example.com`,
      role: PROJECT_ROLES.PROJECT_VIEWER,
      invitedBy: owner.id,
    });
    testInvitationIds.push(inv2.id);
    await revokeProjectInvitation(inv2.id, owner.id);
    
    // List invitations
    const invitations = await listProjectInvitations(project.id);
    
    // Verify results
    expect(invitations).toHaveLength(2);
    
    const pendingInv = invitations.find(i => i.id === inv1.id);
    expect(pendingInv).toBeTruthy();
    expect(pendingInv?.status).toBe('pending');
    
    const cancelledInv = invitations.find(i => i.id === inv2.id);
    expect(cancelledInv).toBeTruthy();
    expect(cancelledInv?.status).toBe('declined');
  });
  
  test('should prevent duplicate pending invitations', async () => {
    // Setup
    const owner = await createTestUser(
      `owner-duplicate-${Date.now()}@example.com`,
      'Owner'
    );
    
    const team = await createTeam({
      name: 'Duplicate Test Team',
      description: 'Testing duplicates',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);
    
    const project = await createProject({
      teamId: team.id,
      name: 'Duplicate Test Project',
      key: 'DUP',
    }, owner.id);
    testProjectIds.push(project.id);
    
    const inviteeEmail = `duplicate-${Date.now()}@example.com`;
    
    // Create first invitation
    const { invitation } = await createProjectInvitation({
      projectId: project.id,
      email: inviteeEmail,
      role: PROJECT_ROLES.PROJECT_DEVELOPER,
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);
    
    // Try to create duplicate invitation - should fail
    await expect(
      createProjectInvitation({
        projectId: project.id,
        email: inviteeEmail,
        role: PROJECT_ROLES.PROJECT_VIEWER,
        invitedBy: owner.id,
      })
    ).rejects.toThrow('An active invitation already exists for this email');
  });
  
  test('should prevent inviting existing project members', async () => {
    // Setup
    const owner = await createTestUser(
      `owner-existing-${Date.now()}@example.com`,
      'Owner'
    );
    
    const member = await createTestUser(
      `member-existing-${Date.now()}@example.com`,
      'Existing Member'
    );
    
    const team = await createTeam({
      name: 'Existing Test Team',
      description: 'Testing existing members',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);
    
    const project = await createProject({
      teamId: team.id,
      name: 'Existing Test Project',
      key: 'EXT',
    }, owner.id);
    testProjectIds.push(project.id);
    
    // Add member to project
    await db.insert(projectMembers).values({
      projectId: project.id,
      userId: member.id,
      role: PROJECT_ROLES.PROJECT_DEVELOPER,
    });
    
    // Try to invite existing member - should fail
    await expect(
      createProjectInvitation({
        projectId: project.id,
        email: member.email,
        role: PROJECT_ROLES.PROJECT_EDITOR,
        invitedBy: owner.id,
      })
    ).rejects.toThrow('User is already a member of this project');
  });
});
