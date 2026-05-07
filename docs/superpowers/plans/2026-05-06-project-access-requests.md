# Project Access Requests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dead-end "Error loading issue" page that signed-in non-members hit on a shared issue link with a project-scoped "Request access" flow that approvers (PROJECT_OWNER + PROJECT_EDITOR) can approve/decline from the project members page.

**Architecture:** New `project_access_requests` table with a partial unique index for race-safe pending-uniqueness; new `access-request-service` mirroring `invitation-service` patterns and reusing the existing `joinProject` path on approval (which already auto-grants TEAM_MEMBER if needed); 5 new API routes; in-place UI panel on the issue page (no redirect, stable URL); SSE notifications + React Email templates parallel to project invitations.

**Tech Stack:** Next.js App Router, TypeScript, Drizzle ORM (Postgres), TanStack Query, Vitest + PGlite for integration tests, React Email, existing SSE notification pipeline.

**Spec:** [docs/plans/2026-05-06-project-access-requests-design.md](../../plans/2026-05-06-project-access-requests-design.md)

---

## File structure

### New files

| Path | Responsibility |
|---|---|
| `src/server/db/schema/project-access-requests.ts` | Drizzle table definition |
| `src/server/projects/access-request-service.ts` | Business logic (create / list / approve / decline / cancel / supersede) |
| `src/server/projects/__tests__/access-request-service.integration.test.ts` | Integration tests for the service |
| `src/server/email/templates/project-access-request-received-email.tsx` | Email to approvers |
| `src/server/email/templates/project-access-request-approved-email.tsx` | Email to requester (approved) |
| `src/server/email/templates/project-access-request-declined-email.tsx` | Email to requester (declined) |
| `src/app/api/projects/[id]/access-requests/route.ts` | POST create + GET list |
| `src/app/api/projects/[id]/access-requests/[requestId]/approve/route.ts` | POST approve |
| `src/app/api/projects/[id]/access-requests/[requestId]/decline/route.ts` | POST decline |
| `src/app/api/projects/[id]/access-requests/[requestId]/route.ts` | DELETE cancel |
| `src/app/api/projects/[id]/access-requests/__tests__/route.test.ts` | Route integration tests |
| `src/features/projects/api/create-access-request.ts` | Client API caller |
| `src/features/projects/api/list-access-requests.ts` | Client API caller |
| `src/features/projects/api/approve-access-request.ts` | Client API caller |
| `src/features/projects/api/decline-access-request.ts` | Client API caller |
| `src/features/projects/api/cancel-access-request.ts` | Client API caller |
| `src/features/projects/hooks/use-create-access-request.ts` | Mutation hook |
| `src/features/projects/hooks/use-my-access-request.ts` | Query hook (requester-side) |
| `src/features/projects/hooks/use-project-access-requests.ts` | Query hook (approver-side) |
| `src/features/projects/hooks/use-approve-access-request.ts` | Mutation hook |
| `src/features/projects/hooks/use-decline-access-request.ts` | Mutation hook |
| `src/features/projects/hooks/use-cancel-access-request.ts` | Mutation hook |
| `src/features/projects/components/access-requests/access-request-panel.tsx` | Requester panel (form + states) |
| `src/features/projects/components/access-requests/access-request-list.tsx` | Approver-side list section |
| `src/features/projects/components/access-requests/access-request-row.tsx` | Single row with Approve/Decline |
| `src/features/projects/screens/access-request-screen.tsx` | Page chrome wrapper |
| `.ai/wiki/concepts/access-requests.md` | Wiki concept page |

### Modified files

| Path | Why |
|---|---|
| `src/server/db/schema/index.ts` | Re-export new table |
| `src/config/roles.ts` | Add 3 new permissions to PERMISSIONS + grant lists |
| `src/server/projects/project-service.ts` | Add sibling `getProjectForAccessCheck` |
| `src/server/projects/member-service.ts:338+` | Call `supersedePendingRequests` from `joinProject` |
| `src/server/projects/invitation-service.ts` | Call `supersedePendingRequests` from `acceptProjectInvitation` and `acceptProjectInvitationById` |
| `src/server/projects/index.ts` | Re-export new service functions |
| `src/server/projects/types.ts` | Add `AccessRequest`, `AccessRequestStatus`, `AccessRequestWithRequester` types |
| `src/server/email/queue.ts` | Add 3 new email type discriminators |
| `src/server/email/render-template.tsx` | Register 3 new template-type entries |
| `src/server/notifications/types.ts` | Add 3 new notification types + zod enum entries |
| `src/server/notifications/notification-service.ts` (or wherever `buildTargetUrl` lives) | Add target-url builders for the 3 new types |
| `src/features/projects/api/index.ts` | Re-export new API callers |
| `src/features/projects/hooks/index.ts` | Re-export new hooks |
| `src/features/projects/components/index.ts` | Re-export new components |
| `src/features/projects/screens/index.ts` | Re-export new screen |
| `src/features/projects/index.ts` | Surface new exports |
| `src/app/(protected)/(team)/(routes)/issue/[issueKey]/page.tsx` | Branch on `hasAccess` |
| `src/app/(protected)/(verified)/(team)/(routes)/issue/[issueKey]/page.tsx` | Same branching for verified variant |
| `src/features/projects/screens/project-detail-screen.tsx` | Insert `<AccessRequestList>` above pending invitations on members tab |
| `.ai/wiki/index.md` | Add concept page entry |
| `.ai/wiki/features/projects.md` | List new screens / api / hooks / endpoints |
| `.ai/wiki/log.md` | Append session entry |

---

## Conventions used throughout

- **Test runner:** `bun run test` (vitest) — never `bun test` (corrupts local DB).
- **Scoped tests during dev:** `bun run test path/to/test-file.test.ts -t "test name"`. Run the full suite only via CI / pre-commit.
- **Migration generation:** `bun run db:generate` (creates a numbered SQL file under `drizzle/` and updates `drizzle/meta/_journal.json`).
- **Migration apply (test DB):** `bun run db:migrate` if needed — integration tests run against a fresh PGlite DB, so a migration file alone is enough for tests to pick it up.
- **Status enum (`project_access_requests.status`)** values are `'pending' | 'approved' | 'declined' | 'superseded' | 'cancelled'` — referenced verbatim throughout.
- **TDD:** every task writes the failing test first, runs to confirm RED, implements, runs to confirm GREEN, commits.
- **Commits:** small + focused. Each task ends with a commit. Commit subjects use Conventional Commits (`feat:`, `fix:`, `test:`, etc.) to match recent history.

---

## Execution Wave

Wave 0  (sequential):  Task 1 → 2
Wave 1  (sequential):  Task 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10
Wave 2  (sequential):  Task 11 → 12
Wave 3  (PARALLEL):    Task 13 (emails) ‖ Task 14 (notif types)
Wave 4  (sequential):  Task 15 (wires 13+14 in)
Wave 5  (sequential):  Task 16 → 17
Wave 6  (PARALLEL):    Task 18 (panel) ‖ Task 19 (list+row)
Wave 7  (sequential):  Task 20 → 21 → 22
Wave 8  (PARALLEL):    Task 23 (E2E) ‖ Task 24 (wiki)
Wave 9  (sequential):  Task 25 (final verify)

---

## Task 1: Add Drizzle schema for `project_access_requests`

**Files:**
- Create: `src/server/db/schema/project-access-requests.ts`
- Modify: `src/server/db/schema/index.ts`

- [x] **Step 1: Write the schema file**

Create `src/server/db/schema/project-access-requests.ts`:

```ts
/**
 * Project Access Requests Schema
 *
 * Stores user-initiated requests to join a project. Differs from
 * `project_invitations`: requests are receiver-initiated (no token, no email
 * indirection — uses `requesterUserId` directly).
 */

import { sql } from "drizzle-orm";
import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { users } from "./users";

export const projectAccessRequests = pgTable("project_access_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  requesterUserId: uuid("requester_user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  message: varchar("message", { length: 500 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
    // pending | approved | declined | superseded | cancelled
  decidedByUserId: uuid("decided_by_user_id").references(() => users.id),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  declineCooldownUntil: timestamp("decline_cooldown_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // At most one pending request per (project, user). Race-safe under concurrent
  // POSTs: a 23505 against this index means a duplicate request is in flight.
  // Mirrors project_invitations.activeInvitationUniqueIdx.
  pendingUniqueIdx: uniqueIndex("project_access_requests_pending_unique_idx")
    .on(table.projectId, table.requesterUserId)
    .where(sql`${table.status} = 'pending'`),
  projectStatusIdx: index("project_access_requests_project_status_idx")
    .on(table.projectId, table.status),
  requesterIdx: index("project_access_requests_requester_idx").on(table.requesterUserId),
}));

export type ProjectAccessRequestRow = typeof projectAccessRequests.$inferSelect;
export type NewProjectAccessRequestRow = typeof projectAccessRequests.$inferInsert;
```

- [x] **Step 2: Re-export from schema barrel**

Add to `src/server/db/schema/index.ts` next to the other table exports:

```ts
export * from "./project-access-requests";
```

(The existing barrel uses `export *` — match local convention rather than the import-rules guidance for application barrels; schema barrels are an established exception.)

- [x] **Step 3: Generate migration**

Run: `bun run db:generate`

Expected: a new file appears under `drizzle/` (e.g. `drizzle/0002_<adjective>.sql`) containing `CREATE TABLE "project_access_requests" ...` and the partial unique index. `drizzle/meta/_journal.json` is updated. `drizzle/meta/0002_snapshot.json` is created.

- [x] **Step 4: Sanity-check the generated SQL**

Open the new `drizzle/<id>_*.sql` and verify:
- `CREATE TABLE "project_access_requests"` with all 9 columns.
- `CREATE UNIQUE INDEX "project_access_requests_pending_unique_idx" ON "project_access_requests" ("project_id","requester_user_id") WHERE "status" = 'pending';` — the partial-unique index must include the `WHERE` clause.
- Two non-unique indexes for `(project_id, status)` and `(requester_user_id)`.
- ON DELETE CASCADE foreign keys for `project_id` and `requester_user_id`.

