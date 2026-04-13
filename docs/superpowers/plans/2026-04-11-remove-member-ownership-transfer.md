# Remove Member with Ownership Transfer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When removing a team member who owns projects, show a guided dialog that requires assigning a new owner for each project before the removal can proceed.

**Architecture:** Add `getOwnedProjectsWithDetails` + `removeWithOwnershipTransfer` to the server member service. Add a `GET owned-projects` API endpoint and enhance the `DELETE member` endpoint to accept ownership transfers atomically. On the client, replace the inline AlertDialog in `TeamMembersList` with a smart `RemoveMemberDialog` that fetches owned projects on open and conditionally renders either a simple confirm or an ownership-assignment flow.

**Tech Stack:** Next.js App Router, Drizzle ORM, React Query (TanStack), Zod, shadcn/ui, Vitest + Testing Library

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/server/teams/member-service.ts` | Add `getOwnedProjectsWithDetails()` and `removeWithOwnershipTransfer()` |
| Create | `src/app/api/teams/[teamId]/members/[userId]/owned-projects/route.ts` | `GET` — owned projects + eligible new owners |
| Modify | `src/app/api/teams/[teamId]/members/[userId]/route.ts` | Enhance `DELETE` to accept `ownershipTransfers` body |
| Create | `src/features/teams/api/get-owned-projects.ts` | API client for the owned-projects endpoint |
| Modify | `src/features/teams/api/remove-member.ts` | Accept optional `ownershipTransfers` param |
| Modify | `src/features/teams/api/index.ts` | Export new API client + types |
| Create | `src/features/teams/hooks/use-owned-projects.ts` | React Query hook for owned projects |
| Modify | `src/features/teams/hooks/index.ts` | Export new hook |
| Modify | `src/features/teams/hooks/use-remove-member.ts` | Forward `ownershipTransfers` to API client |
| Create | `src/features/team-settings/components/remove-member-dialog.tsx` | Smart dialog: simple confirm OR ownership transfer flow |
| Modify | `src/features/team-settings/components/team-members-list.tsx` | Replace inline AlertDialog with `RemoveMemberDialog` |
| Create | `src/server/teams/__tests__/remove-with-ownership-transfer.integration.test.ts` | Integration tests for new server functions |
| Create | `src/features/team-settings/components/__tests__/remove-member-dialog.test.tsx` | Component tests for both dialog paths |

---

### Task 1: Server — `getOwnedProjectsWithDetails`

**Files:**
- Modify: `src/server/teams/member-service.ts`
- Test: `src/server/teams/__tests__/remove-with-ownership-transfer.integration.test.ts`

- [ ] **Step 1: Write the failing integration test**

Create `src/server/teams/__tests__/remove-with-ownership-transfer.integration.test.ts`:

```typescript
/**
 * Integration Test: Remove Member with Ownership Transfer
 */
