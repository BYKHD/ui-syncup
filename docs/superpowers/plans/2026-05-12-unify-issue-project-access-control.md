# Unify Issue + Project Access Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Eliminate the inconsistency where same-team non-members can list issues in a "public" project but get 403 when opening the issue detail, and close the related cross-team leak where users from a different team can view another team's "public" projects/issues.

**Architecture:** Tighten `canAccessProject()` so the public-visibility branch requires team membership (matches the documented "any team member" rule in `concepts/rbac-roles`). Introduce a thin `canViewIssue()` helper used by all read-only issue endpoints, replacing `hasPermission(ISSUE_VIEW, project)` calls that ignore project visibility. Write endpoints continue to use `hasPermission(ISSUE_UPDATE / ISSUE_DELETE, ...)` because they require an actual project-member role.

**Tech Stack:** Next.js App Router, TypeScript, Drizzle ORM, Vitest (`bun run test`), PGlite for integration tests.

**Out of scope (follow-ups, do NOT include):**
- UX for cross-team users hitting a shared issue link — they will fall through to `AccessRequestScreen` (already used for same-team non-members of private projects); whether the access-request flow should accept cross-team requests is a separate product decision.
- Migrating annotation routes — they already use `getAnnotationPermissions()` which correctly denies non-team-members. No change required.
- Editing the access-request flow itself.

---

## File Structure

**Modify:**
- `src/server/projects/project-service.ts` — tighten `canAccessProject` (line 388), add new `canViewIssue` helper.
- `src/server/projects/index.ts` — export `canViewIssue`.
- `src/app/api/issues/[issueId]/route.ts` — swap `hasPermission(ISSUE_VIEW)` → `canViewIssue` in `GET` (line 110). Leave `PATCH` (line 281) and `DELETE` (line 456) untouched.
- `src/app/api/issues/[issueId]/activities/route.ts` — swap `hasPermission(ISSUE_VIEW)` → `canViewIssue` in `GET` (line 111).
- `src/app/api/issues/[issueId]/attachments/route.ts` — swap `hasPermission(ISSUE_VIEW)` → `canViewIssue` in `GET` (line 106). Leave `POST` (line 274, uses `ISSUE_UPDATE`) untouched.

**Test (modify):**
- `src/server/projects/__tests__/project-service.access-check.integration.test.ts` — flip the cross-team-public assertion (line 93–109), add same-team-non-member-public assertion, add `canViewIssue` cases.

**Wiki update:**
- `.ai/wiki/concepts/rbac-roles.md` — add a one-line note that "public" means *team members only*, with citation to `canAccessProject`.
- `.ai/wiki/log.md` — append session-end entry per CLAUDE.md protocol.

**Untouched on purpose:**
- `src/app/api/projects/[id]/route.ts` — already uses `getProject() → canAccessProject()`; benefits automatically.
- `src/app/api/projects/[id]/issues/route.ts` — already calls `canAccessProject()` directly; benefits automatically.
- `src/app/(protected)/(team)/(routes)/issue/[issueKey]/page.tsx` — already calls `getProjectForAccessCheck() → canAccessProject()`; benefits automatically.
- All annotation routes under `src/app/api/issues/[issueId]/attachments/[attachmentId]/annotations/**`.

---

## Task 1: Tighten `canAccessProject()` so public projects require team membership

**Files:**
- Modify: `src/server/projects/project-service.ts:388-412`
- Test: `src/server/projects/__tests__/project-service.access-check.integration.test.ts:93-109` (existing test asserts the leaky behavior — must be flipped)

- [x] **Step 1: Update the existing failing test to reflect new contract**

In `src/server/projects/__tests__/project-service.access-check.integration.test.ts`, replace lines 93–109 with:

```ts
  test('non-team-member, public project: returns project + hasAccess false (cross-team leak closed)', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-pac-public-${ts}@test.com`, 'Owner');
    const outsider = await createTestUser(`out-pac-public-${ts}@test.com`, 'Outsider');
    const team = await createTeam({ name: `T-pac-public-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject(
      { teamId: team.id, name: `P-pac-public-${ts}`, key: uniqueKey(), visibility: 'public' },
      owner.id
    );
    testProjectIds.push(project.id);

    const result = await getProjectForAccessCheck(project.id, outsider.id);
    expect(result).not.toBeNull();
    expect(result!.hasAccess).toBe(false);
    expect(result!.project.id).toBe(project.id);
  });

  test('team-member but not project-member, public project: returns project + hasAccess true', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-pac-tm-${ts}@test.com`, 'Owner');
    const teamMate = await createTestUser(`tm-pac-tm-${ts}@test.com`, 'TeamMate');
    const team = await createTeam({ name: `T-pac-tm-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);

    // Add teamMate to the team as a plain TEAM_MEMBER (no project membership)
    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: teamMate.id,
      operationalRole: 'TEAM_MEMBER',
    });

    const project = await createProject(
      { teamId: team.id, name: `P-pac-tm-${ts}`, key: uniqueKey(), visibility: 'public' },
      owner.id
    );
    testProjectIds.push(project.id);

    const result = await getProjectForAccessCheck(project.id, teamMate.id);
    expect(result).not.toBeNull();
    expect(result!.hasAccess).toBe(true);
    expect(result!.project.id).toBe(project.id);
  });
```

- [x] **Step 2: Run the tests to verify the first one fails (current code still returns hasAccess=true for outsiders)**

Run: `bun run test src/server/projects/__tests__/project-service.access-check.integration.test.ts`
Expected: FAIL — `non-team-member, public project: returns project + hasAccess false` expects `false` but gets `true`. The new same-team-member-public test should PASS already (because the current leaky branch lets everyone in).

- [x] **Step 3: Update `canAccessProject()` to require team membership**

In `src/server/projects/project-service.ts`, add `teamMembers` import:

Replace line 10–12:
```ts
import { projectMembers } from "@/server/db/schema/project-members";
import { issues } from "@/server/db/schema/issues";
import { eq, and, isNull, or, like, count, inArray } from "drizzle-orm";
```
with:
```ts
import { projectMembers } from "@/server/db/schema/project-members";
import { teamMembers } from "@/server/db/schema/team-members";
import { issues } from "@/server/db/schema/issues";
import { eq, and, isNull, or, like, count, inArray } from "drizzle-orm";
```

Then replace `canAccessProject` (lines 388–412) with:

```ts
export async function canAccessProject(
  userId: string,
  project: { id: string; teamId: string; visibility: string }
): Promise<boolean> {
  // Team membership is the floor — non-team-members never see anything,
  // regardless of project visibility. Closes cross-team "public" leak.
  const teamMembership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, project.teamId),
      eq(teamMembers.userId, userId)
    ),
  });

  if (!teamMembership) {
    return false;
  }

  // Public projects: any team member can view.
  if (project.visibility === "public") {
    return true;
  }

  // Private projects: must be a project member.
  const projectMembership = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, project.id),
      eq(projectMembers.userId, userId)
    ),
  });

  if (projectMembership) {
    return true;
  }

  // Team owners/admins can see all private projects within their own team.
  return (
    teamMembership.managementRole === "TEAM_OWNER" ||
    teamMembership.managementRole === "TEAM_ADMIN"
  );
}
```

Note: this also lets us drop the `getManagementRole(userId, project.teamId)` lookup at the bottom because we already have the membership row — saves one query per call.

- [x] **Step 4: Run the access-check tests and verify all pass**

Run: `bun run test src/server/projects/__tests__/project-service.access-check.integration.test.ts`
Expected: PASS — all 6 tests (including the two new ones) pass.

- [x] **Step 5: Run the full project-service property tests to make sure nothing else regressed**

Run: `bun run test src/server/projects/__tests__/`
Expected: PASS — all suites green. If `member-service.property.test.ts` or others fail because they relied on cross-team access, that is an additional bug uncovered by this fix; investigate before proceeding.

- [x] **Step 6: Commit**

```bash
git add src/server/projects/project-service.ts src/server/projects/__tests__/project-service.access-check.integration.test.ts
git commit -m "fix(projects): require team membership for public-project access

Previously canAccessProject returned true for any authenticated user when
visibility was 'public', allowing users from other teams to view another
team's projects via direct URL. The wiki ([[concepts/rbac-roles]])
documents 'public' as 'any team member can view' — this aligns the code
to the documented contract and closes the cross-team leak."
```

---

## Task 2: Add `canViewIssue()` helper

**Files:**
- Modify: `src/server/projects/project-service.ts` (append after `canAccessProject`)
- Modify: `src/server/projects/index.ts`
- Test: `src/server/projects/__tests__/project-service.access-check.integration.test.ts` (append a new `describe` block)

- [x] **Step 1: Write the failing tests for `canViewIssue`**

In `src/server/projects/__tests__/project-service.access-check.integration.test.ts`, add this `describe` block at the bottom of the file:

```ts
describe('canViewIssue', () => {
  test('returns false for non-existent project (issue points at deleted/missing project)', async () => {
    const ts = Date.now();
    const user = await createTestUser(`user-cvi1-${ts}@test.com`, 'U');
    const result = await canViewIssue(user.id, { projectId: crypto.randomUUID() });
    expect(result).toBe(false);
  });

  test('returns true for project owner (private project)', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-cvi2-${ts}@test.com`, 'Owner');
    const team = await createTeam({ name: `T-cvi2-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject(
      { teamId: team.id, name: `P-cvi2-${ts}`, key: uniqueKey(), visibility: 'private' },
      owner.id
    );
    testProjectIds.push(project.id);

    const result = await canViewIssue(owner.id, { projectId: project.id });
    expect(result).toBe(true);
  });

  test('returns true for same-team non-project-member on public project (the bug fix)', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-cvi3-${ts}@test.com`, 'Owner');
    const teamMate = await createTestUser(`tm-cvi3-${ts}@test.com`, 'TeamMate');
    const team = await createTeam({ name: `T-cvi3-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: teamMate.id,
      operationalRole: 'TEAM_MEMBER',
    });
    const project = await createProject(
      { teamId: team.id, name: `P-cvi3-${ts}`, key: uniqueKey(), visibility: 'public' },
      owner.id
    );
    testProjectIds.push(project.id);

    const result = await canViewIssue(teamMate.id, { projectId: project.id });
    expect(result).toBe(true);
  });

  test('returns false for cross-team user on public project', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-cvi4-${ts}@test.com`, 'Owner');
    const outsider = await createTestUser(`out-cvi4-${ts}@test.com`, 'Outsider');
    const team = await createTeam({ name: `T-cvi4-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject(
      { teamId: team.id, name: `P-cvi4-${ts}`, key: uniqueKey(), visibility: 'public' },
      owner.id
    );
    testProjectIds.push(project.id);

    const result = await canViewIssue(outsider.id, { projectId: project.id });
    expect(result).toBe(false);
  });

  test('returns false for soft-deleted project', async () => {
    const ts = Date.now();
    const owner = await createTestUser(`owner-cvi5-${ts}@test.com`, 'Owner');
    const team = await createTeam({ name: `T-cvi5-${ts}`, creatorId: owner.id });
    testTeamIds.push(team.id);
    const project = await createProject(
      { teamId: team.id, name: `P-cvi5-${ts}`, key: uniqueKey() },
      owner.id
    );
    testProjectIds.push(project.id);

    await db.update(projects).set({ deletedAt: new Date() }).where(eq(projects.id, project.id));

    const result = await canViewIssue(owner.id, { projectId: project.id });
    expect(result).toBe(false);
  });
});
```

Also at the top of the file, add `canViewIssue` to the import:
```ts
import { getProjectForAccessCheck, canViewIssue } from '@/server/projects/project-service';
```

(Replace the existing `import { getProjectForAccessCheck } from '@/server/projects/project-service';` line.)

- [x] **Step 2: Run the tests to verify they fail**

Run: `bun run test src/server/projects/__tests__/project-service.access-check.integration.test.ts`
Expected: FAIL — `canViewIssue is not a function` / `Cannot find name 'canViewIssue'`.

- [x] **Step 3: Implement `canViewIssue` in `project-service.ts`**

In `src/server/projects/project-service.ts`, append at the end of the file (after `getProjectForAccessCheck`):

```ts
/**
 * Check if a user can view an issue.
 *
 * Thin wrapper around `canAccessProject` that loads the issue's project
 * (id, teamId, visibility) so all read-only issue routes share one rule.
 *
 * Use this for ISSUE_VIEW-equivalent checks. For write/delete operations,
 * keep using `hasPermission(ISSUE_UPDATE / ISSUE_DELETE, ...)` from
 * `@/server/auth/rbac` — those require an actual project-member role.
 *
 * @param userId - User to check
 * @param issue - Anything carrying the issue's projectId
 * @returns True if the user can view the issue
 */
export async function canViewIssue(
  userId: string,
  issue: { projectId: string }
): Promise<boolean> {
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, issue.projectId), isNull(projects.deletedAt)),
    columns: { id: true, teamId: true, visibility: true },
  });

  if (!project) {
    return false;
  }

  return canAccessProject(userId, project);
}
```

- [x] **Step 4: Export `canViewIssue` from the projects barrel**

In `src/server/projects/index.ts`, find the line:
```ts
export { getProjectForAccessCheck } from "./project-service";
```
and replace it with:
```ts
export { getProjectForAccessCheck, canViewIssue } from "./project-service";
```

(If the barrel uses a different export grouping, append `canViewIssue` to the existing `project-service` export. Do NOT add `export *` per CLAUDE.md.)

- [x] **Step 5: Run the tests and verify all pass**

Run: `bun run test src/server/projects/__tests__/project-service.access-check.integration.test.ts`
Expected: PASS — both `getProjectForAccessCheck` and `canViewIssue` describe blocks green (11 tests total).

- [x] **Step 6: Commit**

```bash
git add src/server/projects/project-service.ts src/server/projects/index.ts src/server/projects/__tests__/project-service.access-check.integration.test.ts
git commit -m "feat(projects): add canViewIssue helper to unify issue read-access checks"
```

---

## Task 3: Migrate `GET /api/issues/[issueId]` to `canViewIssue`

**Files:**
- Modify: `src/app/api/issues/[issueId]/route.ts:13` (imports), `:109-134` (the check inside `GET`)
- Test: `src/app/api/issues/[issueId]/__tests__/route.test.ts` (CREATE — does not exist yet)

- [x] **Step 1: Write a failing route test for the same-team-non-member-public scenario**

Create `src/app/api/issues/[issueId]/__tests__/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetSession = vi.fn();
const mockGetIssueById = vi.fn();
const mockGetAttachmentsByIssue = vi.fn();
const mockCanViewIssue = vi.fn();

vi.mock('@/server/auth/session', () => ({ getSession: mockGetSession }));
vi.mock('@/server/issues/issue-service', () => ({ getIssueById: mockGetIssueById }));
vi.mock('@/server/issues/attachment-service', () => ({
  getAttachmentsByIssue: mockGetAttachmentsByIssue,
}));
vi.mock('@/server/projects', () => ({ canViewIssue: mockCanViewIssue }));
vi.mock('@/server/storage/s3', () => ({
  generateDownloadUrl: vi.fn(async () => 'https://example.com/download'),
}));

const { GET } = await import('../route');

function makeRequest() {
  return new NextRequest('http://localhost/api/issues/issue-1', { method: 'GET' });
}

const mockIssue = {
  id: 'issue-1',
  projectId: 'proj-1',
  teamId: 'team-1',
  title: 'T',
  description: 'D',
  issueKey: 'P-1',
  reporterId: 'u',
  assigneeId: null,
  status: 'open',
  priority: 'medium',
  type: 'bug',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('GET /api/issues/[issueId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ id: 'user-1' });
    mockGetIssueById.mockResolvedValue(mockIssue);
    mockGetAttachmentsByIssue.mockResolvedValue([]);
  });

  it('returns 200 when canViewIssue is true (same-team non-project-member, public project)', async () => {
    mockCanViewIssue.mockResolvedValue(true);
    const res = await GET(makeRequest(), { params: Promise.resolve({ issueId: 'issue-1' }) });
    expect(res.status).toBe(200);
    expect(mockCanViewIssue).toHaveBeenCalledWith('user-1', { projectId: 'proj-1' });
  });

  it('returns 403 when canViewIssue is false', async () => {
    mockCanViewIssue.mockResolvedValue(false);
    const res = await GET(makeRequest(), { params: Promise.resolve({ issueId: 'issue-1' }) });
    expect(res.status).toBe(403);
  });

  it('returns 401 when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(makeRequest(), { params: Promise.resolve({ issueId: 'issue-1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when issue not found', async () => {
    mockGetIssueById.mockResolvedValue(null);
    const res = await GET(makeRequest(), { params: Promise.resolve({ issueId: 'issue-1' }) });
    expect(res.status).toBe(404);
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `bun run test src/app/api/issues/\[issueId\]/__tests__/route.test.ts`
Expected: FAIL — current route imports/calls `hasPermission`, not `canViewIssue`. The mock for `canViewIssue` is never invoked, so `expect(mockCanViewIssue).toHaveBeenCalledWith(...)` fails. Status checks for the 200 case may also fail because `hasPermission` (unmocked) will return false.

- [x] **Step 3: Update the route to use `canViewIssue`**

In `src/app/api/issues/[issueId]/route.ts`:

a) Update imports — remove the `hasPermission` import only if no other handler in the file uses it (it IS used by `PATCH` and `DELETE`, so KEEP the import). Add `canViewIssue`:

Find:
```ts
import { hasPermission } from "@/server/auth/rbac";
import { PERMISSIONS } from "@/config/roles";
```
Add directly after:
```ts
import { canViewIssue } from "@/server/projects";
```

b) Replace lines 109–134 (the `// Check ISSUE_VIEW permission on the project` block through end of the `if (!canView)` block). Find:
```ts
    // Check ISSUE_VIEW permission on the project
    const canView = await hasPermission({
      userId: user.id,
      permission: PERMISSIONS.ISSUE_VIEW,
      resourceId: issue.projectId,
      resourceType: "project",
    });

    if (!canView) {
      logger.warn("api.issue.get.forbidden", {
        requestId,
        userId: user.id,
        issueId,
        projectId: issue.projectId,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to view this issue",
          },
        },
        { status: 403 }
      );
    }
```
Replace with:
```ts
    // Check view access (same rule as project detail / issues list)
    const canView = await canViewIssue(user.id, { projectId: issue.projectId });

    if (!canView) {
      logger.warn("api.issue.get.forbidden", {
        requestId,
        userId: user.id,
        issueId,
        projectId: issue.projectId,
      });

      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to view this issue",
          },
        },
        { status: 403 }
      );
    }
```

- [x] **Step 4: Run the route test and verify it passes**

Run: `bun run test src/app/api/issues/\[issueId\]/__tests__/route.test.ts`
Expected: PASS — all 4 cases green.

- [x] **Step 5: Commit**

```bash
git add src/app/api/issues/\[issueId\]/route.ts src/app/api/issues/\[issueId\]/__tests__/route.test.ts
git commit -m "fix(api): unify GET /api/issues/[issueId] view check with canViewIssue

Previously this endpoint used hasPermission(ISSUE_VIEW) which only checked
project_members, returning 403 for same-team non-project-members on public
projects even though the project detail and issues-list endpoints allowed
the same user to see the issue in the list. Now uses canViewIssue, the
same rule the project routes use."
```

---

## Task 4: Migrate `GET /api/issues/[issueId]/activities` to `canViewIssue`

**Files:**
- Modify: `src/app/api/issues/[issueId]/activities/route.ts:11` (imports), `:108-135` (the check inside `GET`)
- Test: `src/app/api/issues/[issueId]/activities/__tests__/route.test.ts` (CREATE)

- [x] **Step 1: Write a failing route test**

Create `src/app/api/issues/[issueId]/activities/__tests__/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetSession = vi.fn();
const mockGetIssueById = vi.fn();
const mockGetActivities = vi.fn();
const mockCanViewIssue = vi.fn();

vi.mock('@/server/auth/session', () => ({ getSession: mockGetSession }));
vi.mock('@/server/issues/issue-service', () => ({ getIssueById: mockGetIssueById }));
vi.mock('@/server/issues/activity-service', () => ({ getActivitiesByIssue: mockGetActivities }));
vi.mock('@/server/projects', () => ({ canViewIssue: mockCanViewIssue }));

const { GET } = await import('../route');

function makeRequest() {
  return new NextRequest('http://localhost/api/issues/issue-1/activities', { method: 'GET' });
}

const mockIssue = { id: 'issue-1', projectId: 'proj-1' };

describe('GET /api/issues/[issueId]/activities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ id: 'user-1' });
    mockGetIssueById.mockResolvedValue(mockIssue);
    mockGetActivities.mockResolvedValue([]);
  });

  it('returns 200 when canViewIssue is true', async () => {
    mockCanViewIssue.mockResolvedValue(true);
    const res = await GET(makeRequest(), { params: Promise.resolve({ issueId: 'issue-1' }) });
    expect(res.status).toBe(200);
    expect(mockCanViewIssue).toHaveBeenCalledWith('user-1', { projectId: 'proj-1' });
  });

  it('returns 403 when canViewIssue is false', async () => {
    mockCanViewIssue.mockResolvedValue(false);
    const res = await GET(makeRequest(), { params: Promise.resolve({ issueId: 'issue-1' }) });
    expect(res.status).toBe(403);
  });
});
```

> [!note] Verify the imported activity-service function name. Open `src/server/issues/activity-service.ts` and confirm the read function is `getActivitiesByIssue`. If different, adjust the `vi.mock` shape. If the route imports a different module path, mirror it.

- [x] **Step 2: Run the test to verify it fails**

Run: `bun run test src/app/api/issues/\[issueId\]/activities/__tests__/route.test.ts`
Expected: FAIL — same reason as Task 3.

- [x] **Step 3: Update the route to use `canViewIssue`**

In `src/app/api/issues/[issueId]/activities/route.ts`, the `GET` handler currently has this block around line 108–135:

```ts
    // Check ISSUE_VIEW permission on the project
    const canView = await hasPermission({
      userId: user.id,
      permission: PERMISSIONS.ISSUE_VIEW,
      resourceId: issue.projectId,
      resourceType: "project",
    });

    if (!canView) {
      // ...403 response...
    }
```

a) Add the `canViewIssue` import next to existing imports:
```ts
import { canViewIssue } from "@/server/projects";
```

b) Replace the `const canView = await hasPermission({...})` line and its argument object with:
```ts
    const canView = await canViewIssue(user.id, { projectId: issue.projectId });
```

c) Leave the existing `if (!canView) { ... return 403 ... }` block untouched.

d) Check whether `hasPermission` and `PERMISSIONS` are still referenced elsewhere in the file. If neither is used anywhere else, remove their imports (lines 11 and the line importing `PERMISSIONS`). If yes, keep them.

- [x] **Step 4: Run the test and verify it passes**

Run: `bun run test src/app/api/issues/\[issueId\]/activities/__tests__/route.test.ts`
Expected: PASS — both cases green.

- [x] **Step 5: Commit**

```bash
git add src/app/api/issues/\[issueId\]/activities/route.ts src/app/api/issues/\[issueId\]/activities/__tests__/route.test.ts
git commit -m "fix(api): unify GET /api/issues/[issueId]/activities view check with canViewIssue"
```

---

## Task 5: Migrate `GET /api/issues/[issueId]/attachments` to `canViewIssue`

**Files:**
- Modify: `src/app/api/issues/[issueId]/attachments/route.ts:12` (imports), `:103-130` (the check inside `GET`)
- Test: `src/app/api/issues/[issueId]/attachments/__tests__/route.test.ts` (CREATE)

- [x] **Step 1: Write a failing route test for the GET handler only**

Create `src/app/api/issues/[issueId]/attachments/__tests__/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetSession = vi.fn();
const mockGetIssueById = vi.fn();
const mockGetAttachmentsByIssue = vi.fn();
const mockCanViewIssue = vi.fn();

vi.mock('@/server/auth/session', () => ({ getSession: mockGetSession }));
vi.mock('@/server/issues/issue-service', () => ({ getIssueById: mockGetIssueById }));
vi.mock('@/server/issues/attachment-service', () => ({
  getAttachmentsByIssue: mockGetAttachmentsByIssue,
  createAttachment: vi.fn(),
}));
vi.mock('@/server/projects', () => ({ canViewIssue: mockCanViewIssue }));
vi.mock('@/server/storage/s3', () => ({
  generateDownloadUrl: vi.fn(async () => 'https://example.com/download'),
}));

const { GET } = await import('../route');

function makeRequest() {
  return new NextRequest('http://localhost/api/issues/issue-1/attachments', { method: 'GET' });
}

const mockIssue = { id: 'issue-1', projectId: 'proj-1' };

describe('GET /api/issues/[issueId]/attachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ id: 'user-1' });
    mockGetIssueById.mockResolvedValue(mockIssue);
    mockGetAttachmentsByIssue.mockResolvedValue([]);
  });

  it('returns 200 when canViewIssue is true', async () => {
    mockCanViewIssue.mockResolvedValue(true);
    const res = await GET(makeRequest(), { params: Promise.resolve({ issueId: 'issue-1' }) });
    expect(res.status).toBe(200);
    expect(mockCanViewIssue).toHaveBeenCalledWith('user-1', { projectId: 'proj-1' });
  });

  it('returns 403 when canViewIssue is false', async () => {
    mockCanViewIssue.mockResolvedValue(false);
    const res = await GET(makeRequest(), { params: Promise.resolve({ issueId: 'issue-1' }) });
    expect(res.status).toBe(403);
  });
});
```

> [!note] Verify mock paths. Open `src/app/api/issues/[issueId]/attachments/route.ts` and confirm the storage helper used (e.g. `generateDownloadUrl`) and its import path. Adjust the `vi.mock('@/server/storage/s3', ...)` line to mirror the actual import.

- [x] **Step 2: Run the test to verify it fails**

Run: `bun run test src/app/api/issues/\[issueId\]/attachments/__tests__/route.test.ts`
Expected: FAIL — `canViewIssue` mock never invoked.

- [x] **Step 3: Update the GET handler to use `canViewIssue`**

In `src/app/api/issues/[issueId]/attachments/route.ts`:

a) Add the import next to existing ones:
```ts
import { canViewIssue } from "@/server/projects";
```

b) In the `GET` handler (around line 103–130), find:
```ts
    // Check ISSUE_VIEW permission on the project
    const canView = await hasPermission({
      userId: user.id,
      permission: PERMISSIONS.ISSUE_VIEW,
      resourceId: issue.projectId,
      resourceType: "project",
    });
```
Replace with:
```ts
    // Check view access (same rule as project detail / issues list)
    const canView = await canViewIssue(user.id, { projectId: issue.projectId });
```