If the partial-unique index is missing the `WHERE` clause, hand-edit the SQL to add it (Drizzle's generator usually preserves it; if not, this is a known gotcha).

- [x] **Step 5: Commit** _(skipped — user commits manually)_

---

## Task 2: Add types + permissions

**Files:**
- Modify: `src/server/projects/types.ts`
- Modify: `src/config/roles.ts`

- [x] **Step 1: Add request types**

Append to `src/server/projects/types.ts`:

```ts
export type AccessRequestStatus =
  | "pending"
  | "approved"
  | "declined"
  | "superseded"
  | "cancelled";

export interface AccessRequest {
  id: string;
  projectId: string;
  requesterUserId: string;
  message: string | null;
  status: AccessRequestStatus;
  decidedByUserId: string | null;
  decidedAt: Date | null;
  declineCooldownUntil: Date | null;
  createdAt: Date;
}

export interface AccessRequestWithRequester extends AccessRequest {
  requester: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  decidedByUser: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface CreateAccessRequestData {
  projectId: string;
  userId: string;
  message?: string | null;
}
```

- [x] **Step 2: Add permissions to `PERMISSIONS`**

In `src/config/roles.ts`, locate the `PERMISSIONS` const (around line 88) and add three entries grouped with the other `project:*` permissions:

```ts
PROJECT_ACCESS_REQUEST_CREATE: "project:access_request:create",
PROJECT_ACCESS_REQUEST_LIST: "project:access_request:list",
PROJECT_ACCESS_REQUEST_APPROVE: "project:access_request:approve",
```

- [x] **Step 3: Grant to PROJECT_OWNER and PROJECT_EDITOR**

In the role-permission grant table (the object that maps `[PROJECT_ROLES.PROJECT_OWNER]: [...]` etc., starting around line 216), add these to **both** `PROJECT_OWNER` and `PROJECT_EDITOR`:

```ts
PERMISSIONS.PROJECT_ACCESS_REQUEST_LIST,
PERMISSIONS.PROJECT_ACCESS_REQUEST_APPROVE,
```

`PROJECT_ACCESS_REQUEST_CREATE` is **not** added to any role table — it's a "any authenticated user" permission, checked at the API layer via session presence rather than via `requirePermission`. Document that intent inline:

```ts
// Note: PROJECT_ACCESS_REQUEST_CREATE is intentionally not granted via role.
// Any authenticated user can request access; the service layer enforces
// not-already-a-member, no-pending-request, and cooldown invariants.
```

- [x] **Step 4: Commit** _(skipped — user commits manually)_

---

## Task 3: Service — `createAccessRequest` (TDD)

**Files:**
- Create: `src/server/projects/access-request-service.ts`
- Create: `src/server/projects/__tests__/access-request-service.integration.test.ts`

- [x] **Step 1: Write integration tests for create**

Create `src/server/projects/__tests__/access-request-service.integration.test.ts` with the test scaffolding (cleanup arrays, helpers — copy the shape of `invitation-service.integration.test.ts`) plus these cases:

```ts
import { describe, test, expect, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { users, teams, projects, projectAccessRequests } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { createTeam } from '@/server/teams/team-service';
import { createProject } from '@/server/projects/project-service';
import { createAccessRequest } from '@/server/projects/access-request-service';

// (cleanup arrays + createTestUser helper — copied verbatim from
//  invitation-service.integration.test.ts; also push to a new
//  testRequestIds array and clean it in afterEach.)

describe('createAccessRequest', () => {
  test('creates a pending request for a non-member', async () => {
    const owner = await createTestUser('owner-create-1@test', 'Owner');
    const requester = await createTestUser('req-create-1@test', 'Req');
    const team = await createTeam({ name: 'T', slug: 't-c1', createdByUserId: owner.id });
    const project = await createProject({
      teamId: team.id, name: 'P', slug: 'p-c1', createdByUserId: owner.id,
    });

    const req = await createAccessRequest({
      projectId: project.id,
      userId: requester.id,
      message: 'please',
    });

    expect(req.status).toBe('pending');
    expect(req.message).toBe('please');
    expect(req.requesterUserId).toBe(requester.id);
  });

  test('throws REQUEST_PENDING when one already exists', async () => {
    // ...setup as above...
    await createAccessRequest({ projectId: project.id, userId: requester.id });
    await expect(
      createAccessRequest({ projectId: project.id, userId: requester.id })
    ).rejects.toThrow(/REQUEST_PENDING/);
  });

  test('throws ALREADY_MEMBER when requester is already a project member', async () => {
    // ...add requester as member via project_members insert, then attempt request...
    await expect(
      createAccessRequest({ projectId: project.id, userId: requester.id })
    ).rejects.toThrow(/ALREADY_MEMBER/);
  });

  test('throws COOLDOWN_ACTIVE when a recent decline is within 7 days', async () => {
    // Insert a row with status='declined' and declineCooldownUntil = now()+1d.
    await db.insert(projectAccessRequests).values({
      projectId: project.id,
      requesterUserId: requester.id,
      status: 'declined',
      decidedAt: new Date(),
      declineCooldownUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await expect(
      createAccessRequest({ projectId: project.id, userId: requester.id })
    ).rejects.toThrow(/COOLDOWN_ACTIVE/);
  });

  test('throws PROJECT_NOT_FOUND for a deleted project', async () => {
    // soft-delete the project, then attempt request
    await db.update(projects).set({ deletedAt: new Date() }).where(eq(projects.id, project.id));
    await expect(
      createAccessRequest({ projectId: project.id, userId: requester.id })
    ).rejects.toThrow(/PROJECT_NOT_FOUND/);
  });

  test('two concurrent creates result in exactly one pending row', async () => {
    const [a, b] = await Promise.allSettled([
      createAccessRequest({ projectId: project.id, userId: requester.id }),
      createAccessRequest({ projectId: project.id, userId: requester.id }),
    ]);
    const fulfilled = [a, b].filter(r => r.status === 'fulfilled');
    expect(fulfilled).toHaveLength(1);

    const rows = await db.select().from(projectAccessRequests).where(
      and(
        eq(projectAccessRequests.projectId, project.id),
        eq(projectAccessRequests.requesterUserId, requester.id),
        eq(projectAccessRequests.status, 'pending'),
      )
    );
    expect(rows).toHaveLength(1);
  });
});
```

- [x] **Step 2: Run tests — they should fail with module-not-found**

Run: `bun run test src/server/projects/__tests__/access-request-service.integration.test.ts`

Expected: FAIL — `Cannot find module '@/server/projects/access-request-service'` (or similar). This is the RED state.

- [x] **Step 3: Implement `createAccessRequest`**

Create `src/server/projects/access-request-service.ts`:

```ts
/**
 * Project Access Request Service
 *
 * Business logic for user-initiated requests to join a project.
 * Mirrors invitation-service.ts patterns. Approval reuses joinProject
 * (which auto-grants TEAM_MEMBER if needed).
 */

import { db } from "@/lib/db";
import { projectAccessRequests } from "@/server/db/schema/project-access-requests";
import { projectMembers } from "@/server/db/schema/project-members";
import { projects } from "@/server/db/schema/projects";
import { users } from "@/server/db/schema/users";
import { and, desc, eq, gt, isNull, ne, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";
import type {
  AccessRequest,
  AccessRequestStatus,
  CreateAccessRequestData,
} from "./types";

const PENDING_UNIQUE_INDEX = "project_access_requests_pending_unique_idx";
const COOLDOWN_DAYS = 7;

function isUniqueViolationOnConstraint(err: unknown, constraintName: string): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: unknown; constraint?: unknown; constraint_name?: unknown; message?: unknown; cause?: unknown };
  const codeMatches = e.code === "23505";
  const constraintMatches =
    e.constraint === constraintName ||
    e.constraint_name === constraintName ||
    (typeof e.message === "string" && e.message.includes(`"${constraintName}"`));
  if (codeMatches && constraintMatches) return true;
  return isUniqueViolationOnConstraint(e.cause, constraintName);
}

export async function createAccessRequest(
  data: CreateAccessRequestData
): Promise<AccessRequest> {
  const { projectId, userId } = data;
  const message = data.message?.trim() || null;

  // 1. Project must exist and not be soft-deleted.
  const projectRow = await db
    .select({ id: projects.id, deletedAt: projects.deletedAt })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!projectRow[0] || projectRow[0].deletedAt) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  // 2. Already a member?
  const existingMember = await db
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(
      and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId))
    )
    .limit(1);
  if (existingMember.length > 0) {
    throw new Error("ALREADY_MEMBER");
  }

  // 3. Active decline cooldown?
  const now = new Date();
  const cooldownRow = await db
    .select({ id: projectAccessRequests.id })
    .from(projectAccessRequests)
    .where(
      and(
        eq(projectAccessRequests.projectId, projectId),
        eq(projectAccessRequests.requesterUserId, userId),
        eq(projectAccessRequests.status, "declined"),
        gt(projectAccessRequests.declineCooldownUntil, now)
      )
    )
    .limit(1);
  if (cooldownRow.length > 0) {
    throw new Error("COOLDOWN_ACTIVE");
  }

  // 4. Insert. Race-safety comes from the partial unique index.
  let row;
  try {
    [row] = await db
      .insert(projectAccessRequests)
      .values({ projectId, requesterUserId: userId, message })
      .returning();
  } catch (err) {
    if (isUniqueViolationOnConstraint(err, PENDING_UNIQUE_INDEX)) {
      throw new Error("REQUEST_PENDING");
    }
    throw err;
  }

  logger.info("project.access_request.created", {
    requestId: row.id,
    projectId,
    requesterUserId: userId,
  });

  return rowToAccessRequest(row);
}

function rowToAccessRequest(row: typeof projectAccessRequests.$inferSelect): AccessRequest {
  return {
    id: row.id,
    projectId: row.projectId,
    requesterUserId: row.requesterUserId,
    message: row.message,
    status: row.status as AccessRequestStatus,
    decidedByUserId: row.decidedByUserId,
    decidedAt: row.decidedAt,
    declineCooldownUntil: row.declineCooldownUntil,
    createdAt: row.createdAt,
  };
}
```

- [x] **Step 4: Run tests — they should now pass**

Run: `bun run test src/server/projects/__tests__/access-request-service.integration.test.ts -t createAccessRequest`

Expected: PASS, all 6 cases green.

- [x] **Step 5: Commit** _(skipped — user commits manually)_

```bash
git add src/server/projects/access-request-service.ts \
        src/server/projects/__tests__/access-request-service.integration.test.ts
git commit -m "feat(projects): createAccessRequest with race-safe pending uniqueness"
```

---

## Task 4: Service — `listAccessRequests` (TDD)

**Files:**
- Modify: `src/server/projects/access-request-service.ts`
- Modify: `src/server/projects/__tests__/access-request-service.integration.test.ts`

- [x] **Step 1: Write tests**

Append a new `describe('listAccessRequests', ...)` block:

```ts
import { listAccessRequests } from '@/server/projects/access-request-service';

describe('listAccessRequests', () => {
  test('returns pending + decided-within-30-days, joined with requester', async () => {
    // setup project + 3 requesters; create 3 requests:
    //   r1 = pending
    //   r2 = approved 5 days ago
    //   r3 = declined 40 days ago (should NOT appear)
    const list = await listAccessRequests(project.id, owner.id);
    expect(list.map(r => r.id).sort()).toEqual([r1.id, r2.id].sort());
    expect(list[0].requester.email).toBeDefined();
  });

  test('throws FORBIDDEN when actor is not OWNER or EDITOR', async () => {
    // give actor PROJECT_VIEWER role on this project
    await expect(
      listAccessRequests(project.id, viewer.id)
    ).rejects.toThrow(/FORBIDDEN/);
  });
});
```

- [x] **Step 2: Run — RED**

Run: `bun run test src/server/projects/__tests__/access-request-service.integration.test.ts -t listAccessRequests`
Expected: FAIL — `listAccessRequests is not a function`.

- [x] **Step 3: Implement**

Append to `src/server/projects/access-request-service.ts`:

```ts
import { hasPermission } from "@/server/auth/rbac";
import { PERMISSIONS } from "@/config/roles";
import { gte, or, inArray } from "drizzle-orm";
import type { AccessRequestWithRequester } from "./types";

const RECENT_DECISION_WINDOW_DAYS = 30;

export async function listAccessRequests(
  projectId: string,
  actorUserId: string
): Promise<AccessRequestWithRequester[]> {
  const allowed = await hasPermission(
    actorUserId,
    PERMISSIONS.PROJECT_ACCESS_REQUEST_LIST,
    { projectId }
  );
  if (!allowed) {
    throw new Error("FORBIDDEN");
  }

  const cutoff = new Date(Date.now() - RECENT_DECISION_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const requesterAlias = users;
  const deciderAlias = users; // separate selects below

  const rows = await db
    .select({
      req: projectAccessRequests,
      requesterId: requesterAlias.id,
      requesterName: requesterAlias.name,
      requesterEmail: requesterAlias.email,
      requesterImage: requesterAlias.image,
    })
    .from(projectAccessRequests)
    .innerJoin(requesterAlias, eq(projectAccessRequests.requesterUserId, requesterAlias.id))
    .where(
      and(
        eq(projectAccessRequests.projectId, projectId),
        or(
          eq(projectAccessRequests.status, "pending"),
          gte(projectAccessRequests.decidedAt, cutoff),
        )!
      )
    )
    .orderBy(desc(projectAccessRequests.createdAt));

  // Resolve decider users in a second pass.
  const deciderIds = Array.from(new Set(rows.map(r => r.req.decidedByUserId).filter((x): x is string => !!x)));
  const deciders = deciderIds.length === 0 ? [] : await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(inArray(users.id, deciderIds));
  const decidersById = new Map(deciders.map(d => [d.id, d]));

  return rows.map((r) => ({
    ...rowToAccessRequest(r.req),
    requester: {
      id: r.requesterId,
      name: r.requesterName,
      email: r.requesterEmail,
      image: r.requesterImage,
    },
    decidedByUser: r.req.decidedByUserId
      ? decidersById.get(r.req.decidedByUserId) ?? null
      : null,
  }));
}
```

(The `requesterAlias` / `deciderAlias` aliases are written for clarity; if Drizzle complains about double-aliasing of `users`, switch the decider join to a follow-up query as shown — keeps it simple and avoids `alias`/`subqueryAs` ceremony.)

- [x] **Step 4: Run — GREEN**

Run: `bun run test src/server/projects/__tests__/access-request-service.integration.test.ts -t listAccessRequests`
Expected: PASS.

- [x] **Step 5: Commit** _(skipped — user commits manually)_

```bash
git add src/server/projects/access-request-service.ts \
        src/server/projects/__tests__/access-request-service.integration.test.ts
git commit -m "feat(projects): listAccessRequests with RBAC guard"
```

---

## Task 5: Service — `approveAccessRequest` (TDD)

**Files:**
- Modify: `src/server/projects/access-request-service.ts`
- Modify: `src/server/projects/__tests__/access-request-service.integration.test.ts`

- [x] **Step 1: Write tests**

Append:

```ts
import { approveAccessRequest } from '@/server/projects/access-request-service';
import { teamMembers } from '@/server/db/schema';

describe('approveAccessRequest', () => {
  test('approves: marks row, adds project_member as VIEWER, adds team_member if absent', async () => {
    const req = await createAccessRequest({ projectId: project.id, userId: requester.id });

    const updated = await approveAccessRequest(req.id, owner.id);
    expect(updated.status).toBe('approved');
    expect(updated.decidedByUserId).toBe(owner.id);
    expect(updated.decidedAt).toBeInstanceOf(Date);

    const pm = await db.select().from(projectMembers).where(
      and(eq(projectMembers.projectId, project.id), eq(projectMembers.userId, requester.id))
    );
    expect(pm).toHaveLength(1);
    expect(pm[0].role).toBe('viewer');

    const tm = await db.select().from(teamMembers).where(
      and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, requester.id))
    );
    expect(tm).toHaveLength(1);
  });

  test('throws FORBIDDEN if actor lacks approve permission', async () => {
    const req = await createAccessRequest({ projectId: project.id, userId: requester.id });
    await expect(approveAccessRequest(req.id, viewer.id)).rejects.toThrow(/FORBIDDEN/);
  });

  test('idempotent on already-approved row (returns same row, no duplicate member)', async () => {
    const req = await createAccessRequest({ projectId: project.id, userId: requester.id });
    await approveAccessRequest(req.id, owner.id);
    const second = await approveAccessRequest(req.id, owner.id);
    expect(second.status).toBe('approved');

    const pm = await db.select().from(projectMembers).where(
      and(eq(projectMembers.projectId, project.id), eq(projectMembers.userId, requester.id))
    );
    expect(pm).toHaveLength(1);
  });

  test('two concurrent approves: one succeeds normally, the other is idempotent', async () => {
    const req = await createAccessRequest({ projectId: project.id, userId: requester.id });
    const [a, b] = await Promise.allSettled([
      approveAccessRequest(req.id, owner.id),
      approveAccessRequest(req.id, editor.id),
    ]);
    const successes = [a, b].filter(x => x.status === 'fulfilled');
    expect(successes.length).toBe(2); // both end in fulfilled because second is idempotent
    const pm = await db.select().from(projectMembers).where(
      and(eq(projectMembers.projectId, project.id), eq(projectMembers.userId, requester.id))
    );
    expect(pm).toHaveLength(1);
  });
});
```

- [x] **Step 2: Run — RED**

Expected: `approveAccessRequest is not a function`.

- [x] **Step 3: Implement**

Append to `src/server/projects/access-request-service.ts`:

```ts
import { joinProject } from "./member-service";

export async function approveAccessRequest(
  requestId: string,
  actorUserId: string
): Promise<AccessRequest> {
  const reqRows = await db
    .select()
    .from(projectAccessRequests)
    .where(eq(projectAccessRequests.id, requestId))
    .limit(1);
  const request = reqRows[0];
  if (!request) {
    throw new Error("REQUEST_NOT_FOUND");
  }

  // Idempotent: already approved → return as-is.
  if (request.status === "approved") {
    return rowToAccessRequest(request);
  }

  // Anything other than pending and we won't second-guess it.
  if (request.status !== "pending") {
    throw new Error(`INVALID_STATE:${request.status}`);
  }

  const allowed = await hasPermission(
    actorUserId,
    PERMISSIONS.PROJECT_ACCESS_REQUEST_APPROVE,
    { projectId: request.projectId }
  );
  if (!allowed) {
    throw new Error("FORBIDDEN");
  }

  const projectRow = await db
    .select({ teamId: projects.teamId })
    .from(projects)
    .where(eq(projects.id, request.projectId))
    .limit(1);
  if (!projectRow[0]) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  // Membership grant. joinProject auto-adds team membership and is idempotent
  // when called twice — second call throws "User is already a member..."
  // which we swallow because the goal state is met.
  try {
    await joinProject(request.projectId, request.requesterUserId, projectRow[0].teamId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (!msg.includes("already a member")) {
      throw err;
    }
  }

  const [updated] = await db
    .update(projectAccessRequests)
    .set({
      status: "approved",
      decidedByUserId: actorUserId,
      decidedAt: new Date(),
    })
    .where(
      and(
        eq(projectAccessRequests.id, requestId),
        eq(projectAccessRequests.status, "pending")
      )
    )
    .returning();

  // If a concurrent approver beat us to the update, re-read the row to return
  // current state — that's the idempotent path for case 4.
  if (!updated) {
    const [reread] = await db
      .select()
      .from(projectAccessRequests)
      .where(eq(projectAccessRequests.id, requestId))
      .limit(1);
    return rowToAccessRequest(reread);
  }

  logger.info("project.access_request.approved", {
    requestId,
    projectId: request.projectId,
    requesterUserId: request.requesterUserId,
    actorUserId,
  });

  return rowToAccessRequest(updated);
}
```

**Verify there is no import cycle:** `joinProject` lives in `member-service.ts`; `access-request-service.ts` imports it. `member-service.ts` does NOT (yet) import from `access-request-service.ts`. The supersede integration in Task 8 introduces a back-edge — handled there with a dynamic import to keep the cycle broken.

- [x] **Step 4: Run — GREEN**

Run: `bun run test src/server/projects/__tests__/access-request-service.integration.test.ts -t approveAccessRequest`

- [x] **Step 5: Commit** _(skipped — user commits manually)_

```bash
git add src/server/projects/access-request-service.ts \
        src/server/projects/__tests__/access-request-service.integration.test.ts
git commit -m "feat(projects): approveAccessRequest reuses joinProject"
```

---

## Task 6: Service — `declineAccessRequest` (TDD)

**Files:**
- Modify: `src/server/projects/access-request-service.ts`
- Modify: `src/server/projects/__tests__/access-request-service.integration.test.ts`

- [x] **Step 1: Write tests**

```ts
import { declineAccessRequest } from '@/server/projects/access-request-service';

describe('declineAccessRequest', () => {
  test('marks declined and sets a 7-day cooldown', async () => {
    const req = await createAccessRequest({ projectId: project.id, userId: requester.id });
    const before = Date.now();
    const decided = await declineAccessRequest(req.id, owner.id);
    expect(decided.status).toBe('declined');
    const cooldownMs = decided.declineCooldownUntil!.getTime() - before;
    // ~7 days, allow some slop for test runtime
    expect(cooldownMs).toBeGreaterThan(6.99 * 24 * 60 * 60 * 1000);
    expect(cooldownMs).toBeLessThan(7.01 * 24 * 60 * 60 * 1000);
  });

  test('throws FORBIDDEN for non-approver', async () => {
    const req = await createAccessRequest({ projectId: project.id, userId: requester.id });
    await expect(declineAccessRequest(req.id, viewer.id)).rejects.toThrow(/FORBIDDEN/);
  });

  test('blocks creating a new request while cooldown active', async () => {
    const req = await createAccessRequest({ projectId: project.id, userId: requester.id });
    await declineAccessRequest(req.id, owner.id);

    await expect(
      createAccessRequest({ projectId: project.id, userId: requester.id })
    ).rejects.toThrow(/COOLDOWN_ACTIVE/);
  });
});
```

- [x] **Step 2: Run — RED**

- [x] **Step 3: Implement**

```ts
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

export async function declineAccessRequest(
  requestId: string,
  actorUserId: string
): Promise<AccessRequest> {
  const reqRows = await db
    .select()
    .from(projectAccessRequests)
    .where(eq(projectAccessRequests.id, requestId))
    .limit(1);
  const request = reqRows[0];
  if (!request) throw new Error("REQUEST_NOT_FOUND");

  if (request.status === "declined") return rowToAccessRequest(request);
  if (request.status !== "pending") {
    throw new Error(`INVALID_STATE:${request.status}`);
  }

  const allowed = await hasPermission(
    actorUserId,
    PERMISSIONS.PROJECT_ACCESS_REQUEST_APPROVE,
    { projectId: request.projectId }
  );
  if (!allowed) throw new Error("FORBIDDEN");

  const now = new Date();
  const [updated] = await db
    .update(projectAccessRequests)
    .set({
      status: "declined",
      decidedByUserId: actorUserId,
      decidedAt: now,
      declineCooldownUntil: new Date(now.getTime() + COOLDOWN_MS),
    })
    .where(
      and(
        eq(projectAccessRequests.id, requestId),
        eq(projectAccessRequests.status, "pending")
      )
    )
    .returning();

  if (!updated) {
    const [reread] = await db
      .select()
      .from(projectAccessRequests)
      .where(eq(projectAccessRequests.id, requestId))
      .limit(1);
    return rowToAccessRequest(reread);
  }

  logger.info("project.access_request.declined", {
    requestId,
    projectId: request.projectId,
    actorUserId,
  });

  return rowToAccessRequest(updated);
}
```

- [x] **Step 4: Run — GREEN**

- [x] **Step 5: Commit** _(skipped — user commits manually)_

```bash
git add src/server/projects/access-request-service.ts \
        src/server/projects/__tests__/access-request-service.integration.test.ts
git commit -m "feat(projects): declineAccessRequest with 7-day cooldown"
```

---

## Task 7: Service — `cancelAccessRequest` (TDD, requester-self)

**Files:**
- Modify: `src/server/projects/access-request-service.ts`
- Modify: `src/server/projects/__tests__/access-request-service.integration.test.ts`

- [x] **Step 1: Write tests**

```ts
import { cancelAccessRequest } from '@/server/projects/access-request-service';

describe('cancelAccessRequest', () => {
  test('requester cancels own pending request → status cancelled', async () => {
    const req = await createAccessRequest({ projectId: project.id, userId: requester.id });
    const result = await cancelAccessRequest(req.id, requester.id);
    expect(result.status).toBe('cancelled');
  });

  test('lets the requester re-create immediately (cancellation is not a decline)', async () => {
    const req = await createAccessRequest({ projectId: project.id, userId: requester.id });
    await cancelAccessRequest(req.id, requester.id);
    const fresh = await createAccessRequest({ projectId: project.id, userId: requester.id });
    expect(fresh.id).not.toBe(req.id);
    expect(fresh.status).toBe('pending');
  });

  test('throws FORBIDDEN when a non-requester tries to cancel', async () => {
    const req = await createAccessRequest({ projectId: project.id, userId: requester.id });
    await expect(cancelAccessRequest(req.id, owner.id)).rejects.toThrow(/FORBIDDEN/);
  });
});
```

- [x] **Step 2: Run — RED**

- [x] **Step 3: Implement**

```ts
export async function cancelAccessRequest(
  requestId: string,
  actorUserId: string
): Promise<AccessRequest> {
  const [request] = await db
    .select()
    .from(projectAccessRequests)
    .where(eq(projectAccessRequests.id, requestId))
    .limit(1);
  if (!request) throw new Error("REQUEST_NOT_FOUND");

  if (request.requesterUserId !== actorUserId) {
    throw new Error("FORBIDDEN");
  }

  if (request.status === "cancelled") return rowToAccessRequest(request);
  if (request.status !== "pending") {
    throw new Error(`INVALID_STATE:${request.status}`);
  }

  const [updated] = await db
    .update(projectAccessRequests)
    .set({ status: "cancelled", decidedAt: new Date() })
    .where(
      and(
        eq(projectAccessRequests.id, requestId),
        eq(projectAccessRequests.status, "pending")
      )
    )
    .returning();

  return rowToAccessRequest(updated ?? request);
}
```

- [x] **Step 4: Run — GREEN**

- [x] **Step 5: Commit** _(skipped — user commits manually)_

```bash
git add src/server/projects/access-request-service.ts \
        src/server/projects/__tests__/access-request-service.integration.test.ts
git commit -m "feat(projects): cancelAccessRequest (requester self-cancel)"
```

---

## Task 8: Service — `supersedePendingRequests` + integrate into `joinProject` and invitation acceptance (TDD)

**Files:**
- Modify: `src/server/projects/access-request-service.ts`
- Modify: `src/server/projects/member-service.ts`
- Modify: `src/server/projects/invitation-service.ts`
- Modify: `src/server/projects/__tests__/access-request-service.integration.test.ts`

- [x] **Step 1: Write tests**

```ts
import { acceptProjectInvitation, createProjectInvitation } from '@/server/projects/invitation-service';
import { joinProject } from '@/server/projects/member-service';

describe('supersedePendingRequests integration', () => {
  test('joinProject (public) on a project with pending request → request marked superseded', async () => {
    // Make project public:
    await db.update(projects).set({ visibility: 'public' }).where(eq(projects.id, project.id));
    const req = await createAccessRequest({ projectId: project.id, userId: requester.id });

    await joinProject(project.id, requester.id, team.id);

    const [after] = await db.select().from(projectAccessRequests).where(eq(projectAccessRequests.id, req.id));
    expect(after.status).toBe('superseded');
  });

  test('acceptProjectInvitation while a request is pending → request marked superseded', async () => {
    const req = await createAccessRequest({ projectId: project.id, userId: requester.id });
    const { token } = await createProjectInvitation({
      projectId: project.id, email: requester.email, role: 'editor', invitedBy: owner.id,
    });
    await acceptProjectInvitation(token, requester.id, requester.email);

    const [after] = await db.select().from(projectAccessRequests).where(eq(projectAccessRequests.id, req.id));
    expect(after.status).toBe('superseded');
  });
});
```

- [x] **Step 2: Run — RED**

The first test fails because `joinProject` does not yet supersede. The second test fails because `acceptProjectInvitation` does not yet supersede.

- [x] **Step 3: Implement supersede helper**

Append to `src/server/projects/access-request-service.ts`:

```ts
/**
 * Mark any pending access requests for this (project, user) as superseded.
 * Called from joinProject and from invitation acceptance to keep the access-
 * request entity consistent with realized membership.
 *
 * Idempotent: zero rows updated is a normal outcome.
 */
export async function supersedePendingRequests(
  projectId: string,
  userId: string
): Promise<void> {
  await db
    .update(projectAccessRequests)
    .set({ status: "superseded", decidedAt: new Date() })
    .where(
      and(
        eq(projectAccessRequests.projectId, projectId),
        eq(projectAccessRequests.requesterUserId, userId),
        eq(projectAccessRequests.status, "pending")
      )
    );
}
```

- [x] **Step 4: Wire into `joinProject`**

In `src/server/projects/member-service.ts`, find `export async function joinProject(` (line ~338). After the project_members insert and the team-membership grant succeed, but before the function returns, add:

```ts
// Resolve any in-flight access request now that membership is realized.
// Dynamic import to avoid an import cycle (access-request-service imports
// joinProject from this file).
const { supersedePendingRequests } = await import("./access-request-service");
await supersedePendingRequests(projectId, userId);
```

- [x] **Step 5: Wire into invitation acceptance**

In `src/server/projects/invitation-service.ts`, in **both** `acceptProjectInvitation` and `acceptProjectInvitationById`, after the transaction commits and the team-role bump runs, add the same dynamic-import call:

```ts
const { supersedePendingRequests } = await import("./access-request-service");
await supersedePendingRequests(invitation.projectId, userId);
```

(Two call sites — same line, same intent. No DRYing needed for two lines.)

- [x] **Step 6: Run — GREEN**

Run: `bun run test src/server/projects/__tests__/access-request-service.integration.test.ts -t supersedePendingRequests`

Also run the existing invitation tests to ensure no regression:
`bun run test src/server/projects/__tests__/invitation-service.integration.test.ts`

Both expected: PASS.

- [x] **Step 7: Commit** _(skipped — user commits manually)_

```bash
git add src/server/projects/access-request-service.ts \
        src/server/projects/member-service.ts \
        src/server/projects/invitation-service.ts \
        src/server/projects/__tests__/access-request-service.integration.test.ts
git commit -m "feat(projects): supersede pending access requests on join/accept"
```

---

## Task 9: `getProjectForAccessCheck` sibling (TDD)

**Files:**
- Modify: `src/server/projects/project-service.ts`
- Modify: existing project-service tests OR add a new test file

- [x] **Step 1: Inspect existing tests**

Run: `ls src/server/projects/__tests__/project-service.*` to see whether to add to property tests or create a new integration-style test. If only property tests exist, create a new file:

`src/server/projects/__tests__/project-service.access-check.integration.test.ts`

- [x] **Step 2: Write tests**

```ts
import { describe, test, expect } from 'vitest';
import { getProjectForAccessCheck } from '@/server/projects/project-service';
// ...standard test setup...

describe('getProjectForAccessCheck', () => {
  test('member: returns project + hasAccess true', async () => {
    const result = await getProjectForAccessCheck(project.id, owner.id);
    expect(result.hasAccess).toBe(true);
    expect(result.project.id).toBe(project.id);
  });

  test('non-member, private project: returns project + hasAccess false (does NOT throw)', async () => {
    const result = await getProjectForAccessCheck(project.id, outsider.id);
    expect(result.hasAccess).toBe(false);
    expect(result.project.id).toBe(project.id);
    // Sensitive fields included so caller can render project name etc.
    expect(result.project.name).toBeDefined();
  });

  test('soft-deleted project: returns null', async () => {
    await db.update(projects).set({ deletedAt: new Date() }).where(eq(projects.id, project.id));
    const result = await getProjectForAccessCheck(project.id, owner.id);
    expect(result).toBeNull();
  });

  test('non-existent project id: returns null', async () => {
    const result = await getProjectForAccessCheck(crypto.randomUUID(), owner.id);
    expect(result).toBeNull();
  });
});
```

- [x] **Step 3: Run — RED**

- [x] **Step 4: Implement**

Add to `src/server/projects/project-service.ts`:

```ts
/**
 * Read project for the issue-page access-check branching path.
 *
 * Unlike getProject, this does NOT throw on access-denied — it returns
 * `{ project, hasAccess: false }` so the caller can render an access-request
 * panel with the project's display fields.
 *
 * Returns null if the project is missing or soft-deleted.
 */
export async function getProjectForAccessCheck(
  projectId: string,
  userId: string
): Promise<{ project: { id: string; name: string; slug: string; teamId: string; visibility: string }; hasAccess: boolean } | null> {
  const projectRow = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), isNull(projects.deletedAt)),
  });
  if (!projectRow) return null;

  // Membership check (cheap; mirrors getProject's access path without throwing).
  const member = await db
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(
      and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId))
    )
    .limit(1);

  return {
    project: {
      id: projectRow.id,
      name: projectRow.name,
      slug: projectRow.slug,
      teamId: projectRow.teamId,
      visibility: projectRow.visibility,
    },
    hasAccess: member.length > 0,
  };
}
```

(Pull the existing `db`, `projects`, `projectMembers`, `eq`, `and`, `isNull` imports from the top of the file — they should already be there. Add any missing.)

- [x] **Step 5: Run — GREEN**

- [x] **Step 6: Commit** _(skipped — user commits manually)_

```bash
git add src/server/projects/project-service.ts \
        src/server/projects/__tests__/project-service.access-check.integration.test.ts
git commit -m "feat(projects): getProjectForAccessCheck returns hasAccess flag"
```

---

## Task 10: Re-export from server projects barrel

**Files:**
- Modify: `src/server/projects/index.ts`

- [x] **Step 1: Add re-exports**

Append to `src/server/projects/index.ts`:

```ts
export {
  createAccessRequest,
  listAccessRequests,
  approveAccessRequest,
  declineAccessRequest,
  cancelAccessRequest,
  supersedePendingRequests,
} from "./access-request-service";
export { getProjectForAccessCheck } from "./project-service";
```

- [x] **Step 2: Type-check**

Run: `bun run typecheck` (or `bun run build` if that's the project's type-check entrypoint — see `package.json` scripts).

Expected: no new errors.

- [x] **Step 3: Commit** _(skipped — user commits manually)_

```bash
git add src/server/projects/index.ts
git commit -m "feat(projects): re-export access-request service from barrel"
```

---

## Task 11: API route — POST + GET `/api/projects/[id]/access-requests`

**Files:**
- Create: `src/app/api/projects/[id]/access-requests/route.ts`
- Create: `src/app/api/projects/[id]/access-requests/__tests__/route.test.ts`

- [x] **Step 1: Write tests**

Mirror `src/app/api/notifications/__tests__/notifications.integration.test.ts` patterns. Cover:

```ts
describe('POST /api/projects/[id]/access-requests', () => {
  test('401 when no session', async () => { /* ... */ });
  test('201 creates request, returns request payload', async () => { /* ... */ });
  test('409 when already a member', async () => { /* ... */ });
  test('409 when request already pending', async () => { /* ... */ });
  test('409 when cooldown active', async () => { /* ... */ });
  test('404 when project does not exist', async () => { /* ... */ });
  test('400 when message exceeds 500 chars', async () => { /* ... */ });
});

describe('GET /api/projects/[id]/access-requests', () => {
  test('401 no session', async () => { /* ... */ });
  test('403 not approver', async () => { /* ... */ });
  test('200 returns pending + recent decided list with requester data', async () => { /* ... */ });
});
```

- [x] **Step 2: Run — RED**

Expected: route 404s.

- [x] **Step 3: Implement**

Create `src/app/api/projects/[id]/access-requests/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/server/auth/session";
import {
  createAccessRequest,
  listAccessRequests,
} from "@/server/projects/access-request-service";
import { logger } from "@/lib/logger";

const CreateBody = z.object({
  message: z.string().trim().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const { id: projectId } = await params;

  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  let body: z.infer<typeof CreateBody>;
  try {
    body = CreateBody.parse(await request.json().catch(() => ({})));
  } catch (err) {
    return NextResponse.json(
      { error: { code: "INVALID_BODY", message: "message must be ≤500 chars" } },
      { status: 400 }
    );
  }

  try {
    const created = await createAccessRequest({
      projectId,
      userId: user.id,
      message: body.message ?? null,
    });
    return NextResponse.json(
      { request: serializeRequest(created) },
      { status: 201 }
    );
  } catch (err) {
    return mapServiceError(err, requestId, projectId);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const { id: projectId } = await params;

  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const list = await listAccessRequests(projectId, user.id);
    return NextResponse.json({
      requests: list.map((r) => ({
        ...serializeRequest(r),
        requester: r.requester,
        decidedByUser: r.decidedByUser,
      })),
    });
  } catch (err) {
    return mapServiceError(err, requestId, projectId);
  }
}

function serializeRequest(r: { createdAt: Date; decidedAt: Date | null; declineCooldownUntil: Date | null; [k: string]: unknown }) {
  return {
    ...r,
    createdAt: r.createdAt.toISOString(),
    decidedAt: r.decidedAt?.toISOString() ?? null,
    declineCooldownUntil: r.declineCooldownUntil?.toISOString() ?? null,
  };
}

function mapServiceError(err: unknown, requestId: string, projectId: string): NextResponse {
  const msg = err instanceof Error ? err.message : "";
  const map: Record<string, [number, string, string]> = {
    PROJECT_NOT_FOUND: [404, "NOT_FOUND", "Project not found"],
    REQUEST_NOT_FOUND: [404, "NOT_FOUND", "Request not found"],
    ALREADY_MEMBER: [409, "ALREADY_MEMBER", "You are already a member of this project"],
    REQUEST_PENDING: [409, "REQUEST_PENDING", "You already have a pending request for this project"],
    COOLDOWN_ACTIVE: [409, "COOLDOWN_ACTIVE", "Please wait before requesting access again"],
    FORBIDDEN: [403, "FORBIDDEN", "You do not have permission to perform this action"],
  };
  const entry = map[msg];
  if (entry) {
    const [status, code, message] = entry;
    return NextResponse.json({ error: { code, message } }, { status });
  }
  logger.error("api.projects.access_requests.error", {
    requestId, projectId, error: msg, stack: err instanceof Error ? err.stack : undefined,
  });
  return NextResponse.json(
    { error: { code: "INTERNAL_SERVER_ERROR", message: "Unexpected error" } },
    { status: 500 }
  );
}
```

- [x] **Step 4: Run — GREEN**

Run: `bun run test src/app/api/projects/\[id\]/access-requests/__tests__/route.test.ts`

- [x] **Step 5: Commit** _(skipped — user commits manually)_

```bash
git add src/app/api/projects/\[id\]/access-requests/
git commit -m "feat(api): POST + GET /projects/[id]/access-requests"
```

---

## Task 12: API routes — approve, decline, cancel

**Files:**
- Create: `src/app/api/projects/[id]/access-requests/[requestId]/approve/route.ts`
- Create: `src/app/api/projects/[id]/access-requests/[requestId]/decline/route.ts`
- Create: `src/app/api/projects/[id]/access-requests/[requestId]/route.ts` (DELETE = cancel)
- Modify: `src/app/api/projects/[id]/access-requests/__tests__/route.test.ts` (add cases)

- [x] **Step 1: Write tests**

Append:

```ts
describe('POST /api/projects/[id]/access-requests/[requestId]/approve', () => {
  test('401 no session', async () => { /* ... */ });
  test('403 non-approver', async () => { /* ... */ });
  test('200 marks approved + member added', async () => { /* ... */ });
  test('404 unknown requestId', async () => { /* ... */ });
});

describe('POST /api/projects/[id]/access-requests/[requestId]/decline', () => {
  test('200 marks declined and sets cooldown', async () => { /* ... */ });
  test('403 non-approver', async () => { /* ... */ });
});

describe('DELETE /api/projects/[id]/access-requests/[requestId]', () => {
  test('200 requester self-cancels', async () => { /* ... */ });
  test('403 non-requester', async () => { /* ... */ });
});
```

- [x] **Step 2: Run — RED**

- [x] **Step 3: Implement approve route**

Create `src/app/api/projects/[id]/access-requests/[requestId]/approve/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { approveAccessRequest } from "@/server/projects/access-request-service";
import { logger } from "@/lib/logger";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  const reqId = crypto.randomUUID();
  const { id: projectId, requestId } = await params;

  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const updated = await approveAccessRequest(requestId, user.id);
    return NextResponse.json({ request: {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      decidedAt: updated.decidedAt?.toISOString() ?? null,
      declineCooldownUntil: updated.declineCooldownUntil?.toISOString() ?? null,
    } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Not allowed" } }, { status: 403 });
    }
    if (msg === "REQUEST_NOT_FOUND") {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Request not found" } }, { status: 404 });
    }
    if (msg.startsWith("INVALID_STATE:")) {
      return NextResponse.json({ error: { code: "INVALID_STATE", message: "Request is not pending" } }, { status: 409 });
    }
    logger.error("api.projects.access_requests.approve.error", { reqId, projectId, requestId, error: msg });
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Unexpected error" } }, { status: 500 });
  }
}
```

- [x] **Step 4: Implement decline route**

Create `src/app/api/projects/[id]/access-requests/[requestId]/decline/route.ts` — identical structure to approve, but calls `declineAccessRequest`. Same error mapping.

- [x] **Step 5: Implement DELETE (cancel) route**

Create `src/app/api/projects/[id]/access-requests/[requestId]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { cancelAccessRequest } from "@/server/projects/access-request-service";
import { logger } from "@/lib/logger";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  const reqId = crypto.randomUUID();
  const { id: projectId, requestId } = await params;
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }
  try {
    const updated = await cancelAccessRequest(requestId, user.id);
    return NextResponse.json({ request: {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      decidedAt: updated.decidedAt?.toISOString() ?? null,
      declineCooldownUntil: updated.declineCooldownUntil?.toISOString() ?? null,
    } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Not allowed" } }, { status: 403 });
    }
    if (msg === "REQUEST_NOT_FOUND") {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Request not found" } }, { status: 404 });
    }
    logger.error("api.projects.access_requests.cancel.error", { reqId, projectId, requestId, error: msg });
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Unexpected error" } }, { status: 500 });
  }
}
```

- [x] **Step 6: Run — GREEN**

- [x] **Step 7: Commit** _(skipped — user commits manually)_

```bash
git add src/app/api/projects/\[id\]/access-requests/\[requestId\]/
git commit -m "feat(api): approve/decline/cancel access-request endpoints"
```

---

## Task 13: Email templates (3) + register types

**Files:**
- Create: `src/server/email/templates/project-access-request-received-email.tsx`
- Create: `src/server/email/templates/project-access-request-approved-email.tsx`
- Create: `src/server/email/templates/project-access-request-declined-email.tsx`
- Modify: `src/server/email/queue.ts`
- Modify: `src/server/email/render-template.tsx`

- [x] **Step 1: Create the "received" template (for approvers)**

Mirror `project-invitation-email.tsx` shape. `src/server/email/templates/project-access-request-received-email.tsx`:

```tsx
import * as React from 'react';
import { Button, Heading, Hr, Link, Section, Text } from '@react-email/components';
import { EmailLayout } from './layout';

interface Props {
  requesterName: string;
  requesterEmail: string;
  projectName: string;
  message: string | null;
  reviewUrl: string; // /projects/<slug>?tab=requests
}

export function ProjectAccessRequestReceivedEmail({
  requesterName, requesterEmail, projectName, message, reviewUrl,
}: Props) {
  return (
    <EmailLayout preview={`${requesterName} wants to join ${projectName}`}>
      <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
        New access request for <strong>{projectName}</strong>
      </Heading>
      <Text className="text-black text-[14px] leading-[24px]">
        <strong>{requesterName}</strong> ({requesterEmail}) is requesting access to <strong>{projectName}</strong>.
      </Text>
      {message ? (
        <Section className="bg-gray-50 rounded border border-gray-200 p-3 my-4">
          <Text className="text-black text-[14px] leading-[20px] m-0">"{message}"</Text>
        </Section>
      ) : null}
      <Section className="text-center mt-[32px] mb-[32px]">
        <Button className="bg-[#18181b] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3" href={reviewUrl}>
          Review request
        </Button>
      </Section>
      <Hr />
      <Text className="text-gray-500 text-[12px]">
        Approve or decline from your project members page.
      </Text>
    </EmailLayout>
  );
}
```

- [x] **Step 2: Create the "approved" template (for requester)**

`src/server/email/templates/project-access-request-approved-email.tsx`:

```tsx
import * as React from 'react';
import { Button, Heading, Section, Text } from '@react-email/components';
import { EmailLayout } from './layout';

interface Props {
  projectName: string;
  returnUrl: string; // back to original issue or project landing
}

export function ProjectAccessRequestApprovedEmail({ projectName, returnUrl }: Props) {
  return (
    <EmailLayout preview={`You're in — ${projectName}`}>
      <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
        You're in 🎉
      </Heading>
      <Text className="text-black text-[14px] leading-[24px]">
        Your request to join <strong>{projectName}</strong> has been approved. You now have viewer access.
      </Text>
      <Section className="text-center mt-[32px] mb-[32px]">
        <Button className="bg-[#18181b] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3" href={returnUrl}>
          Open the page
        </Button>
      </Section>
    </EmailLayout>
  );
}
```

- [x] **Step 3: Create the "declined" template (for requester)**

`src/server/email/templates/project-access-request-declined-email.tsx`:

```tsx
import * as React from 'react';
import { Heading, Text } from '@react-email/components';
import { EmailLayout } from './layout';

