import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { createSampleProject } from '../sample-data-service';

// Mock DB
vi.mock('@/lib/db', () => ({
  db: {
    query: {
      projects: {
        findFirst: vi.fn(),
      },
      issues: {
        findMany: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
  },
}));

import { db } from '@/lib/db';

describe('Sample Data Service Properties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Property 8: Sample Data Creation is Idempotent', async () => {
    // For any workspace/user, calling createSampleProject multiple times should behave idempotently
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // teamId
        fc.uuid(), // userId
        fc.boolean(), // existingProject (does demo project already exist?)
        async (teamId, userId, existingProjectExists) => {
           // Reset mocks for iteration
           vi.clearAllMocks();

           // Setup mock state
           if (existingProjectExists) {
             vi.mocked(db.query.projects.findFirst).mockResolvedValue({ id: 'existing-project-id' } as any);
             vi.mocked(db.query.issues.findMany).mockResolvedValue([] as any);
           } else {
             // First call returns null (not found), subsequent calls (in reality) would find it.
             // But here we are testing the logic of a single call: 
             // IF it exists -> return existing.
             // IF it doesn't -> create.
             
             // To test idempotency properly in a stateless unit test:
             // We verify that the FUNCTION behaves correctly given the state.
             
             // Case A: Pre-existing
             // Covered by existingProjectExists=true
             
             // Case B: Not existing
             vi.mocked(db.query.projects.findFirst).mockResolvedValue(undefined);
             vi.mocked(db.insert).mockReturnValue({
                values: vi.fn().mockReturnValue({
                    returning: vi.fn().mockResolvedValue([{ id: 'new-project-id' }])
                })
             } as any);
           }

           const result = await createSampleProject({ teamId, userId });

           if (existingProjectExists) {
             expect(result.alreadyExisted).toBe(true);
             expect(result.projectId).toBe('existing-project-id');
             expect(db.insert).not.toHaveBeenCalled();
           } else {
             expect(result.alreadyExisted).toBe(false);
             expect(result.projectId).toBe('new-project-id');
             expect(db.insert).toHaveBeenCalled(); 
           }
        }
      )
    );
  });
});