c) Leave the `if (!canView)` 403 response block untouched.

d) Do NOT change the `POST` handler — it correctly uses `hasPermission(ISSUE_UPDATE, ...)` because attachment creation requires an actual project-member role.

e) Confirm `hasPermission` and `PERMISSIONS` are still referenced (by the `POST` handler) — keep their imports.

- [x] **Step 4: Run the test and verify it passes**

Run: `bun run test src/app/api/issues/\[issueId\]/attachments/__tests__/route.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/app/api/issues/\[issueId\]/attachments/route.ts src/app/api/issues/\[issueId\]/attachments/__tests__/route.test.ts
git commit -m "fix(api): unify GET /api/issues/[issueId]/attachments view check with canViewIssue"
```

---

## Task 6: End-to-end smoke check + wiki update + log entry

**Files:**
- Modify: `.ai/wiki/concepts/rbac-roles.md`
- Modify: `.ai/wiki/log.md`

- [x] **Step 1: Run the focused test suites for everything touched**

Run, in order:
```
bun run test src/server/projects/__tests__/
bun run test src/app/api/issues/
bun run test src/app/api/projects/
```
Expected: PASS across all three.

- [x] **Step 2: Manually verify the bug is fixed in the dev server**

Per CLAUDE.md ("for UI or frontend changes, start the dev server and use the feature in a browser"):