interface Props {
  projectName: string;
}

export function ProjectAccessRequestDeclinedEmail({ projectName }: Props) {
  return (
    <EmailLayout preview={`Update on your request for ${projectName}`}>
      <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
        Request reviewed
      </Heading>
      <Text className="text-black text-[14px] leading-[24px]">
        Your request to join <strong>{projectName}</strong> wasn't approved. If you believe this was a mistake, reach out to the project owner directly.
      </Text>
    </EmailLayout>
  );
}
```

(Neutral copy — no reason field, matches the "no decline reason exposed" decision.)

- [x] **Step 4: Add type discriminators in queue.ts**

In `src/server/email/queue.ts` find the `type` union (line ~27) and add three entries:

```ts
type: 'verification' | 'password_reset' | 'welcome' | 'security_alert'
    | 'team_invitation' | 'ownership_transfer' | 'project_invitation'
    | 'project_access_request_received'
    | 'project_access_request_approved'
    | 'project_access_request_declined';
```

- [x] **Step 5: Register templates in render-template.tsx**

In `src/server/email/render-template.tsx`, find the discriminated-union of templates (line ~15-40) and add three branches:

```ts
| { type: 'project_access_request_received'; data: {
    requesterName: string; requesterEmail: string; projectName: string; message: string | null; reviewUrl: string;
  } }
