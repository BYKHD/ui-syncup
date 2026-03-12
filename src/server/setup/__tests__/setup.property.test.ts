import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { 
  getInstanceStatus, 
  createAdmin, 
  saveInstanceConfig, 
  completeSetup 
} from '../setup-service';
import { isMultiWorkspaceMode } from '@/config/workspace';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    query: {
      instanceSettings: {
        findFirst: vi.fn(),
      },
      users: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
  },
}));

vi.mock('@/server/auth/password', () => ({
  hashPassword: vi.fn((pwd) => Promise.resolve(`hashed_${pwd}`)),
}));

vi.mock('@/config/workspace', () => ({
  isMultiWorkspaceMode: vi.fn(() => false),
}));

vi.mock('@/config/auth', () => ({
  isEmailVerificationSkipped: vi.fn(() => false),
}));

import { db } from '@/lib/db';

describe('Setup Service Properties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Property 1: Instance State Detection is Idempotent', async () => {
    // For any sequence of calls with the same DB state, result is identical
    await fc.assert(
      fc.asyncProperty(
        fc.option(fc.record({
          setupCompletedAt: fc.option(fc.date()),
          instanceName: fc.string(),
          publicUrl: fc.option(fc.webUrl()),
          adminUserId: fc.uuid(),
          defaultWorkspaceId: fc.option(fc.uuid()),
          defaultMemberRole: fc.constantFrom('WORKSPACE_MEMBER', 'WORKSPACE_VIEWER', 'WORKSPACE_EDITOR'),
        })),
        fc.boolean(), // isMultiWorkspaceMode
        async (mockSettings, isMultiMode) => {
          // Setup mock
          vi.mocked(db.query.instanceSettings.findFirst).mockResolvedValue(mockSettings as any);
          vi.mocked(isMultiWorkspaceMode).mockReturnValue(isMultiMode);
          
          if (mockSettings?.adminUserId) {
             vi.mocked(db.query.users.findFirst).mockResolvedValue({ email: 'admin@example.com' } as any);
          }

          // First call
          const result1 = await getInstanceStatus();
          
          // Second call
          const result2 = await getInstanceStatus();

          // Assert
          expect(result1).toEqual(result2);
          
          // Validate logic match
          if (!mockSettings) {
             expect(result1.isSetupComplete).toBe(false);
          } else {
             expect(result1.isSetupComplete).toBe(mockSettings.setupCompletedAt !== null && mockSettings.setupCompletedAt !== undefined);
             expect(result1.instanceName).toBe(mockSettings.instanceName);
          }
        }
      )
    );
  });
});