1. Start the dev server: `bun run dev`
2. Sign in as a user who is a TEAM_MEMBER of a team but NOT a project member of one of the team's public projects.
3. Navigate to `/<projectSlug>` — verify the project page renders and lists issues.
4. Click an issue — verify the issue detail page loads (no "permission denied" error).
5. Sign in as a user who is NOT a member of the team at all.
6. Navigate to `/<projectSlug>` for that team's public project — verify a 404 (notFound) is rendered, not the project page.
7. Navigate directly to a shared issue URL `/issue/<issueKey>` for that public project — verify the AccessRequestScreen renders, not the issue detail.

If any of these don't behave as documented, debug before continuing.

- [x] **Step 3: Update the wiki**

In `.ai/wiki/concepts/rbac-roles.md`, find the "Storage (single source of truth)" section. Above it, add a new section:

```md
## Project visibility access rules

| Visibility | Who can view |
|---|---|
| `public` | Any **member of the project's team** (does not need to be a project member). |
| `private` | Project members + that team's `TEAM_OWNER` / `TEAM_ADMIN`. |

Cross-team users never see another team's projects regardless of visibility. Enforced by `canAccessProject()` in `src/server/projects/project-service.ts`. Read-only issue endpoints share this rule via `canViewIssue()`. Write/delete issue endpoints continue to require an actual project-member role via `hasPermission(ISSUE_UPDATE / ISSUE_DELETE, ...)`.
```