| { type: 'project_access_request_approved'; data: { projectName: string; returnUrl: string } }
| { type: 'project_access_request_declined'; data: { projectName: string } }
```

Then in the rendering switch/match below it, import the three new components and render them on the matching case. Example (match the file's actual style — switch vs. object-lookup):

```ts
import { ProjectAccessRequestReceivedEmail } from './templates/project-access-request-received-email';
import { ProjectAccessRequestApprovedEmail } from './templates/project-access-request-approved-email';
import { ProjectAccessRequestDeclinedEmail } from './templates/project-access-request-declined-email';

// inside the switch:
case 'project_access_request_received':
  return <ProjectAccessRequestReceivedEmail {...template.data} />;
case 'project_access_request_approved':
  return <ProjectAccessRequestApprovedEmail {...template.data} />;
case 'project_access_request_declined':
  return <ProjectAccessRequestDeclinedEmail {...template.data} />;
```

- [x] **Step 6: Type-check**

Run: `bun run typecheck`

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/server/email/templates/project-access-request-*.tsx \
        src/server/email/queue.ts \
        src/server/email/render-template.tsx
git commit -m "feat(email): templates for project access-request lifecycle"
```

---

## Task 14: Notification types

**Files:**
- Modify: `src/server/notifications/types.ts`
- Modify: `src/server/notifications/notification-service.ts` (or wherever `buildTargetUrl` lives — check via grep)