import { describe, test, expect, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { users, teams, teamMembers, projectMembers } from '@/server/db/schema';
import { projects } from '@/server/db/schema/projects';
import { eq, and } from 'drizzle-orm';
import { createTeam } from '@/server/teams/team-service';
import { addMember } from '@/server/teams/member-service';
import { getOwnedProjectsWithDetails } from '@/server/teams/member-service';

const testUserIds: string[] = [];
const testTeamIds: string[] = [];
const testProjectIds: string[] = [];

async function createTestUser(email: string, name: string) {
  const [user] = await db
    .insert(users)
    .values({ email: email.toLowerCase().trim(), name: name.trim(), emailVerified: true })
    .returning();
  testUserIds.push(user.id);
  return user;
}

async function createTestProject(teamId: string, name: string, key: string) {
  const [project] = await db
    .insert(projects)
    .values({ teamId, name, key, slug: key.toLowerCase(), visibility: 'private', status: 'active' })
    .returning();
  testProjectIds.push(project.id);
  return project;
}

async function cleanupTestData() {
  for (const projectId of testProjectIds) {
    await db.delete(projectMembers).where(eq(projectMembers.projectId, projectId));
    await db.delete(projects).where(eq(projects.id, projectId));
  }
  for (const teamId of testTeamIds) {
    await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
    await db.delete(teams).where(eq(teams.id, teamId));
  }
  for (const userId of testUserIds) {
    await db.delete(users).where(eq(users.id, userId));
  }
  testUserIds.length = 0;
  testTeamIds.length = 0;
  testProjectIds.length = 0;
}

afterEach(async () => { await cleanupTestData(); });

describe('getOwnedProjectsWithDetails', () => {
  test('returns owned projects with name and key for a user', async () => {
    const owner = await createTestUser(`owner-${Date.now()}@example.com`, 'Owner');
    const team = await createTeam({ name: `Team ${Date.now()}`, createdBy: owner.id });
    testTeamIds.push(team.id);

    const project = await createTestProject(team.id, 'Dashboard', 'DASH');
    await db.insert(projectMembers).values({ projectId: project.id, userId: owner.id, role: 'owner' });

    const result = await getOwnedProjectsWithDetails(owner.id, team.id);

    expect(result.ownedProjects).toHaveLength(1);
    expect(result.ownedProjects[0]).toMatchObject({ id: project.id, name: 'Dashboard', key: 'DASH' });
  });

  test('returns empty list when user owns no projects', async () => {
    const member = await createTestUser(`member-${Date.now()}@example.com`, 'Member');
    const team = await createTeam({ name: `Team ${Date.now()}`, createdBy: member.id });
    testTeamIds.push(team.id);

    const result = await getOwnedProjectsWithDetails(member.id, team.id);

    expect(result.ownedProjects).toHaveLength(0);
  });

  test('returns eligible owners (TEAM_EDITOR members, excluding the removed user)', async () => {
    const owner = await createTestUser(`owner-${Date.now()}@example.com`, 'Owner');
    const editor = await createTestUser(`editor-${Date.now()}@example.com`, 'Editor');
    const team = await createTeam({ name: `Team ${Date.now()}`, createdBy: owner.id });
    testTeamIds.push(team.id);

    await addMember({ teamId: team.id, userId: editor.id, operationalRole: 'TEAM_EDITOR', invitedBy: owner.id });

    const project = await createTestProject(team.id, 'App', 'APP');
    await db.insert(projectMembers).values({ projectId: project.id, userId: owner.id, role: 'owner' });

    const result = await getOwnedProjectsWithDetails(owner.id, team.id);

    expect(result.eligibleOwners.some(u => u.userId === editor.id)).toBe(true);
    expect(result.eligibleOwners.some(u => u.userId === owner.id)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/BYKHD/Documents/GitHub/ui-syncup && bun run test src/server/teams/__tests__/remove-with-ownership-transfer.integration.test.ts
```

Expected: FAIL — `getOwnedProjectsWithDetails is not exported`

- [ ] **Step 3: Implement `getOwnedProjectsWithDetails` in `member-service.ts`**

Add the `projects` import at the top of `src/server/teams/member-service.ts` (it is not currently imported):

```typescript
import { projects } from "@/server/db/schema/projects";
```

Then add after the existing `removeMember` function:

```typescript
export interface OwnedProjectDetails {
  id: string;
  name: string;
  key: string;
}

export interface EligibleOwner {
  userId: string;
  name: string;
  email: string;
  image: string | null;
}

export interface OwnedProjectsWithDetailsResult {
  ownedProjects: OwnedProjectDetails[];
  eligibleOwners: EligibleOwner[];
}

/**
 * Returns projects owned by a user within a team, plus eligible replacement owners.
 * Used to drive the ownership transfer dialog before removing a member.
 */
export async function getOwnedProjectsWithDetails(
  userId: string,
  teamId: string
): Promise<OwnedProjectsWithDetailsResult> {
  // Get projects in this team where user is PROJECT_OWNER
  const owned = await db
    .select({ id: projects.id, name: projects.name, key: projects.key })
    .from(projectMembers)
    .innerJoin(projects, eq(projectMembers.projectId, projects.id))
    .where(and(
      eq(projectMembers.userId, userId),
      eq(projectMembers.role, 'owner'),
      eq(projects.teamId, teamId)
    ));

  // Eligible owners: TEAM_EDITOR members of this team, excluding the user being removed
  const eligibleRows = await db
    .select({
      userId: teamMembers.userId,
      name: users.name,
      email: users.email,
      image: users.image,
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.operationalRole, 'TEAM_EDITOR'),
      sql`${teamMembers.userId} != ${userId}`
    ));

  return {
    ownedProjects: owned,
    eligibleOwners: eligibleRows,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/BYKHD/Documents/GitHub/ui-syncup && bun run test src/server/teams/__tests__/remove-with-ownership-transfer.integration.test.ts --reporter=verbose
```

Expected: PASS all 3 `getOwnedProjectsWithDetails` tests

- [ ] **Step 5: Commit**

```bash
cd /Users/BYKHD/Documents/GitHub/ui-syncup && git add src/server/teams/member-service.ts src/server/teams/__tests__/remove-with-ownership-transfer.integration.test.ts && git commit -m "feat: add getOwnedProjectsWithDetails to team member service"
```

---

### Task 2: Server — `removeWithOwnershipTransfer`

**Files:**
- Modify: `src/server/teams/member-service.ts`
- Test: `src/server/teams/__tests__/remove-with-ownership-transfer.integration.test.ts`

- [ ] **Step 1: Append failing tests to the integration test file**

Append to `src/server/teams/__tests__/remove-with-ownership-transfer.integration.test.ts`:

```typescript
import { removeWithOwnershipTransfer } from '@/server/teams/member-service';

describe('removeWithOwnershipTransfer', () => {
  test('transfers project ownership and removes team member atomically', async () => {
    const owner = await createTestUser(`owner-${Date.now()}@example.com`, 'Owner');
    const newOwner = await createTestUser(`new-${Date.now()}@example.com`, 'New Owner');
    const team = await createTeam({ name: `Team ${Date.now()}`, createdBy: owner.id });
    testTeamIds.push(team.id);

    await addMember({ teamId: team.id, userId: newOwner.id, operationalRole: 'TEAM_EDITOR', invitedBy: owner.id });

    const project = await createTestProject(team.id, 'Dashboard', 'DASH');
    await db.insert(projectMembers).values({ projectId: project.id, userId: owner.id, role: 'owner' });
    await db.insert(projectMembers).values({ projectId: project.id, userId: newOwner.id, role: 'editor' });

    await removeWithOwnershipTransfer(
      team.id,
      owner.id,
      [{ projectId: project.id, newOwnerId: newOwner.id }],
      owner.id
    );

    // Owner should no longer be a team member
    const teamMember = await db.query.teamMembers.findFirst({
      where: and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, owner.id)),
    });
    expect(teamMember).toBeUndefined();

    // New owner should now own the project
    const projectMember = await db.query.projectMembers.findFirst({
      where: and(eq(projectMembers.projectId, project.id), eq(projectMembers.userId, newOwner.id)),
    });
    expect(projectMember?.role).toBe('owner');
  });

  test('throws OWNERSHIP_TRANSFER_REQUIRED if owned project has no transfer target', async () => {
    const owner = await createTestUser(`owner-${Date.now()}@example.com`, 'Owner');
    const team = await createTeam({ name: `Team ${Date.now()}`, createdBy: owner.id });
    testTeamIds.push(team.id);

    const project = await createTestProject(team.id, 'App', 'APP');
    await db.insert(projectMembers).values({ projectId: project.id, userId: owner.id, role: 'owner' });

    await expect(
      removeWithOwnershipTransfer(team.id, owner.id, [], owner.id)
    ).rejects.toThrow('OWNERSHIP_TRANSFER_REQUIRED');
  });

  test('removes member with no transfers when user owns no projects', async () => {
    const actor = await createTestUser(`actor-${Date.now()}@example.com`, 'Actor');
    const member = await createTestUser(`member-${Date.now()}@example.com`, 'Member');
    const team = await createTeam({ name: `Team ${Date.now()}`, createdBy: actor.id });
    testTeamIds.push(team.id);

    await addMember({ teamId: team.id, userId: member.id, operationalRole: 'TEAM_MEMBER', invitedBy: actor.id });

    await removeWithOwnershipTransfer(team.id, member.id, [], actor.id);

    const teamMember = await db.query.teamMembers.findFirst({
      where: and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, member.id)),
    });
    expect(teamMember).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify new tests fail**

```bash
cd /Users/BYKHD/Documents/GitHub/ui-syncup && bun run test src/server/teams/__tests__/remove-with-ownership-transfer.integration.test.ts --reporter=verbose
```

Expected: FAIL — `removeWithOwnershipTransfer is not exported`

- [ ] **Step 3: Implement `removeWithOwnershipTransfer` in `member-service.ts`**

Add after `getOwnedProjectsWithDetails`:

```typescript
export interface OwnershipTransfer {
  projectId: string;
  newOwnerId: string;
}

/**
 * Atomically transfers project ownerships and removes a team member.
 * Throws if any owned project within the team has no transfer target.
 */
export async function removeWithOwnershipTransfer(
  teamId: string,
  userId: string,
  transfers: OwnershipTransfer[],
  actorId: string
): Promise<void> {
  // Check which projects the user owns in this team
  const owned = await db
    .select({ id: projects.id })
    .from(projectMembers)
    .innerJoin(projects, eq(projectMembers.projectId, projects.id))
    .where(and(
      eq(projectMembers.userId, userId),
      eq(projectMembers.role, 'owner'),
      eq(projects.teamId, teamId)
    ));

  // Validate every owned project has a transfer target
  const transferMap = new Map(transfers.map(t => [t.projectId, t.newOwnerId]));
  for (const { id } of owned) {
    if (!transferMap.has(id)) {
      throw new Error(`OWNERSHIP_TRANSFER_REQUIRED: project ${id} has no transfer target`);
    }
  }

  await db.transaction(async (tx) => {
    // Transfer ownership for each provided project
    for (const { projectId, newOwnerId } of transfers) {
      // Promote new owner
      await tx
        .update(projectMembers)
        .set({ role: 'owner' })
        .where(and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, newOwnerId)
        ));

      // Demote previous owner to editor
      await tx
        .update(projectMembers)
        .set({ role: 'editor' })
        .where(and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId)
        ));
    }

    // Remove from team
    await tx
      .delete(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ));
  });

  logTeamEvent('team.member.remove.success', {
    outcome: 'success',
    userId: actorId,
    teamId,
    metadata: { removedUserId: userId, ownershipTransfers: transfers.length },
  });
}
```

- [ ] **Step 4: Run all tests in the file**

```bash
cd /Users/BYKHD/Documents/GitHub/ui-syncup && bun run test src/server/teams/__tests__/remove-with-ownership-transfer.integration.test.ts --reporter=verbose
```

Expected: PASS all 6 tests

- [ ] **Step 5: Commit**

```bash
cd /Users/BYKHD/Documents/GitHub/ui-syncup && git add src/server/teams/member-service.ts src/server/teams/__tests__/remove-with-ownership-transfer.integration.test.ts && git commit -m "feat: add removeWithOwnershipTransfer to team member service"
```

---

### Task 3: API Routes

**Files:**
- Create: `src/app/api/teams/[teamId]/members/[userId]/owned-projects/route.ts`
- Modify: `src/app/api/teams/[teamId]/members/[userId]/route.ts`

- [ ] **Step 1: Create the GET owned-projects route**

Create `src/app/api/teams/[teamId]/members/[userId]/owned-projects/route.ts`:

```typescript
/**
 * GET /api/teams/:teamId/members/:userId/owned-projects
 *
 * Returns projects owned by a team member, plus eligible replacement owners.
 * Requires TEAM_OWNER or TEAM_ADMIN.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth/session';
import { hasRole } from '@/server/auth/rbac';
import { getOwnedProjectsWithDetails } from '@/server/teams/member-service';
import { logger } from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ teamId: string; userId: string }> }
) {
  const { teamId, userId } = await params;

  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }

  const isOwner = await hasRole(user.id, 'TEAM_OWNER', 'team', teamId);
  const isAdmin = await hasRole(user.id, 'TEAM_ADMIN', 'team', teamId);
  if (!isOwner && !isAdmin) {
    return NextResponse.json(
      { error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Only team owners and admins can view this' } },
      { status: 403 }
    );
  }

  try {
    const result = await getOwnedProjectsWithDetails(userId, teamId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    logger.error('api.teams.members.owned-projects.error', {
      teamId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Enhance the DELETE handler in `route.ts`**

In `src/app/api/teams/[teamId]/members/[userId]/route.ts`:

1. Add `RemoveMemberSchema` after the existing `UpdateMemberRolesSchema`:

```typescript
const RemoveMemberSchema = z.object({
  ownershipTransfers: z.array(
    z.object({
      projectId: z.string().uuid(),
      newOwnerId: z.string().uuid(),
    })
  ).optional().default([]),
});
```

2. Update the import to bring in `removeWithOwnershipTransfer` instead of `removeMember`:

```typescript
import { updateMemberRoles, removeWithOwnershipTransfer } from '@/server/teams/member-service';
```

3. Replace the DELETE handler body (after the permission check, before the audit log) with:

```typescript
    // Parse optional body for ownership transfers
    let ownershipTransfers: { projectId: string; newOwnerId: string }[] = [];
    try {
      const body = await request.json().catch(() => ({}));
      const parsed = RemoveMemberSchema.safeParse(body);
      if (parsed.success) ownershipTransfers = parsed.data.ownershipTransfers;
    } catch {
      // Body is optional — proceed with empty transfers
    }

    await removeWithOwnershipTransfer(teamId, userId, ownershipTransfers, user.id);
```

4. Update the 409 error handler in DELETE:

```typescript
      if (error.message.includes('OWNERSHIP_TRANSFER_REQUIRED') || error.message.includes('owns projects')) {
        return NextResponse.json(
          { error: { code: 'MEMBER_OWNS_PROJECTS', message: 'Member owns projects. Transfer ownership first.' } },
          { status: 409 }
        );
      }
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/BYKHD/Documents/GitHub/ui-syncup && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors

- [ ] **Step 4: Commit**

```bash
cd /Users/BYKHD/Documents/GitHub/ui-syncup && git add "src/app/api/teams/[teamId]/members/[userId]/owned-projects/route.ts" "src/app/api/teams/[teamId]/members/[userId]/route.ts" && git commit -m "feat: add owned-projects endpoint and enhance DELETE to accept ownership transfers"
```

---

### Task 4: API Client + Hook

**Files:**
- Create: `src/features/teams/api/get-owned-projects.ts`
- Modify: `src/features/teams/api/remove-member.ts`
- Modify: `src/features/teams/api/index.ts`
- Create: `src/features/teams/hooks/use-owned-projects.ts`
- Modify: `src/features/teams/hooks/index.ts`

- [ ] **Step 1: Create `src/features/teams/api/get-owned-projects.ts`**

```typescript
import { apiClient } from '@/lib/api-client';
import { z } from 'zod';

const OwnedProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
});

const EligibleOwnerSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
});

const OwnedProjectsResponseSchema = z.object({
  ownedProjects: z.array(OwnedProjectSchema),
  eligibleOwners: z.array(EligibleOwnerSchema),
});

export type OwnedProject = z.infer<typeof OwnedProjectSchema>;
export type EligibleOwner = z.infer<typeof EligibleOwnerSchema>;
export type OwnedProjectsResponse = z.infer<typeof OwnedProjectsResponseSchema>;

export async function getOwnedProjects(
  teamId: string,
  userId: string
): Promise<OwnedProjectsResponse> {
  const response = await apiClient<OwnedProjectsResponse>(
    `/api/teams/${teamId}/members/${userId}/owned-projects`,
    { method: 'GET' }
  );
  return OwnedProjectsResponseSchema.parse(response);
}
```

- [ ] **Step 2: Update `src/features/teams/api/remove-member.ts`**

```typescript
import { apiClient } from '@/lib/api-client';
import { z } from 'zod';

const removeMemberResponseSchema = z.object({
  message: z.string(),
});

export type RemoveMemberResponse = z.infer<typeof removeMemberResponseSchema>;

export interface OwnershipTransfer {
  projectId: string;
  newOwnerId: string;
}

export async function removeMember(
  teamId: string,
  userId: string,
  ownershipTransfers?: OwnershipTransfer[]
): Promise<RemoveMemberResponse> {
  const response = await apiClient<RemoveMemberResponse>(
    `/api/teams/${teamId}/members/${userId}`,
    {
      method: 'DELETE',
      body: ownershipTransfers ? JSON.stringify({ ownershipTransfers }) : undefined,
    }
  );
  return removeMemberResponseSchema.parse(response);
}
```

- [ ] **Step 3: Add exports to `src/features/teams/api/index.ts`**

Add these lines to the existing file:

```typescript
export { getOwnedProjects } from './get-owned-projects';
export type { OwnedProject, EligibleOwner, OwnedProjectsResponse } from './get-owned-projects';
export type { OwnershipTransfer } from './remove-member';
```

- [ ] **Step 4: Create `src/features/teams/hooks/use-owned-projects.ts`**

```typescript
'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getOwnedProjects, type OwnedProjectsResponse } from '../api';

export const OWNED_PROJECTS_QUERY_KEY = 'team-member-owned-projects';

/**
 * Fetches projects owned by a specific team member plus eligible replacement owners.
 * Pass `enabled: open` so the query only fires when the remove dialog opens.
 */
export function useOwnedProjects(
  teamId: string | undefined,
  userId: string | undefined,
  options?: Omit<UseQueryOptions<OwnedProjectsResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [OWNED_PROJECTS_QUERY_KEY, teamId, userId],
    queryFn: () => {
      if (!teamId || !userId) throw new Error('teamId and userId are required');
      return getOwnedProjects(teamId, userId);
    },
    enabled: !!teamId && !!userId,
    ...options,
  });
}
```

- [ ] **Step 5: Export hook from `src/features/teams/hooks/index.ts`**

Add to the existing exports:

```typescript
export { useOwnedProjects } from './use-owned-projects';
```

- [ ] **Step 6: Verify TypeScript**

```bash
cd /Users/BYKHD/Documents/GitHub/ui-syncup && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
cd /Users/BYKHD/Documents/GitHub/ui-syncup && git add src/features/teams/api/get-owned-projects.ts src/features/teams/api/remove-member.ts src/features/teams/api/index.ts src/features/teams/hooks/use-owned-projects.ts && git commit -m "feat: add getOwnedProjects API client and useOwnedProjects hook"
```

---

### Task 5: `RemoveMemberDialog` Component

**Files:**
- Create: `src/features/team-settings/components/remove-member-dialog.tsx`
- Test: `src/features/team-settings/components/__tests__/remove-member-dialog.test.tsx`

- [ ] **Step 1: Write failing component tests**

Create `src/features/team-settings/components/__tests__/remove-member-dialog.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RemoveMemberDialog } from '../remove-member-dialog';

vi.mock('@/features/teams/hooks', () => ({
  useOwnedProjects: vi.fn(),
  useRemoveMember: vi.fn(),
}));

import { useOwnedProjects, useRemoveMember } from '@/features/teams/hooks';

const mockMember = {
  id: 'member-1',
  userId: 'user-1',
  managementRole: null,
  operationalRole: 'TEAM_EDITOR' as const,
  joinedAt: new Date().toISOString(),
  invitedBy: null,
  teamId: 'team-1',
  user: { id: 'user-1', name: 'Alex Smith', email: 'alex@example.com', image: null },
};

const mockRemoveMutate = vi.fn();

beforeEach(() => {
  vi.mocked(useRemoveMember).mockReturnValue({
    mutate: mockRemoveMutate,
    isPending: false,
  } as any);
});

describe('RemoveMemberDialog — no owned projects', () => {
  beforeEach(() => {
    vi.mocked(useOwnedProjects).mockReturnValue({
      data: { ownedProjects: [], eligibleOwners: [] },
      isLoading: false,
    } as any);
  });

  it('shows simple confirmation dialog', () => {
    render(
      <RemoveMemberDialog
        member={mockMember}
        teamId="team-1"
        open={true}
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
      />
    );
    expect(screen.getByText(/remove team member/i)).toBeInTheDocument();
    expect(screen.getByText(/alex smith/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^remove$/i })).toBeEnabled();
  });

  it('calls removeMember without transfers on confirm', async () => {
    const user = userEvent.setup();
    render(
      <RemoveMemberDialog
        member={mockMember}
        teamId="team-1"
        open={true}
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: /^remove$/i }));
    expect(mockRemoveMutate).toHaveBeenCalledWith(
      { teamId: 'team-1', userId: 'user-1', ownershipTransfers: [] },
      expect.any(Object)
    );
  });
});

describe('RemoveMemberDialog — has owned projects', () => {
  const ownedProjects = [{ id: 'proj-1', name: 'Dashboard', key: 'DASH' }];
  const eligibleOwners = [{ userId: 'user-2', name: 'Bob Jones', email: 'bob@example.com', image: null }];

  beforeEach(() => {
    vi.mocked(useOwnedProjects).mockReturnValue({
      data: { ownedProjects, eligibleOwners },
      isLoading: false,
    } as any);
  });

  it('shows ownership transfer UI listing owned projects', () => {
    render(
      <RemoveMemberDialog
        member={mockMember}
        teamId="team-1"
        open={true}
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
      />
    );
    expect(screen.getByText(/owns 1 project/i)).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('disables Remove Member button until all projects have a new owner', () => {
    render(
      <RemoveMemberDialog
        member={mockMember}
        teamId="team-1"
        open={true}
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /remove member/i })).toBeDisabled();
  });

  it('enables Remove Member after all projects assigned and calls mutate with transfers', async () => {
    const user = userEvent.setup();
    render(
      <RemoveMemberDialog
        member={mockMember}
        teamId="team-1"
        open={true}
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('Bob Jones'));

    const removeBtn = screen.getByRole('button', { name: /remove member/i });
    expect(removeBtn).toBeEnabled();

    await user.click(removeBtn);
    expect(mockRemoveMutate).toHaveBeenCalledWith(
      {
        teamId: 'team-1',
        userId: 'user-1',
        ownershipTransfers: [{ projectId: 'proj-1', newOwnerId: 'user-2' }],
      },
      expect.any(Object)
    );
  });

  it('shows loading skeleton while fetching projects', () => {
    vi.mocked(useOwnedProjects).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    render(
      <RemoveMemberDialog
        member={mockMember}
        teamId="team-1"
        open={true}
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
      />
    );
    expect(screen.getByText(/checking project ownership/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify tests fail**

```bash
cd /Users/BYKHD/Documents/GitHub/ui-syncup && bun run test src/features/team-settings/components/__tests__/remove-member-dialog.test.tsx
```

Expected: FAIL — component not found

- [ ] **Step 3: Implement `RemoveMemberDialog`**

Create `src/features/team-settings/components/remove-member-dialog.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useOwnedProjects, useRemoveMember } from '@/features/teams/hooks';
import type { TeamMember } from '@/features/teams/api';

interface RemoveMemberDialogProps {
  member: TeamMember;
  teamId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RemoveMemberDialog({
  member,
  teamId,
  open,
  onOpenChange,
  onSuccess,
}: RemoveMemberDialogProps) {
  const [transfers, setTransfers] = useState<Record<string, string>>({});

  const { data, isLoading } = useOwnedProjects(teamId, member.userId, { enabled: open });
  const { mutate: removeMember, isPending } = useRemoveMember();

  const ownedProjects = data?.ownedProjects ?? [];
  const eligibleOwners = data?.eligibleOwners ?? [];
  const hasProjects = ownedProjects.length > 0;
  const allAssigned = !hasProjects || ownedProjects.every(p => !!transfers[p.id]);

  function handleRemove() {
    const ownershipTransfers = ownedProjects.map(p => ({
      projectId: p.id,
      newOwnerId: transfers[p.id],
    }));

    removeMember(
      { teamId, userId: member.userId, ownershipTransfers },
      {
        onSuccess: () => {
          toast.success(`${member.user.name} removed from the team`);
          setTransfers({});
          onOpenChange(false);
          onSuccess();
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to remove member');
        },
      }
    );
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setTransfers({});
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {hasProjects ? 'Transfer ownership before removing' : 'Remove team member?'}
          </DialogTitle>
          <DialogDescription>
            {isLoading ? (
              'Checking project ownership…'
            ) : hasProjects ? (
              <>
                <span className="font-medium">{member.user.name}</span> owns{' '}
                {ownedProjects.length} project{ownedProjects.length !== 1 ? 's' : ''}.
                Assign a new owner for each before removing them from the team.
              </>
            ) : (
              <>
                Are you sure you want to remove{' '}
                <span className="font-medium">{member.user.name}</span> from the team?
                They will lose access to all team resources.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-3 py-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {!isLoading && hasProjects && (
          <div className="space-y-3 py-2">
            {ownedProjects.map((project) => (
              <div key={project.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{project.name}</p>
                  <p className="text-xs text-muted-foreground">{project.key}</p>
                </div>
                <Select
                  value={transfers[project.id] ?? ''}
                  onValueChange={(value) =>
                    setTransfers((prev) => ({ ...prev, [project.id]: value }))
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select new owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleOwners.map((owner) => (
                      <SelectItem key={owner.userId} value={owner.userId}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={owner.image ?? undefined} alt={owner.name} />
                            <AvatarFallback className="text-[10px]">
                              {owner.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{owner.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRemove}
            disabled={!allAssigned || isPending || isLoading}
          >
            {hasProjects ? 'Remove Member' : 'Remove'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run component tests**

```bash
cd /Users/BYKHD/Documents/GitHub/ui-syncup && bun run test src/features/team-settings/components/__tests__/remove-member-dialog.test.tsx --reporter=verbose
```

Expected: PASS all tests

- [ ] **Step 5: Commit**

```bash
cd /Users/BYKHD/Documents/GitHub/ui-syncup && git add src/features/team-settings/components/remove-member-dialog.tsx src/features/team-settings/components/__tests__/remove-member-dialog.test.tsx && git commit -m "feat: add RemoveMemberDialog with ownership transfer flow"
```

---

### Task 6: Wire Up `RemoveMemberDialog` in `TeamMembersList`

**Files:**
- Modify: `src/features/team-settings/components/team-members-list.tsx`
- Modify: `src/features/teams/hooks/use-remove-member.ts`

- [ ] **Step 1: Update `useRemoveMember` to forward `ownershipTransfers`**

In `src/features/teams/hooks/use-remove-member.ts`, update the `RemoveMemberVariables` interface and `mutationFn`:

```typescript
import type { OwnershipTransfer } from '../api';

export interface RemoveMemberVariables {
  teamId: string;
  userId: string;
  ownershipTransfers?: OwnershipTransfer[];
}
```

Update `mutationFn`:

```typescript
mutationFn: ({ teamId, userId, ownershipTransfers }: RemoveMemberVariables) =>
  removeMember(teamId, userId, ownershipTransfers),
```

- [ ] **Step 2: Update `team-members-list.tsx`**

In `src/features/team-settings/components/team-members-list.tsx`:

Remove the `AlertDialog` import block:

```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
```

Remove the `useRemoveMember` hook call and `handleRemoveMember` function (both now live inside `RemoveMemberDialog`).

Add import:

```typescript
import { RemoveMemberDialog } from './remove-member-dialog';
```

Replace the entire `<AlertDialog>` block at the bottom of the return with:

```tsx
{memberToRemove && (
  <RemoveMemberDialog
    member={memberToRemove}
    teamId={teamId}
    open={!!memberToRemove}
    onOpenChange={(open) => { if (!open) setMemberToRemove(null); }}
    onSuccess={() => setMemberToRemove(null)}
  />
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/BYKHD/Documents/GitHub/ui-syncup && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors

- [ ] **Step 4: Run the full test suite**

```bash
cd /Users/BYKHD/Documents/GitHub/ui-syncup && bun run test --reporter=verbose 2>&1 | tail -40
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
cd /Users/BYKHD/Documents/GitHub/ui-syncup && git add src/features/team-settings/components/team-members-list.tsx src/features/teams/hooks/use-remove-member.ts && git commit -m "feat: wire RemoveMemberDialog into team members list"
```

---

## Self-Review

**Spec coverage:**
- ✅ Fetch owned projects before showing dialog (Task 1 + 4)
- ✅ Show project list with per-project owner selector (Task 5)
- ✅ Remove button disabled until all projects assigned (Task 5)
- ✅ Atomic ownership transfer + member removal on server (Task 2)
- ✅ Simple confirm path when no projects owned (Task 5)
- ✅ Loading skeleton while checking ownership (Task 5)
- ✅ Server-side safety net blocks removal if transfers missing (Task 2)
- ✅ GET API endpoint (Task 3)
- ✅ Enhanced DELETE endpoint (Task 3)

**Placeholder scan:** All code blocks are complete. No TBDs.

**Type consistency:** `OwnershipTransfer` defined in `remove-member.ts`, re-exported from `api/index.ts`, imported in `use-remove-member.ts` and `RemoveMemberDialog` — consistent throughout. `OwnedProject` / `EligibleOwner` types flow from server → Zod schema → API client → hook → component without gaps.
