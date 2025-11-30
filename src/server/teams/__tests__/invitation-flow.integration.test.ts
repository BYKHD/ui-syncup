/**
 * Integration Test: Complete Invitation Flow
 * 
 * Tests the end-to-end invitation flow including:
 * - Invitation creation and email sending
 * - Invitation acceptance
 * - Invitation expiration
 * - Rate limiting
 * 
 * Requirements: 2.1, 2.3, 2.5, 2A.5
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { users, teams, teamMembers, teamInvitations } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { createTeam } from '@/server/teams/team-service';
import { createInvitation, acceptInvitation, resendInvitation, cancelInvitation } from '@/server/teams/invitation-service';

/**
 * Test data cleanup
 */
const testUserIds: string[] = [];
const testTeamIds: string[] = [];
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
    await db.delete(teamInvitations).where(eq(teamInvitations.id, invitationId));
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
  testInvitationIds.length = 0;
}

/**
 * Clean up after each test
 */
afterEach(async () => {
  await cleanupTestData();
});

describe('Integration Test: Complete Invitation Flow', () => {
  test('should complete full invitation creation and acceptance flow', async () => {
    // Step 1: Create team owner
    const owner = await createTestUser(
      `owner-${Date.now()}@example.com`,
      'Team Owner'
    );
    
    // Step 2: Create team
    const team = await createTeam({
      name: 'Test Team',
      description: 'Testing invitations',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);
    
    // Step 3: Create invitation
    const inviteeEmail = `invitee-${Date.now()}@example.com`;
    const { invitation, token } = await createInvitation({
      teamId: team.id,
      email: inviteeEmail,
      operationalRole: 'TEAM_MEMBER',
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);
    
    expect(invitation.id).toBeTruthy();
    expect(invitation.email).toBe(inviteeEmail.toLowerCase());
    expect(invitation.operationalRole).toBe('TEAM_MEMBER');
    expect(invitation.managementRole).toBeNull();
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
    
    // Step 4: Create invitee user
    const invitee = await createTestUser(inviteeEmail, 'Invitee User');
    
    // Step 5: Accept invitation
    await acceptInvitation(token, invitee.id);
    
    // Step 6: Verify invitation is marked as used
    const [usedInvitation] = await db
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.id, invitation.id))
      .limit(1);
    
    expect(usedInvitation.usedAt).toBeTruthy();
    
    // Step 7: Verify invitee is now a team member
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, invitee.id))
      .limit(1);
    
    expect(member).toBeTruthy();
    expect(member.teamId).toBe(team.id);
    expect(member.operationalRole).toBe('TEAM_MEMBER');
    expect(member.managementRole).toBeNull();
    expect(member.invitedBy).toBe(owner.id);
  });
  
  test('should reject expired invitations', async () => {
    // Create team owner and team
    const owner = await createTestUser(
      `owner-exp-${Date.now()}@example.com`,
      'Owner'
    );
    
    const team = await createTeam({
      name: 'Expired Test Team',
      description: 'Testing expiration',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);
    
    // Create invitation
    const inviteeEmail = `invitee-exp-${Date.now()}@example.com`;
    const { invitation, token } = await createInvitation({
      teamId: team.id,
      email: inviteeEmail,
      operationalRole: 'TEAM_MEMBER',
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);
    
    // Manually expire the invitation
    await db
      .update(teamInvitations)
      .set({ expiresAt: new Date(Date.now() - 1000) }) // 1 second ago
      .where(eq(teamInvitations.id, invitation.id));
    
    // Create invitee user
    const invitee = await createTestUser(inviteeEmail, 'Invitee');
    
    // Try to accept expired invitation - should fail
    await expect(
      acceptInvitation(token, invitee.id)
    ).rejects.toThrow();
  });
  
  test('should reject already-used invitations', async () => {
    // Create team owner and team
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
    
    // Create invitation
    const inviteeEmail = `invitee-used-${Date.now()}@example.com`;
    const { invitation, token } = await createInvitation({
      teamId: team.id,
      email: inviteeEmail,
      operationalRole: 'TEAM_MEMBER',
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);
    
    // Create invitee user
    const invitee = await createTestUser(inviteeEmail, 'Invitee');
    
    // Accept invitation first time
    await acceptInvitation(token, invitee.id);
    
    // Try to accept again - should fail
    await expect(
      acceptInvitation(token, invitee.id)
    ).rejects.toThrow();
  });
  
  test('should handle invitation resend with new token', async () => {
    // Create team owner and team
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
    
    // Create invitation
    const inviteeEmail = `invitee-resend-${Date.now()}@example.com`;
    const { invitation, token: originalToken } = await createInvitation({
      teamId: team.id,
      email: inviteeEmail,
      operationalRole: 'TEAM_MEMBER',
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);
    
    const originalExpiresAt = invitation.expiresAt;
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Resend invitation (returns void, updates in database)
    await resendInvitation(invitation.id, owner.id);
    
    // Get updated invitation from database
    const [updatedInvitation] = await db
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.id, invitation.id))
      .limit(1);
    
    expect(updatedInvitation).toBeTruthy();
    expect(new Date(updatedInvitation.expiresAt).getTime()).toBeGreaterThan(
      new Date(originalExpiresAt).getTime()
    );
    
    // Old token should not work (token hash has changed)
    const invitee = await createTestUser(inviteeEmail, 'Invitee');
    
    await expect(
      acceptInvitation(originalToken, invitee.id)
    ).rejects.toThrow();
    
    // Note: We can't test the new token works because we don't have access to it
    // (it's only sent via email in the real flow)
  });
  
  test('should handle invitation cancellation', async () => {
    // Create team owner and team
    const owner = await createTestUser(
      `owner-cancel-${Date.now()}@example.com`,
      'Owner'
    );
    
    const team = await createTeam({
      name: 'Cancel Test Team',
      description: 'Testing cancellation',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);
    
    // Create invitation
    const inviteeEmail = `invitee-cancel-${Date.now()}@example.com`;
    const { invitation, token } = await createInvitation({
      teamId: team.id,
      email: inviteeEmail,
      operationalRole: 'TEAM_MEMBER',
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);
    
    // Cancel invitation
    await cancelInvitation(invitation.id, owner.id);
    
    // Verify invitation is marked as cancelled
    const [cancelledInvitation] = await db
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.id, invitation.id))
      .limit(1);
    
    expect(cancelledInvitation.cancelledAt).toBeTruthy();
    
    // Try to accept cancelled invitation - should fail
    const invitee = await createTestUser(inviteeEmail, 'Invitee');
    
    await expect(
      acceptInvitation(token, invitee.id)
    ).rejects.toThrow();
  });
  
  test('should enforce invitation rate limiting', async () => {
    // Create team owner and team
    const owner = await createTestUser(
      `owner-rate-${Date.now()}@example.com`,
      'Owner'
    );
    
    const team = await createTeam({
      name: 'Rate Limit Test Team',
      description: 'Testing rate limits',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);
    
    // Create 10 invitations (the limit per hour)
    for (let i = 0; i < 10; i++) {
      const { invitation } = await createInvitation({
        teamId: team.id,
        email: `invitee-${i}-${Date.now()}@example.com`,
        operationalRole: 'TEAM_MEMBER',
        invitedBy: owner.id,
      });
      testInvitationIds.push(invitation.id);
    }
    
    // 11th invitation should be rate limited
    await expect(
      createInvitation({
        teamId: team.id,
        email: `invitee-11-${Date.now()}@example.com`,
        operationalRole: 'TEAM_MEMBER',
        invitedBy: owner.id,
      })
    ).rejects.toThrow('Invitation rate limit exceeded');
  });
  
  test('should assign management and operational roles from invitation', async () => {
    // Create team owner and team
    const owner = await createTestUser(
      `owner-roles-${Date.now()}@example.com`,
      'Owner'
    );
    
    const team = await createTeam({
      name: 'Roles Test Team',
      description: 'Testing role assignment',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);
    
    // Create invitation with both management and operational roles
    const inviteeEmail = `invitee-roles-${Date.now()}@example.com`;
    const { invitation, token } = await createInvitation({
      teamId: team.id,
      email: inviteeEmail,
      managementRole: 'TEAM_ADMIN',
      operationalRole: 'TEAM_EDITOR',
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);
    
    // Create invitee and accept
    const invitee = await createTestUser(inviteeEmail, 'Invitee');
    await acceptInvitation(token, invitee.id);
    
    // Verify both roles are assigned
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, invitee.id))
      .limit(1);
    
    expect(member.managementRole).toBe('TEAM_ADMIN');
    expect(member.operationalRole).toBe('TEAM_EDITOR');
  });
});