- [x] **Step 1: Add types**

In `src/server/notifications/types.ts`, find the `NotificationType` union (line ~28) and add 3 entries:

```ts
| "project_access_request_created"
| "project_access_request_approved"
| "project_access_request_declined"
```

Add the same 3 strings to the `NOTIFICATION_TYPES` constant array (line ~41) and the `notificationTypeEnum` zod schema (line ~171).

- [x] **Step 2: Add target-url builders**

Find `buildTargetUrl` (likely in `notification-service.ts`). Add cases:

```ts
case "project_access_request_created":
  // for approvers — deep-link to the project's members tab, requests pane
  return `/${data.team_slug}/${data.project_slug}?tab=requests`;
case "project_access_request_approved":
  // for requester — back to the originating page (issue URL preferred)
  return data.return_url ?? `/${data.team_slug}/${data.project_slug}`;
case "project_access_request_declined":
  // for requester — neutral landing
  return `/`;
```

(Adjust to actual signature of `buildTargetUrl` — examine an existing case before writing yours.)

- [x] **Step 3: Type-check**

Run: `bun run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/server/notifications/
git commit -m "feat(notifications): add project access-request types"
```

---

## Task 15: Wire notifications + emails into the service

**Files:**
- Modify: `src/server/projects/access-request-service.ts`
- Modify: `src/server/projects/__tests__/access-request-service.integration.test.ts` (light assertions on side-effects)

