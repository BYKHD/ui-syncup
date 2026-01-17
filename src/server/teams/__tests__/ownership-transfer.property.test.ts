import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { transferOwnership } from '../team-service';
import { db } from '@/lib/db';
import { enqueueEmail } from '@/server/email';
import { logger } from '@/lib/logger';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    transaction: vi.fn((cb) => cb(db)),
    query: {
      teamMembers: {
        findFirst: vi.fn(),
      },
      users: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
  },
}));

vi.mock('@/server/email', () => ({
  enqueueEmail: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('transferOwnership Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully transfer ownership when all conditions are met', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // teamId
        fc.uuid(), // currentOwnerId
        fc.uuid(), // newOwnerId
        fc.string(), // teamName
        fc.string(), // teamSlug
        fc.emailAddress(), // ownerEmail
        fc.emailAddress(), // newOwnerEmail
        async (teamId, currentOwnerId, newOwnerId, teamName, teamSlug, ownerEmail, newOwnerEmail) => {
          vi.clearAllMocks();
          // Preconditions
          if (currentOwnerId === newOwnerId) return;

          // Mock DB responses
          const currentOwner = {
            userId: currentOwnerId,
            teamId,
            managementRole: 'WORKSPACE_OWNER',
            user: { email: ownerEmail, name: 'Owner' },
            team: { name: teamName, slug: teamSlug },
          };

          const newOwner = {
            userId: newOwnerId,
            teamId,
            managementRole: 'WORKSPACE_ADMIN',
            user: { email: newOwnerEmail, name: 'New Owner' },
          };

          // Setup mocks
          const findFirstMock = vi.fn()
            .mockResolvedValueOnce(currentOwner) // 1. Validate current owner
            .mockResolvedValueOnce(newOwner);    // 2. Validate new owner

          (db.query.teamMembers.findFirst as any) = findFirstMock;

          // Execute
          await transferOwnership(teamId, currentOwnerId, newOwnerId);

          // Verify DB updates
          expect(db.update).toHaveBeenCalledTimes(2);
          
          // Verify Emails
          expect(enqueueEmail).toHaveBeenCalledTimes(2);
          expect(enqueueEmail).toHaveBeenCalledWith(expect.objectContaining({
            to: ownerEmail,
            type: 'ownership_transfer',
            template: expect.objectContaining({
              type: 'ownership_transfer',
              data: expect.objectContaining({ isNewOwner: false })
            })
          }));
          expect(enqueueEmail).toHaveBeenCalledWith(expect.objectContaining({
            to: newOwnerEmail,
            type: 'ownership_transfer',
            template: expect.objectContaining({
              type: 'ownership_transfer',
              data: expect.objectContaining({ isNewOwner: true })
            })
          }));

          // Verify Logging
          expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('team.ownership.transfer.success'));
        }
      )
    );
  });

  it('should fail if current user is not owner', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        async (teamId, currentOwnerId, newOwnerId) => {
          // Mock current user not being owner
          (db.query.teamMembers.findFirst as any) = vi.fn().mockResolvedValue(null);

          await expect(transferOwnership(teamId, currentOwnerId, newOwnerId))
            .rejects.toThrow("Current user is not the team owner");

          expect(db.update).not.toHaveBeenCalled();
          expect(enqueueEmail).not.toHaveBeenCalled();
        }
      )
    );
  });

  it('should fail if target user is not admin', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        async (teamId, currentOwnerId, newOwnerId) => {
          if (currentOwnerId === newOwnerId) return;

          const currentOwner = {
            userId: currentOwnerId,
            teamId,
            managementRole: 'WORKSPACE_OWNER',
            user: { email: 'test@test.com' },
            team: { name: 'Test Team' },
          };

          const newOwner = {
            userId: newOwnerId,
            teamId,
            managementRole: 'WORKSPACE_MEMBER', // Not ADMIN
            user: { email: 'new@test.com' },
          };

          const findFirstMock = vi.fn()
            .mockResolvedValueOnce(currentOwner)
            .mockResolvedValueOnce(newOwner);

          (db.query.teamMembers.findFirst as any) = findFirstMock;

          await expect(transferOwnership(teamId, currentOwnerId, newOwnerId))
            .rejects.toThrow("Target user must be a Team Admin");

          expect(db.update).not.toHaveBeenCalled();
        }
      )
    );
  });
});
