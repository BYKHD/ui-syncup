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

import { describe, test, expect, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { users, teams, teamMembers, teamInvitations } from '@/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { createTeam } from '@/server/teams/team-service';
import { addMember } from '@/server/teams/member-service';
import { createInvitation, acceptInvitation, acceptInvitationById, resendInvitation, cancelInvitation } from '@/server/teams/invitation-service';

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

    // Step 8: Verify the accepted team became the invitee's active team
    const [inviteeAfterAccept] = await db
      .select({ lastActiveTeamId: users.lastActiveTeamId })
      .from(users)
      .where(eq(users.id, invitee.id))
      .limit(1);

    expect(inviteeAfterAccept.lastActiveTeamId).toBe(team.id);
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

  test('acceptInvitationById sets the joined team as active', async () => {
    const owner = await createTestUser(`owner-byid-${Date.now()}@example.com`, 'Owner');
    const team = await createTeam({
      name: 'ById Active Team',
      description: 'Testing by-id auto-switch',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);

    const inviteeEmail = `invitee-byid-${Date.now()}@example.com`;
    const { invitation } = await createInvitation({
      teamId: team.id,
      email: inviteeEmail,
      operationalRole: 'TEAM_MEMBER',
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);

    const invitee = await createTestUser(inviteeEmail, 'Invitee');

    const result = await acceptInvitationById(invitation.id, invitee.id, inviteeEmail);
    expect(result.teamId).toBe(team.id);

    const [inviteeAfter] = await db
      .select({ lastActiveTeamId: users.lastActiveTeamId })
      .from(users)
      .where(eq(users.id, invitee.id))
      .limit(1);
    expect(inviteeAfter.lastActiveTeamId).toBe(team.id);
  });
  
  test('non-member cannot accept an already-used invitation', async () => {
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

    const inviteeEmail = `invitee-used-${Date.now()}@example.com`;
    const { invitation, token } = await createInvitation({
      teamId: team.id,
      email: inviteeEmail,
      operationalRole: 'TEAM_MEMBER',
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);

    const invitee = await createTestUser(inviteeEmail, 'Invitee');
    await acceptInvitation(token, invitee.id);

    const stranger = await createTestUser(
      `stranger-used-${Date.now()}@example.com`,
      'Stranger'
    );

    await expect(
      acceptInvitation(token, stranger.id)
    ).rejects.toThrow();
  });

  test('member revisiting an already-used invitation succeeds and stays in the team', async () => {
    const owner = await createTestUser(
      `owner-revisit-${Date.now()}@example.com`,
      'Owner'
    );

    const team = await createTeam({
      name: 'Revisit Test Team',
      description: 'Testing member invitation revisit',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);

    const inviteeEmail = `invitee-revisit-${Date.now()}@example.com`;
    const { invitation, token } = await createInvitation({
      teamId: team.id,
      email: inviteeEmail,
      operationalRole: 'TEAM_MEMBER',
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);

    const invitee = await createTestUser(inviteeEmail, 'Invitee');
    await acceptInvitation(token, invitee.id);

    await expect(acceptInvitation(token, invitee.id)).resolves.toBeUndefined();

    const memberships = await db
      .select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, team.id),
        eq(teamMembers.userId, invitee.id)
      ));
    expect(memberships).toHaveLength(1);

    const [inviteeAfter] = await db
      .select({ lastActiveTeamId: users.lastActiveTeamId })
      .from(users)
      .where(eq(users.id, invitee.id))
      .limit(1);
    expect(inviteeAfter.lastActiveTeamId).toBe(team.id);
  });

  test('acceptInvitationById is idempotent for an existing member', async () => {
    const owner = await createTestUser(
      `owner-byid-revisit-${Date.now()}@example.com`,
      'Owner'
    );

    const team = await createTeam({
      name: 'ById Revisit Test Team',
      description: 'Testing by-id member invitation revisit',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);

    const inviteeEmail = `invitee-byid-revisit-${Date.now()}@example.com`;
    const { invitation } = await createInvitation({
      teamId: team.id,
      email: inviteeEmail,
      operationalRole: 'TEAM_MEMBER',
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);

    const invitee = await createTestUser(inviteeEmail, 'Invitee');
    await acceptInvitationById(invitation.id, invitee.id, inviteeEmail);

    const second = await acceptInvitationById(invitation.id, invitee.id, inviteeEmail);
    expect(second.teamId).toBe(team.id);
    expect(second.teamSlug).toBe(team.slug);

    const memberships = await db
      .select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, team.id),
        eq(teamMembers.userId, invitee.id)
      ));
    expect(memberships).toHaveLength(1);
  });

  test('existing member cannot consume another user pending token invitation', async () => {
    const owner = await createTestUser(
      `owner-token-recipient-${Date.now()}@example.com`,
      'Owner'
    );

    const team = await createTeam({
      name: 'Token Recipient Team',
      description: 'Testing token recipient guard',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);

    const existingMember = await createTestUser(
      `existing-token-member-${Date.now()}@example.com`,
      'Existing Member'
    );
    await addMember({
      teamId: team.id,
      userId: existingMember.id,
      managementRole: null,
      operationalRole: 'TEAM_MEMBER',
      invitedBy: owner.id,
    });

    const inviteeEmail = `other-token-invitee-${Date.now()}@example.com`;
    const { invitation, token } = await createInvitation({
      teamId: team.id,
      email: inviteeEmail,
      operationalRole: 'TEAM_MEMBER',
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);

    await expect(
      acceptInvitation(token, existingMember.id)
    ).rejects.toThrow('User is already a member of this team');

    const [after] = await db
      .select({ usedAt: teamInvitations.usedAt })
      .from(teamInvitations)
      .where(eq(teamInvitations.id, invitation.id))
      .limit(1);
    expect(after.usedAt).toBeNull();
  });

  test('existing member cannot consume another user pending by-id invitation', async () => {
    const owner = await createTestUser(
      `owner-byid-recipient-${Date.now()}@example.com`,
      'Owner'
    );

    const team = await createTeam({
      name: 'ById Recipient Team',
      description: 'Testing by-id recipient guard',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);

    const existingMember = await createTestUser(
      `existing-byid-member-${Date.now()}@example.com`,
      'Existing Member'
    );
    await addMember({
      teamId: team.id,
      userId: existingMember.id,
      managementRole: null,
      operationalRole: 'TEAM_MEMBER',
      invitedBy: owner.id,
    });

    const inviteeEmail = `other-byid-invitee-${Date.now()}@example.com`;
    const { invitation } = await createInvitation({
      teamId: team.id,
      email: inviteeEmail,
      operationalRole: 'TEAM_MEMBER',
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);

    await expect(
      acceptInvitationById(invitation.id, existingMember.id, existingMember.email)
    ).rejects.toThrow('This invitation was sent to a different email address');

    const [after] = await db
      .select({ usedAt: teamInvitations.usedAt })
      .from(teamInvitations)
      .where(eq(teamInvitations.id, invitation.id))
      .limit(1);
    expect(after.usedAt).toBeNull();
  });

  test('member revisiting an expired invitation succeeds without marking it used', async () => {
    const owner = await createTestUser(
      `owner-expired-revisit-${Date.now()}@example.com`,
      'Owner'
    );

    const team = await createTeam({
      name: 'Expired Revisit Team',
      description: 'Testing expired member revisit',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);

    const inviteeEmail = `invitee-expired-revisit-${Date.now()}@example.com`;
    const { invitation, token } = await createInvitation({
      teamId: team.id,
      email: inviteeEmail,
      operationalRole: 'TEAM_MEMBER',
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);

    const invitee = await createTestUser(inviteeEmail, 'Invitee');
    await addMember({
      teamId: team.id,
      userId: invitee.id,
      managementRole: null,
      operationalRole: 'TEAM_MEMBER',
      invitedBy: owner.id,
    });

    await db
      .update(teamInvitations)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(teamInvitations.id, invitation.id));

    await expect(acceptInvitation(token, invitee.id)).resolves.toBeUndefined();

    const [after] = await db
      .select({
        usedAt: teamInvitations.usedAt,
        lastActiveTeamId: users.lastActiveTeamId,
      })
      .from(teamInvitations)
      .innerJoin(users, eq(users.id, invitee.id))
      .where(eq(teamInvitations.id, invitation.id))
      .limit(1);

    expect(after.usedAt).toBeNull();
    expect(after.lastActiveTeamId).toBe(team.id);
  });

  test('member revisiting a cancelled invitation succeeds without marking it used', async () => {
    const owner = await createTestUser(
      `owner-cancelled-revisit-${Date.now()}@example.com`,
      'Owner'
    );

    const team = await createTeam({
      name: 'Cancelled Revisit Team',
      description: 'Testing cancelled member revisit',
      creatorId: owner.id,
    });
    testTeamIds.push(team.id);

    const inviteeEmail = `invitee-cancelled-revisit-${Date.now()}@example.com`;
    const { invitation, token } = await createInvitation({
      teamId: team.id,
      email: inviteeEmail,
      operationalRole: 'TEAM_MEMBER',
      invitedBy: owner.id,
    });
    testInvitationIds.push(invitation.id);

    const invitee = await createTestUser(inviteeEmail, 'Invitee');
    await addMember({
      teamId: team.id,
      userId: invitee.id,
      managementRole: null,
      operationalRole: 'TEAM_MEMBER',
      invitedBy: owner.id,
    });

    await cancelInvitation(invitation.id, owner.id);

    await expect(acceptInvitation(token, invitee.id)).resolves.toBeUndefined();

    const [after] = await db
      .select({
        usedAt: teamInvitations.usedAt,
        cancelledAt: teamInvitations.cancelledAt,
        lastActiveTeamId: users.lastActiveTeamId,
      })
      .from(teamInvitations)
      .innerJoin(users, eq(users.id, invitee.id))
      .where(eq(teamInvitations.id, invitation.id))
      .limit(1);

    expect(after.usedAt).toBeNull();
    expect(after.cancelledAt).toBeTruthy();
    expect(after.lastActiveTeamId).toBe(team.id);
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