- [x] **Step 1: Add side-effect calls to `createAccessRequest`**

After the successful insert + `logger.info`, add a fire-and-forget block (mirrors `invitation-service.ts:362-415`):

```ts
// Fan-out: SSE notification + email to each approver. Fire-and-forget;
// failures must not block the API response.
try {
  const approvers = await db
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        inArray(projectMembers.role, ["owner", "editor"])
      )
    );

  const projectMeta = await db
    .select({ name: projects.name, slug: projects.slug, key: projects.key, teamId: projects.teamId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  const teamMeta = projectMeta[0]
    ? await db.select({ slug: teams.slug }).from(teams).where(eq(teams.id, projectMeta[0].teamId)).limit(1)
    : [];
  const requesterRow = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId)).limit(1);

  const project = projectMeta[0];
  const team = teamMeta[0];
  const requester = requesterRow[0];
  if (project && team && requester) {
    const reviewUrl = `${env.NEXT_PUBLIC_APP_URL}/${team.slug}/${project.slug}?tab=requests`;
    await Promise.allSettled(approvers.map(async (a) => {
      await createNotification({
        recipientId: a.userId,
        actorId: userId,
        type: "project_access_request_created",
        entityType: "project",
        entityId: projectId,
        metadata: {
          target_url: reviewUrl,
          project_name: project.name,
          project_slug: project.slug,
          team_slug: team.slug,
          request_id: row.id,
          requester_name: requester.name,
        },
      });

      // Look up approver email
      const approverRow = await db.select({ email: users.email }).from(users).where(eq(users.id, a.userId)).limit(1);
      if (!approverRow[0]) return;
      await enqueueEmail({
        userId: a.userId,
        type: "project_access_request_received",
        to: approverRow[0].email,
        template: {
          type: "project_access_request_received",
          data: {
            requesterName: requester.name,
            requesterEmail: requester.email,
            projectName: project.name,
            message,
            reviewUrl,
          },
        },
      });
    }));
  }
} catch (sideEffectErr) {
  logger.error("project.access_request.fanout_failed", {
    requestId: row.id, error: sideEffectErr instanceof Error ? sideEffectErr.message : "unknown",
  });
}
```

Imports needed at the top of the file:

```ts
import { teams } from "@/server/db/schema/teams";
import { projectMembers } from "@/server/db/schema/project-members";
import { inArray } from "drizzle-orm";
import { env } from "@/lib/env";
import { createNotification } from "@/server/notifications";
import { enqueueEmail } from "@/server/email";
```

- [x] **Step 2: Add side-effects to `approveAccessRequest`**

Right before `return rowToAccessRequest(updated);`, add:

```ts
try {
  const projectMeta = await db
    .select({ name: projects.name, slug: projects.slug, key: projects.key, teamId: projects.teamId })
    .from(projects).where(eq(projects.id, request.projectId)).limit(1);
  const requesterRow = await db.select({ email: users.email }).from(users).where(eq(users.id, request.requesterUserId)).limit(1);
  const project = projectMeta[0];
  const team = project ? (await db.select({ slug: teams.slug }).from(teams).where(eq(teams.id, project.teamId)).limit(1))[0] : null;

  if (project && team && requesterRow[0]) {
    const returnUrl = `${env.NEXT_PUBLIC_APP_URL}/${team.slug}/${project.slug}`;
    await createNotification({
      recipientId: request.requesterUserId,
      actorId: actorUserId,
      type: "project_access_request_approved",
      entityType: "project",
      entityId: request.projectId,
      metadata: {
        target_url: returnUrl,
        project_name: project.name,
        project_slug: project.slug,
        team_slug: team.slug,
      },
    });

    await enqueueEmail({
      userId: request.requesterUserId,
      type: "project_access_request_approved",
      to: requesterRow[0].email,
      template: {
        type: "project_access_request_approved",
        data: { projectName: project.name, returnUrl },
      },
    });
  }
} catch (sideEffectErr) {
  logger.error("project.access_request.approve.fanout_failed", { requestId, error: sideEffectErr instanceof Error ? sideEffectErr.message : "unknown" });
}
```

(Optional polish — capture the issue-page URL on creation as `metadata.return_url` and pass it through here. Keep it as a follow-up improvement; v1 sends the project landing URL.)

- [x] **Step 3: Add side-effects to `declineAccessRequest`**

Same pattern, type `project_access_request_declined`:

```ts
await createNotification({
  recipientId: request.requesterUserId,
  actorId: actorUserId,
  type: "project_access_request_declined",
  entityType: "project",
  entityId: request.projectId,
  metadata: { target_url: "/", project_name: project.name },
});
await enqueueEmail({
  userId: request.requesterUserId,
  type: "project_access_request_declined",
  to: requesterRow[0].email,
  template: { type: "project_access_request_declined", data: { projectName: project.name } },
});
```

- [x] **Step 4: Add light assertions to existing tests**

In existing create / approve / decline tests, after the assertions on the request row, add:

```ts
// Verify a notification row exists (assumes notifications table is queryable).
const notifs = await db.select().from(notifications).where(eq(notifications.entityId, project.id));
expect(notifs.length).toBeGreaterThan(0);
```

(Import `notifications` from the schema barrel. If notifications are written async via `Promise.allSettled` in fire-and-forget, await a small `setTimeout(50)` or restructure to `await Promise.all` so tests are deterministic.)

- [x] **Step 5: Run — GREEN**

Run: `bun run test src/server/projects/__tests__/access-request-service.integration.test.ts`

- [ ] **Step 6: Commit**

```bash
git add src/server/projects/access-request-service.ts \
        src/server/projects/__tests__/access-request-service.integration.test.ts
git commit -m "feat(projects): notify + email on access-request lifecycle"
```

---

## Task 16: Client API callers

**Files:**
- Create: `src/features/projects/api/create-access-request.ts`
- Create: `src/features/projects/api/list-access-requests.ts`
- Create: `src/features/projects/api/approve-access-request.ts`
- Create: `src/features/projects/api/decline-access-request.ts`
- Create: `src/features/projects/api/cancel-access-request.ts`
- Modify: `src/features/projects/api/index.ts`

- [x] **Step 1: Implement `create-access-request.ts`**

```ts
import { z } from "zod";

export const AccessRequestSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  requesterUserId: z.string().uuid(),
  message: z.string().nullable(),
  status: z.enum(["pending", "approved", "declined", "superseded", "cancelled"]),
  decidedByUserId: z.string().uuid().nullable(),
  decidedAt: z.string().datetime().nullable(),
  declineCooldownUntil: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type AccessRequest = z.infer<typeof AccessRequestSchema>;

export const CreateAccessRequestResponseSchema = z.object({
  request: AccessRequestSchema,
});
export type CreateAccessRequestResponse = z.infer<typeof CreateAccessRequestResponseSchema>;

export async function createAccessRequest(
  projectId: string,
  message?: string
): Promise<CreateAccessRequestResponse> {
  const res = await fetch(`/api/projects/${projectId}/access-requests`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message ? { message } : {}),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const code = body?.error?.code ?? "UNKNOWN";
    throw new Error(`${code}:${body?.error?.message ?? res.statusText}`);
  }
  return CreateAccessRequestResponseSchema.parse(await res.json());
}
```

- [x] **Step 2: Implement `list-access-requests.ts`**

```ts
import { z } from "zod";
import { AccessRequestSchema } from "./create-access-request";

const RequesterSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
});

export const AccessRequestWithRequesterSchema = AccessRequestSchema.extend({
  requester: RequesterSchema,
  decidedByUser: z.object({ id: z.string().uuid(), name: z.string(), email: z.string() }).nullable(),
});
export type AccessRequestWithRequester = z.infer<typeof AccessRequestWithRequesterSchema>;

export const ListAccessRequestsResponseSchema = z.object({
  requests: z.array(AccessRequestWithRequesterSchema),
});

export async function listAccessRequests(projectId: string) {
  const res = await fetch(`/api/projects/${projectId}/access-requests`, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to list access requests: ${res.statusText}`);
  return ListAccessRequestsResponseSchema.parse(await res.json()).requests;
}
```

- [x] **Step 3: Implement `approve-access-request.ts`**

```ts
import { z } from "zod";
import { AccessRequestSchema } from "./create-access-request";

export async function approveAccessRequest(projectId: string, requestId: string) {
  const res = await fetch(`/api/projects/${projectId}/access-requests/${requestId}/approve`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Failed to approve: ${res.statusText}`);
  }
  return z.object({ request: AccessRequestSchema }).parse(await res.json()).request;
}
```

- [x] **Step 4: Implement `decline-access-request.ts` and `cancel-access-request.ts`**

Identical shape to approve, just different URL/method:

- decline → `POST /api/projects/${projectId}/access-requests/${requestId}/decline`
- cancel → `DELETE /api/projects/${projectId}/access-requests/${requestId}`

- [x] **Step 5: Re-export from barrel**

In `src/features/projects/api/index.ts` (note the convention: explicit named exports — see hard constraint "Barrels use explicit named exports. Never `export *`"):

```ts
export {
  createAccessRequest,
  type AccessRequest,
  type CreateAccessRequestResponse,
  AccessRequestSchema,
} from "./create-access-request";
export {
  listAccessRequests,
  type AccessRequestWithRequester,
  AccessRequestWithRequesterSchema,
} from "./list-access-requests";
export { approveAccessRequest } from "./approve-access-request";
export { declineAccessRequest } from "./decline-access-request";
export { cancelAccessRequest } from "./cancel-access-request";
```

- [x] **Step 6: Type-check**

Run: `bun run typecheck`

- [ ] **Step 7: Commit**

```bash
git add src/features/projects/api/
git commit -m "feat(projects/api): client callers for access-requests"
```

---

## Task 17: Client hooks

**Files:**
- Create: `src/features/projects/hooks/use-create-access-request.ts`
- Create: `src/features/projects/hooks/use-my-access-request.ts`
- Create: `src/features/projects/hooks/use-project-access-requests.ts`
- Create: `src/features/projects/hooks/use-approve-access-request.ts`
- Create: `src/features/projects/hooks/use-decline-access-request.ts`
- Create: `src/features/projects/hooks/use-cancel-access-request.ts`
- Modify: `src/features/projects/hooks/index.ts`

- [x] **Step 1: Add query keys to existing `projectKeys`**

In `src/features/projects/hooks/use-project.ts` (where `projectKeys` is defined per Task 16 import in `use-join-project.ts`), add:

```ts
accessRequests: (projectId: string) => [...projectKeys.detail(projectId), "access-requests"] as const,
myAccessRequest: (projectId: string) => [...projectKeys.detail(projectId), "my-access-request"] as const,
```

- [x] **Step 2: Implement `use-create-access-request.ts`**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createAccessRequest } from "../api";
import { projectKeys } from "./use-project";

export function useCreateAccessRequest(projectId: string, options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message?: string) => createAccessRequest(projectId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.myAccessRequest(projectId) });
      toast.success("Request sent — we'll email you when it's reviewed.");
      options?.onSuccess?.();
    },
    onError: (err: Error) => {
      const [code] = err.message.split(":");
      const map: Record<string, string> = {
        ALREADY_MEMBER: "You're already a member of this project.",
        REQUEST_PENDING: "You already have a pending request for this project.",
        COOLDOWN_ACTIVE: "Please wait before requesting access again.",
      };
      toast.error(map[code] ?? "Couldn't send request. Try again later.");
    },
  });
}
```

- [x] **Step 3: Implement `use-my-access-request.ts`**

This hook reads the requester-side state. Since the GET endpoint is approver-only, we expose pending state via the create endpoint's 409 path. Simpler approach: pass the pending request object as `initialData` from the server component (which fetched it directly via the service in the page) and use the hook only as a cache placeholder.

```ts
import { useQuery } from "@tanstack/react-query";
import type { AccessRequest } from "../api";
import { projectKeys } from "./use-project";