Update the page's `last_updated` frontmatter to today's date.

- [x] **Step 4: Append the session-end log entry**

In `.ai/wiki/log.md`, append at the bottom:

```md
## [2026-05-12] update | concepts/rbac-roles — public-project access requires team membership

Tightened `canAccessProject()` and added `canViewIssue()` to unify read-access checks across project + issue routes. Closes a cross-team leak where any authenticated user could view another team's "public" projects via direct URL, and fixes the inconsistency where same-team non-members could list issues but get 403 on the issue detail.

Touched: `src/server/projects/project-service.ts`, `src/server/projects/index.ts`, `src/app/api/issues/[issueId]/route.ts`, `src/app/api/issues/[issueId]/activities/route.ts`, `src/app/api/issues/[issueId]/attachments/route.ts`, plus tests.
```

- [x] **Step 5: Commit**

```bash
git add .ai/wiki/concepts/rbac-roles.md .ai/wiki/log.md
git commit -m "docs(wiki): document project visibility access rules + log session"
```

- [x] **Step 6: Final verification — full type check**

Run: `bun run typecheck` (or whatever the project's type-check script is — verify in `package.json`)
Expected: PASS — no new TypeScript errors.

If `bun run typecheck` is not defined, run `bunx tsc --noEmit` as a fallback. Do not skip this — the API route changes touch types and a missing import would only surface here.

---

## Self-Review Notes

- **Spec coverage:** Plan covers (1) `canAccessProject` semantic change, (2) `canViewIssue` helper, (3) all 3 affected read endpoints, (4) UX confirmation that cross-team users hit `AccessRequestScreen` (no code change needed there), (5) test updates including the existing failing assertion, (6) wiki + log per CLAUDE.md protocol. Annotation routes explicitly called out as already-correct.
- **Type consistency:** Helper signature `canViewIssue(userId, { projectId })` is consistent across Tasks 2–5. Mock shape `{ id: 'issue-1', projectId: 'proj-1' }` consistent. Import path `@/server/projects` consistent.
- **Placeholder scan:** No TBDs. Every code block is concrete. The two `[!note]` blocks (Tasks 4 & 5) ask the implementer to verify the activity-service / storage import names — these are not placeholders, they are deliberate verification points because the route file's import shape varies and silently mocking the wrong path produces confusing failures.
- **Out-of-scope items** (cross-team access-request UX, annotation route migration) are listed up-front so the implementer doesn't expand scope.