export function useMyAccessRequest(projectId: string, initialData: AccessRequest | null) {
  return useQuery({
    queryKey: projectKeys.myAccessRequest(projectId),
    queryFn: () => Promise.resolve(initialData),
    initialData,
    staleTime: Infinity, // mutated only by createAccessRequest / cancelAccessRequest
  });
}
```

- [x] **Step 4: Implement `use-project-access-requests.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { listAccessRequests } from "../api";
import { projectKeys } from "./use-project";

export function useProjectAccessRequests(projectId: string, enabled = true) {
  return useQuery({
    queryKey: projectKeys.accessRequests(projectId),
    queryFn: () => listAccessRequests(projectId),
    enabled,
    staleTime: 30_000,
  });
}
```

- [x] **Step 5: Implement `use-approve-access-request.ts` and `use-decline-access-request.ts`**

```ts
// approve
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { approveAccessRequest } from "../api";
import { projectKeys } from "./use-project";

export function useApproveAccessRequest(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => approveAccessRequest(projectId, requestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.accessRequests(projectId) });
      qc.invalidateQueries({ queryKey: projectKeys.members(projectId) });
      toast.success("Access granted.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
```

decline mirrors approve, calling `declineAccessRequest`. cancel hook is a near-copy with different toast strings.

- [x] **Step 6: Re-export from barrel** (explicit named exports)

```ts
export { useCreateAccessRequest } from "./use-create-access-request";
export { useMyAccessRequest } from "./use-my-access-request";
export { useProjectAccessRequests } from "./use-project-access-requests";
export { useApproveAccessRequest } from "./use-approve-access-request";
export { useDeclineAccessRequest } from "./use-decline-access-request";
export { useCancelAccessRequest } from "./use-cancel-access-request";
```

- [x] **Step 7: Type-check & commit**

```bash
bun run typecheck
git add src/features/projects/hooks/
git commit -m "feat(projects/hooks): access-request mutation + query hooks"
```

---

## Task 18: Components — `access-request-panel.tsx` (requester-side)

**Files:**
- Create: `src/features/projects/components/access-requests/access-request-panel.tsx`
- Modify: `src/features/projects/components/index.ts`

- [ ] **Step 1: Implement the panel**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { AccessRequest } from "@/features/projects/api";
import { useCreateAccessRequest, useCancelAccessRequest } from "@/features/projects/hooks";

interface Props {
  projectId: string;
  projectName: string;
  teamName: string;
  existingRequest: AccessRequest | null;
}

export function AccessRequestPanel({ projectId, projectName, teamName, existingRequest }: Props) {
  const [message, setMessage] = useState("");
  const create = useCreateAccessRequest(projectId);
  const cancel = useCancelAccessRequest(projectId);

  // Pending state
  if (existingRequest?.status === "pending") {
    return (
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Request pending</CardTitle>
          <CardDescription>We'll email you when {projectName} reviews your request.</CardDescription>
        </CardHeader>
        <CardFooter className="justify-end">
          <Button variant="ghost" onClick={() => cancel.mutate(existingRequest.id)} disabled={cancel.isPending}>
            Cancel request
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Cooldown state
  if (existingRequest?.status === "declined" && existingRequest.declineCooldownUntil
      && new Date(existingRequest.declineCooldownUntil) > new Date()) {
    const until = new Date(existingRequest.declineCooldownUntil).toLocaleDateString();
    return (
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Request not approved</CardTitle>
          <CardDescription>You can request access again on {until}.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Form state
  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Request access to {projectName}</CardTitle>
        <CardDescription>Part of the {teamName} team. The project owner will review your request.</CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="Add a note (optional)"
          maxLength={500}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={() => create.mutate(message.trim() || undefined)} disabled={create.isPending}>
          Request access
        </Button>
      </CardFooter>
    </Card>
  );
}
```

- [ ] **Step 2: Re-export from barrel**

In `src/features/projects/components/index.ts` (explicit named exports):

```ts
export { AccessRequestPanel } from "./access-requests/access-request-panel";
```

- [ ] **Step 3: Type-check & commit**

```bash
bun run typecheck
git add src/features/projects/components/access-requests/access-request-panel.tsx \
        src/features/projects/components/index.ts
git commit -m "feat(projects): AccessRequestPanel (requester UI)"
```

---

## Task 19: Components — `access-request-list.tsx` + `access-request-row.tsx` (approver-side)

**Files:**
- Create: `src/features/projects/components/access-requests/access-request-row.tsx`
- Create: `src/features/projects/components/access-requests/access-request-list.tsx`
- Modify: `src/features/projects/components/index.ts`

- [ ] **Step 1: Implement row**

```tsx
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { AccessRequestWithRequester } from "@/features/projects/api";
import { useApproveAccessRequest, useDeclineAccessRequest } from "@/features/projects/hooks";
import { formatDistanceToNow } from "date-fns";

export function AccessRequestRow({
  projectId,
  request,
}: {
  projectId: string;
  request: AccessRequestWithRequester;
}) {
  const approve = useApproveAccessRequest(projectId);
  const decline = useDeclineAccessRequest(projectId);
  const requested = formatDistanceToNow(new Date(request.createdAt), { addSuffix: true });

  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-b-0">
      <Avatar>
        <AvatarImage src={request.requester.image ?? undefined} alt={request.requester.name} />
        <AvatarFallback>{request.requester.name.slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{request.requester.name}</span>
          <span className="text-muted-foreground text-sm truncate">{request.requester.email}</span>
        </div>
        <div className="text-xs text-muted-foreground">Requested {requested}</div>
        {request.message ? (
          <p className="text-sm mt-1 italic">"{request.message}"</p>
        ) : null}
      </div>
      {request.status === "pending" ? (
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => decline.mutate(request.id)} disabled={decline.isPending || approve.isPending}>
            Decline
          </Button>
          <Button size="sm" onClick={() => approve.mutate(request.id)} disabled={approve.isPending || decline.isPending}>
            Approve
          </Button>
        </div>
      ) : (
        <span className="text-sm text-muted-foreground capitalize shrink-0">{request.status}</span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implement list**

```tsx
"use client";

import { useProjectAccessRequests } from "@/features/projects/hooks";
import { AccessRequestRow } from "./access-request-row";

export function AccessRequestList({ projectId }: { projectId: string }) {
  const { data: requests = [], isLoading } = useProjectAccessRequests(projectId);
  const pending = requests.filter((r) => r.status === "pending");

  // Hide section entirely when no pending requests (don't show recently-decided
  // unless we add explicit history affordance — keep v1 lean).
  if (isLoading || pending.length === 0) return null;

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">Access requests ({pending.length})</h3>
      <div className="rounded-md border bg-card px-3">
        {pending.map((r) => (
          <AccessRequestRow key={r.id} projectId={projectId} request={r} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Re-export**

```ts
export { AccessRequestRow } from "./access-requests/access-request-row";
export { AccessRequestList } from "./access-requests/access-request-list";
```

- [ ] **Step 4: Type-check & commit**

```bash
bun run typecheck
git add src/features/projects/components/
git commit -m "feat(projects): AccessRequestList + AccessRequestRow (approver UI)"
```

---

## Task 20: Screen — `access-request-screen.tsx`

**Files:**
- Create: `src/features/projects/screens/access-request-screen.tsx`
- Modify: `src/features/projects/screens/index.ts`

- [ ] **Step 1: Implement**

```tsx
import { AppHeaderConfigurator, type BreadcrumbItem } from "@/components/shared/headers";
import { AccessRequestPanel } from "@/features/projects/components";
import type { AccessRequest } from "@/features/projects/api";

interface Props {
  project: { id: string; name: string; slug: string };
  teamName: string;
  existingRequest: AccessRequest | null;
}

export function AccessRequestScreen({ project, teamName, existingRequest }: Props) {
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Projects", href: "/projects" },
    { label: project.name },
  ];

  return (
    <>
      <AppHeaderConfigurator pageName={project.name} breadcrumbs={breadcrumbs} />
      <div className="flex-1 flex items-center justify-center p-6">
        <AccessRequestPanel
          projectId={project.id}
          projectName={project.name}
          teamName={teamName}
          existingRequest={existingRequest}
        />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Re-export**

```ts
export { AccessRequestScreen } from "./access-request-screen";
```

- [ ] **Step 3: Surface from feature root**

In `src/features/projects/index.ts`, ensure the new screen + components + hooks are reachable through the existing feature barrel.

- [ ] **Step 4: Commit**

```bash
git add src/features/projects/screens/ src/features/projects/index.ts
git commit -m "feat(projects): AccessRequestScreen wires panel into page chrome"
```

---

## Task 21: Issue page — branch on access

**Files:**
- Modify: `src/app/(protected)/(team)/(routes)/issue/[issueKey]/page.tsx`
- Modify: `src/app/(protected)/(verified)/(team)/(routes)/issue/[issueKey]/page.tsx`

- [ ] **Step 1: Add a helper that returns `{ pending, lastDeclined } | null` for a (project, user) pair**

Append to `src/server/projects/access-request-service.ts`:

```ts
import { or as drizzleOr } from "drizzle-orm";

export async function getMyLatestAccessRequest(
  projectId: string,
  userId: string
): Promise<AccessRequest | null> {
  const [row] = await db
    .select()
    .from(projectAccessRequests)
    .where(
      and(
        eq(projectAccessRequests.projectId, projectId),
        eq(projectAccessRequests.requesterUserId, userId),
        drizzleOr(
          eq(projectAccessRequests.status, "pending"),
          eq(projectAccessRequests.status, "declined")
        )!
      )
    )
    .orderBy(desc(projectAccessRequests.createdAt))
    .limit(1);
  return row ? rowToAccessRequest(row) : null;
}
```

Re-export from `src/server/projects/index.ts`.

- [ ] **Step 2: Modify the unverified issue page**

Replace the current body of `src/app/(protected)/(team)/(routes)/issue/[issueKey]/page.tsx` `IssuePage` so the access-denied branch renders the access-request screen instead of throwing:

```tsx
import { AccessRequestScreen } from '@/features/projects';
import { getProjectForAccessCheck, getMyLatestAccessRequest } from '@/server/projects';
import { db } from '@/lib/db';
import { teams } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

// inside IssuePage, after `const session = await getSession();` etc., REPLACE
// the unconditional `const project = await getProject(...)` call with:

const access = await getProjectForAccessCheck(issue.projectId, userId);
if (!access) {
  notFound();
}

if (!access.hasAccess) {
  // Public projects: keep the existing one-click join behavior. For v1, send
  // them through the same access-request UX — auto-join requires extra UI we
  // don't ship in this plan. (Follow-up: add an inline "Join now" button when
  // visibility === 'public'.)
  const teamRow = await db.select({ name: teams.name }).from(teams).where(eq(teams.id, access.project.teamId)).limit(1);
  const existingRequest = await getMyLatestAccessRequest(access.project.id, userId);
  return (
    <AccessRequestScreen
      project={{ id: access.project.id, name: access.project.name, slug: access.project.slug }}
      teamName={teamRow[0]?.name ?? ''}
      existingRequest={existingRequest}
    />
  );
}

// Existing path:
const project = await getProject(issue.projectId, userId);
// ... rest unchanged ...
```

(The original `getProject` call still runs after the access check so the rest of the page logic — permissions derivation, breadcrumbs — remains unchanged for the access-granted case.)

- [ ] **Step 3: Same change to the verified variant**

Apply the identical change to `src/app/(protected)/(verified)/(team)/(routes)/issue/[issueKey]/page.tsx`.

- [ ] **Step 4: Manual smoke test**

Start dev server: `bun run dev`

In browser:
1. Sign in as user A (owner of project P, with issue PRJ-1).
2. Visit `/issue/PRJ-1` — verify normal issue rendering.
3. Sign out, sign in as user B (no access to P).
4. Visit `/issue/PRJ-1` — verify the AccessRequestPanel renders showing project name + textarea, no issue title or description leaked.
5. Submit request → toast appears, panel transitions to "Pending."
6. Refresh — pending state persists.
7. As user A in another browser: project members page shows the new request → click Approve.
8. Back as user B: refresh `/issue/PRJ-1` → issue renders normally.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(protected\)/\(team\)/\(routes\)/issue/\[issueKey\]/page.tsx \
        src/app/\(protected\)/\(verified\)/\(team\)/\(routes\)/issue/\[issueKey\]/page.tsx \
        src/server/projects/access-request-service.ts \
        src/server/projects/index.ts
git commit -m "feat(issue): show AccessRequestPanel for non-members on shared links"
```

---

## Task 22: Project members page — surface AccessRequestList

**Files:**
- Modify: `src/features/projects/screens/project-detail-screen.tsx` (or whichever screen renders the members tab — confirm via grep)

- [ ] **Step 1: Locate the pending-invitations section**

Run: `grep -n "invitations\|InvitationList\|pending" src/features/projects/screens/project-detail-screen.tsx src/features/projects/components/project-member-manager-dialog.tsx`

Find the place that renders the invitations list. The new `<AccessRequestList>` goes immediately above it.

- [ ] **Step 2: Insert AccessRequestList**

Import:

```tsx
import { AccessRequestList } from "@/features/projects/components";
```

Insert above the invitations section, gated by approver permission (use existing `useSession`/role hook pattern):

```tsx
{canManageMembers && <AccessRequestList projectId={project.id} />}
```

(`canManageMembers` is the existing variable used for the invitations section. If it doesn't exist with that name, follow the pattern actually used — search for `PROJECT_MANAGE_MEMBERS` or the role check the screen already does.)

- [ ] **Step 3: Smoke test**

In dev: as project owner, visit `/{team}/{project}` members tab. Verify the new "Access requests" section appears once a pending request exists, and disappears when none.

- [ ] **Step 4: Commit**

```bash
git add src/features/projects/screens/project-detail-screen.tsx
git commit -m "feat(projects): surface AccessRequestList on members tab"
```

---

## Task 23: E2E happy path (Playwright)

**Files:**
- Create: `e2e/access-request-flow.spec.ts` (path may differ — confirm via `find . -name "*.spec.ts" -path "*e2e*"`)

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from "@playwright/test";

test("non-member requests access from issue link → approver approves → requester sees issue", async ({ browser }) => {
  // Two browser contexts — one for owner, one for requester.
  const ownerCtx = await browser.newContext();
  const requesterCtx = await browser.newContext();
  const ownerPage = await ownerCtx.newPage();
  const requesterPage = await requesterCtx.newPage();

  // (Use existing test-user fixtures / login helpers — search for an existing
  //  e2e spec like `auth.spec.ts` to find the right helper.)
  await loginAs(ownerPage, "owner@e2e.test");
  await loginAs(requesterPage, "requester@e2e.test");

  const issueUrl = "/issue/E2E-1"; // pre-seeded fixture issue in a private project

  await requesterPage.goto(issueUrl);
  await expect(requesterPage.getByText("Request access to")).toBeVisible();
  await requesterPage.getByPlaceholder("Add a note (optional)").fill("e2e test");
  await requesterPage.getByRole("button", { name: "Request access" }).click();
  await expect(requesterPage.getByText("Request pending")).toBeVisible();

  // Owner approves.
  await ownerPage.goto("/teams/e2e/e2e-project?tab=members");
  await expect(ownerPage.getByText("Access requests (1)")).toBeVisible();
  await ownerPage.getByRole("button", { name: "Approve" }).click();
  await expect(ownerPage.getByText("Access granted.")).toBeVisible();

  // Requester refreshes — sees issue.
  await requesterPage.reload();
  await expect(requesterPage.getByText(/E2E-1/)).toBeVisible();
});
```

- [ ] **Step 2: Run**

Run: `bun run e2e -- access-request-flow.spec.ts` (replace with whatever the project's e2e command is — see `package.json`).

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/
git commit -m "test(e2e): access-request golden path"
```

---

## Task 24: Wiki updates + log entry

**Files:**
- Create: `.ai/wiki/concepts/access-requests.md`
- Modify: `.ai/wiki/index.md`
- Modify: `.ai/wiki/features/projects.md`
- Modify: `.ai/wiki/log.md`

- [ ] **Step 1: Create concept page**

`.ai/wiki/concepts/access-requests.md`:

```markdown
---
title: Concept — Project Access Requests
type: concept
tags: [access-requests, projects, rbac, invitations]
last_updated: 2026-05-06
sources: []
---

# Project Access Requests

User-initiated requests to join a private project. Triggered when a signed-in non-member visits a shared issue link.

## Lifecycle

`pending → approved | declined | superseded | cancelled`

- **pending** — request created, awaiting decision.
- **approved** — approver granted access; requester now `PROJECT_VIEWER`. Auto-grants `TEAM_MEMBER` if absent.
- **declined** — approver denied; requester sees neutral message; 7-day cooldown via `declineCooldownUntil`.
- **superseded** — requester realized membership via another path (invitation accepted, public-project join). Idempotent.
- **cancelled** — requester self-cancelled before any decision.

## Race-safety

Partial unique index `project_access_requests_pending_unique_idx` on `(project_id, requester_user_id) WHERE status = 'pending'` enforces one-pending-per-pair. Mirrors `project_invitations.activeInvitationUniqueIdx`. See [[features/projects]].

## Approvers

`PROJECT_OWNER` + `PROJECT_EDITOR` per [[concepts/rbac-roles]]. Granted role on approval is always `PROJECT_VIEWER` (approver can promote later).

## Public projects

Public projects (visibility = 'public') auto-join via existing `joinProject`; the access-request flow only fires for private projects.

## Surfaces

- Requester: `AccessRequestPanel` rendered in place of the issue when `hasAccess === false`.
- Approver: `AccessRequestList` in the project members page above pending invitations.
- Both: SSE notifications + email (3 templates).

## Related

- Features: [[features/projects]], [[features/issues]]
- Concepts: [[concepts/rbac-roles]], [[concepts/realtime-sse]]
- Entities: [[entities/project]], [[entities/user]]
```

- [ ] **Step 2: Update index**

Add to `.ai/wiki/index.md` under Concepts:

```markdown
- [[concepts/access-requests]] — user-initiated request-to-join flow for private projects
```

Bump the concept count and total in the summary table at the bottom.

- [ ] **Step 3: Update projects feature page**

In `.ai/wiki/features/projects.md`, append to the API and Hooks sections:

```markdown
Access requests: `create-access-request`, `list-access-requests`, `approve-access-request`, `decline-access-request`, `cancel-access-request`.
```

```markdown
`use-create-access-request`, `use-my-access-request`, `use-project-access-requests`, `use-approve-access-request`, `use-decline-access-request`, `use-cancel-access-request`.
```

Append a new "## Access requests" section linking to `[[concepts/access-requests]]`.

- [ ] **Step 4: Append log entry**

Append to `.ai/wiki/log.md`:

```markdown
## [2026-05-06] add | concepts/access-requests
Project-scoped request-to-join feature: replaces the dead-end "no permission" error on shared issue links with an in-place access-request panel. Reuses joinProject for approval (auto-team-membership preserved). Race-safe via partial unique index. Three new email templates + three SSE notification kinds.
```

- [ ] **Step 5: Commit**

```bash
git add .ai/wiki/
git commit -m "docs(wiki): add access-requests concept + cross-links"
```

---

## Task 25: Final verification

- [ ] **Step 1: Type-check**

Run: `bun run typecheck`

Expected: clean.

- [ ] **Step 2: Linter**

Run: `bun run lint`

Expected: clean (or pre-existing warnings only).

- [ ] **Step 3: Targeted test suite**

Run only the suites this plan touched:

```bash
bun run test src/server/projects/__tests__/access-request-service.integration.test.ts
bun run test src/server/projects/__tests__/invitation-service.integration.test.ts
bun run test src/server/projects/__tests__/project-service.access-check.integration.test.ts
bun run test src/app/api/projects/\[id\]/access-requests/__tests__/route.test.ts
```

(Per the user-feedback memory: don't run the full suite during dev; rely on CI/pre-commit.)

- [ ] **Step 4: Final manual spot-check**

Repeat the dev-server smoke test from Task 21 with two browser profiles and verify:
- pending → approval → issue visible
- pending → decline → cooldown copy
- requester self-cancel → can re-request immediately
- approver-only sees the list section
- email-preview renders all three templates without error (visit `/email-preview`)

- [ ] **Step 5: Push**

```bash
git push -u origin <current-branch>
```

(Open PR via `gh pr create` per project workflow if user requests.)

---

## Self-review notes

**Spec coverage:** every decision in the design doc maps to a task —
- Project-scoped request entity → tasks 1, 3
- In-place panel on issue route → task 21
- Approvers OWNER + EDITOR → task 2 (permissions), 4/5/6 (RBAC checks)
- Granted role = PROJECT_VIEWER → task 5 (`joinProject` already defaults to viewer)
- Optional 500-char message → task 1 (column), 11 (zod max), 18 (textarea maxLength)
- Repeat rules: one pending + 7-day cooldown → task 1 (partial index), 3 (cooldown check), 6 (set cooldown)
- Notifications + email both directions → tasks 13, 14, 15
- New table separate from invitations → task 1
- `getProjectForAccessCheck` sibling → task 9
- Auto-resolution / supersede → task 8
- E2E golden path → task 23
- Wiki updates → task 24

**Type consistency:**
- `AccessRequestStatus` value list (`pending | approved | declined | superseded | cancelled`) used identically in schema (task 1), types (task 2), client zod schema (task 16), tests, and SQL `WHERE status = 'pending'` filters.
- `createAccessRequest` signature `({ projectId, userId, message })` consistent across server (task 3), API route (task 11), client caller (task 16, takes `(projectId, message)` and constructs body server-side).
- Error code names (`ALREADY_MEMBER`, `REQUEST_PENDING`, `COOLDOWN_ACTIVE`, `PROJECT_NOT_FOUND`, `REQUEST_NOT_FOUND`, `FORBIDDEN`, `INVALID_STATE`) used identically in service throws and route mappings.
- Notification type strings (`project_access_request_created`, `project_access_request_approved`, `project_access_request_declined`) match between types definition (task 14) and service emits (task 15).
- Email template type discriminators (`project_access_request_received`, `project_access_request_approved`, `project_access_request_declined`) match between queue.ts, render-template.tsx, and service enqueue calls.

**Open follow-ups intentionally deferred:**
- Public-project inline "Join now" button on the issue page (today public projects fall through to the access-request UX too — works, just one extra step).
- Capturing the originating issue URL on creation as `metadata.return_url` so the approval email links back to the exact issue. v1 sends to project landing.
- Approver-side filter for showing recently decided (last 30 days) requests; v1 hides decided rows entirely from the list and lets the email/notification serve as the audit trail.
