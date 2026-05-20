# Team Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing-but-broken team switcher usable, and fix the bug where a user who accepts a team invitation cannot reach that team through the UI.

**Architecture:** "Active team" stays an implicit value (DB `users.lastActiveTeamId`, mirrored by the `team_id` cookie). A team switch updates that value then does a full page reload to `/projects` so server-rendered context is the single source of truth. Accepting an invitation now also sets the joined team as active, and revisiting an already-used invitation link routes existing members into the team instead of erroring. The switcher dropdown is uncapped and visible whenever a user has 2+ teams.

**Tech Stack:** Next.js App Router, React 19, TypeScript, TanStack Query, Drizzle/Postgres, shadcn/ui, Radix DropdownMenu, Vitest (jsdom + PGlite), @testing-library/react.

---

## Background — flaws this plan fixes

1. **Switcher caps at 5 teams.** `sidebar-team-switcher.tsx` slices to `VISIBLE_TEAM_LIMIT = 5` and renders a **disabled** "+N more teams" item — teams 6+ are unreachable.
2. **Switching dumps non-admins on a settings page.** `handleTeamSwitch` pushes to `/team/<slug>/settings`, which `TEAM_MEMBER`/`TEAM_VIEWER` invitees cannot access.
3. **Accepting an invitation never makes the new team active.** `acceptInvitation` / `acceptInvitationById` add the membership but leave `lastActiveTeamId` pointing at the old team.
4. **Revisiting an accepted invitation link is a dead end.** The `usedAt` branch throws → the route returns `410`/`409` instead of routing the (already-joined) user into the team.
5. **Single-team mode hard-hides the switcher**, stranding users who legitimately belong to multiple teams.
6. **UI defects** in the switcher: no accessible name when collapsed, no keyboard focus ring, long names overflow (missing `min-w-0`), dead `className={isCollapsed ? "" : ""}`, current team shown via `disabled` (greyed out, no explicit marker), `"1 members"`, template-literal `className` soup.

## Decisions locked in during brainstorming

- **Context model:** Hybrid — switch updates DB + cookie, then full reload. No URL-scoping of `/dashboard` / `/projects`.
- **Switcher visibility:** Show whenever the user has 2+ teams, regardless of `MULTI_TEAM_MODE`.
- **Switch lands on:** `/projects` (role-safe for every member).
- **Invitation accept:** Auto-sets the joined team as active. Revisiting an already-used link routes existing members in.

## Out of scope

URL-scoping team routes, team-creation flow changes, RBAC changes, schema changes, new endpoints. `src/hooks/use-team.ts` was reviewed and needs **no change** — `get-teams` already returns `activeTeamId = users.lastActiveTeamId`, the same value the server uses, and `useParams().slug` is only populated on `/team/[slug]/*` routes.

---

## File Structure

**Modified — server:**
- `src/server/teams/invitation-service.ts` — add a `markTeamActive` helper; in `acceptInvitation` and `acceptInvitationById` set the joined team active and short-circuit revisits by existing members.
- `src/server/teams/__tests__/invitation-flow.integration.test.ts` — assert auto-switch; replace the "already-used" test with non-member-rejection + member-revisit cases.

**Modified — client:**
- `src/components/shared/sidebar/sidebar-team-switcher.tsx` — full rewrite: uncapped scrollable list, filter input, 2+-teams visibility, full-reload switch, accessibility + layout fixes.
- `src/components/shared/notifications/notification-actions.tsx` — on team-invitation accept, full-reload to `/projects` (drop the now-redundant explicit switch call).

**Created — client:**
- `src/components/shared/sidebar/__tests__/sidebar-team-switcher.test.tsx` — component test.

**Convention reminders:**
- Run tests with **`bun run test <path>`** — NEVER `bun test` (Bun's native runner ignores Vitest config and can corrupt the local DB).
- Run scoped tests targeting changed files; do not run the full suite during dev.
- Work happens on the existing `feature/team-switcher` branch.

---

## Task 1: Auto-switch active team on invitation accept

When a user accepts an invitation, the joined team must become their `lastActiveTeamId` so the post-accept redirect to `/projects` shows the right team. Only the DB column is updated here (cookie-free, so it is safe to call from tests); the `team_id` cookie re-syncs on the next request via `getActiveTeam()`.

**Files:**
- Modify: `src/server/teams/invitation-service.ts`
- Test: `src/server/teams/__tests__/invitation-flow.integration.test.ts`

- [x] **Step 1: Add the auto-switch assertion to the existing happy-path test**

In `src/server/teams/__tests__/invitation-flow.integration.test.ts`, update the import on line 18 to include `acceptInvitationById`:

```ts
import { createInvitation, acceptInvitation, acceptInvitationById, resendInvitation, cancelInvitation } from '@/server/teams/invitation-service';
```

Then in the test `'should complete full invitation creation and acceptance flow'`, immediately after the final `expect(member.invitedBy).toBe(owner.id);` (currently line 149), add:

```ts
    // Step 8: Verify the accepted team became the invitee's active team
    const [inviteeAfterAccept] = await db
      .select({ lastActiveTeamId: users.lastActiveTeamId })
      .from(users)
      .where(eq(users.id, invitee.id))
      .limit(1);

    expect(inviteeAfterAccept.lastActiveTeamId).toBe(team.id);
```

- [x] **Step 2: Add a test covering `acceptInvitationById` auto-switch**

In the same file, add this test inside the `describe('Integration Test: Complete Invitation Flow', ...)` block, after the `'should reject expired invitations'` test:

```ts
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
```

- [x] **Step 3: Run the tests to verify they fail**

Run: `bun run test src/server/teams/__tests__/invitation-flow.integration.test.ts`
Expected: FAIL — `inviteeAfterAccept.lastActiveTeamId` is `null` (accept does not set it yet).

- [x] **Step 4: Add the `markTeamActive` helper and import**

In `src/server/teams/invitation-service.ts`, add this import below the existing `import { logAdminAction } from "@/server/audit";` line:

```ts
import { validateTeamAccess } from "./team-context";
```

Then, directly below the `isUniqueViolationOnConstraint` function (before the `/** Creates a new invitation ... */` JSDoc block), add the helper:

```ts
/**
 * Marks `teamId` as the user's active team after they join it, so the
 * post-acceptance redirect lands them in the team they just accepted.
 *
 * Updates only the `users.lastActiveTeamId` column. The `team_id` cookie is
 * intentionally NOT written here: it re-syncs to this value on the next
 * request via getActiveTeam(), and keeping this cookie-free makes the accept
 * functions safe to call outside a Next.js request scope (e.g. from tests).
 */
async function markTeamActive(userId: string, teamId: string): Promise<void> {
  await db
    .update(users)
    .set({ lastActiveTeamId: teamId })
    .where(eq(users.id, userId));
}
```

- [x] **Step 5: Call `markTeamActive` in `acceptInvitation`**

In `acceptInvitation`, the invitation is marked used with:

```ts
    // Requirement 2.4: Mark as used
    await db
      .update(teamInvitations)
      .set({ usedAt: new Date() })
      .where(eq(teamInvitations.id, invitation.id));
```

Immediately **after** that block, add:

```ts
    // Make the joined team the user's active team so the post-accept redirect
    // to /projects shows the team they just accepted.
    await markTeamActive(userId, invitation.teamId);
```

- [x] **Step 6: Call `markTeamActive` in `acceptInvitationById`**

In `acceptInvitationById`, the invitation is marked used with the same `db.update(teamInvitations).set({ usedAt: new Date() })` block. Immediately **after** it (before the `markInvitationNotificationAsResponded` call), add:

```ts
    // Make the joined team the user's active team (see acceptInvitation).
    await markTeamActive(userId, invitation.teamId);
```

- [x] **Step 7: Run the tests to verify they pass**

Run: `bun run test src/server/teams/__tests__/invitation-flow.integration.test.ts`
Expected: PASS — all tests green.

- [x] **Step 8: Typecheck the changed file**

Run: `bunx tsc --noEmit -p tsconfig.json`
Expected: no errors. (Watch for an accidental circular import — `invitation-service` → `team-context` → `team-service`; `team-context` does not import `invitation-service`, so this is acyclic.)

- [x] **Step 9: Commit**

```bash
git add src/server/teams/invitation-service.ts src/server/teams/__tests__/invitation-flow.integration.test.ts
git commit -m "$(cat <<'EOF'
feat(teams): set joined team as active when an invitation is accepted

Accepting a team invitation now sets users.lastActiveTeamId to the joined
team so the post-accept redirect to /projects shows the correct team.
EOF
)"
```

---

## Task 2: Route existing members in when they revisit an invitation link

Revisiting an already-used (or expired/cancelled) invitation link currently throws and returns a `410`/`409`. If the current user is already a member of that team, it should instead be a success: set the team active and return normally. Non-members must still be rejected — `validateTeamAccess` (membership of the *logged-in* user) is the security gate that prevents a stale "used" token from letting a stranger in.

**Files:**
- Modify: `src/server/teams/invitation-service.ts`
- Test: `src/server/teams/__tests__/invitation-flow.integration.test.ts`

- [x] **Step 1: Replace the "already-used" test and add member-revisit tests**

In `src/server/teams/__tests__/invitation-flow.integration.test.ts`, **delete** the entire existing test `'should reject already-used invitations'` (the one that accepts twice with the same invitee and expects a throw — currently lines 191–225).

Insert these three tests in its place:

```ts
  test('non-member cannot accept an already-used invitation', async () => {
    const owner = await createTestUser(`owner-used-${Date.now()}@example.com`, 'Owner');
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
    await acceptInvitation(token, invitee.id); // marks the invitation used

    // A different user who is NOT a member of the team must still be rejected.
    const stranger = await createTestUser(`stranger-${Date.now()}@example.com`, 'Stranger');
    await expect(acceptInvitation(token, stranger.id)).rejects.toThrow();
  });

  test('member revisiting an already-used invitation succeeds and stays in the team', async () => {
    const owner = await createTestUser(`owner-revisit-${Date.now()}@example.com`, 'Owner');
    const team = await createTeam({
      name: 'Revisit Team',
      description: 'Testing revisit',
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

    // Revisiting the link as an existing member must NOT throw.
    await expect(acceptInvitation(token, invitee.id)).resolves.toBeUndefined();

    // The user is still a member exactly once.
    const members = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, invitee.id));
    expect(members).toHaveLength(1);

    // Active team still points at the revisited team.
    const [after] = await db
      .select({ lastActiveTeamId: users.lastActiveTeamId })
      .from(users)
      .where(eq(users.id, invitee.id))
      .limit(1);
    expect(after.lastActiveTeamId).toBe(team.id);
  });

  test('acceptInvitationById is idempotent for an existing member', async () => {
    const owner = await createTestUser(`owner-byid-revisit-${Date.now()}@example.com`, 'Owner');
    const team = await createTeam({
      name: 'ById Revisit Team',
      description: 'Testing by-id revisit',
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

    // Second call by the same (now-member) user must succeed, not throw.
    const second = await acceptInvitationById(invitation.id, invitee.id, inviteeEmail);
    expect(second.teamId).toBe(team.id);

    const members = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, invitee.id));
    expect(members).toHaveLength(1);
  });
```

- [x] **Step 2: Run the tests to verify the new ones fail**

Run: `bun run test src/server/teams/__tests__/invitation-flow.integration.test.ts`
Expected: FAIL — `'member revisiting...'` and `'acceptInvitationById is idempotent...'` fail because the second accept currently throws `"Invitation already used"`. (`'non-member cannot accept...'` already passes.)

- [x] **Step 3: Add the early member-check short-circuit to `acceptInvitation`**

In `src/server/teams/invitation-service.ts`, in `acceptInvitation`, locate the not-found guard:

```ts
    if (!invitation) {
      logTeamEvent("team.invitation.accept.failure", {
        outcome: "failure",
        userId,
        errorCode: "INVALID_TOKEN",
        errorMessage: "Invalid invitation token",
      });
      throw new Error("Invalid invitation token");
    }
```

Immediately **after** that block (before the `if (invitation.usedAt)` check), insert:

```ts
    // If the user is already a member of this team they are revisiting the
    // link after already joining. Treat it as success: point them at the team
    // and stop — do NOT fall through to the used/expired/cancelled rejections.
    // Non-members fall through to normal validation, so a stale "used" token
    // cannot let a stranger in.
    if (await validateTeamAccess(userId, invitation.teamId)) {
      await markTeamActive(userId, invitation.teamId);
      if (!invitation.usedAt) {
        await db
          .update(teamInvitations)
          .set({ usedAt: new Date() })
          .where(eq(teamInvitations.id, invitation.id));
      }
      await deleteInvitationNotification(invitation.id);
      logTeamEvent("team.invitation.accept.success", {
        outcome: "success",
        userId,
        teamId: invitation.teamId,
        metadata: { invitationId: invitation.id, alreadyMember: true },
      });
      return;
    }
```

- [x] **Step 4: Add the early member-check short-circuit to `acceptInvitationById`**

In `acceptInvitationById`, locate the not-found guard:

```ts
    if (!invitation) {
      logTeamEvent("team.invitation.accept.failure", {
        outcome: "failure",
        userId,
        errorCode: "INVITATION_NOT_FOUND",
        errorMessage: "Invitation not found",
        metadata: { invitationId },
      });
      throw new Error("Invitation not found");
    }
```

Immediately **after** that block (before the email-match check), insert:

```ts
    // Existing member revisiting the invitation — succeed idempotently.
    // See acceptInvitation for the rationale and the security gate.
    if (await validateTeamAccess(userId, invitation.teamId)) {
      await markTeamActive(userId, invitation.teamId);
      if (!invitation.usedAt) {
        await db
          .update(teamInvitations)
          .set({ usedAt: new Date() })
          .where(eq(teamInvitations.id, invitation.id));
      }
      await deleteInvitationNotification(invitation.id);
      const memberTeam = await db.query.teams.findFirst({
        where: eq(teams.id, invitation.teamId),
      });
      logTeamEvent("team.invitation.accept.success", {
        outcome: "success",
        userId,
        teamId: invitation.teamId,
        metadata: { invitationId: invitation.id, alreadyMember: true },
      });
      return { teamId: invitation.teamId, teamSlug: memberTeam?.slug };
    }
```

- [x] **Step 5: Run the tests to verify they pass**

Run: `bun run test src/server/teams/__tests__/invitation-flow.integration.test.ts`
Expected: PASS — all tests green, including the three from Step 1.

- [x] **Step 6: Typecheck**

Run: `bunx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [x] **Step 7: Commit**

```bash
git add src/server/teams/invitation-service.ts src/server/teams/__tests__/invitation-flow.integration.test.ts
git commit -m "$(cat <<'EOF'
fix(teams): route existing members into the team on invitation revisit

Revisiting an already-used invitation link as a current member now sets
the team active and resolves successfully instead of returning 410/409.
Non-members still get the existing rejection, gated by team membership.
EOF
)"
```

---

## Task 3: Rewrite the team switcher — uncapped, role-safe, accessible

Full rewrite of `sidebar-team-switcher.tsx`: render all teams in a scrollable filterable list, show the switcher whenever the user has 2+ teams, full-reload to `/projects` on switch, and fix the accessibility/layout/clarity defects.

**Files:**
- Modify: `src/components/shared/sidebar/sidebar-team-switcher.tsx`
- Test: `src/components/shared/sidebar/__tests__/sidebar-team-switcher.test.tsx` (create)

- [x] **Step 1: Write the component test**

Create `src/components/shared/sidebar/__tests__/sidebar-team-switcher.test.tsx`:

```tsx
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamSwitcher } from '../sidebar-team-switcher';

// --- mutable mock state, reset per test ---
type MockTeam = { id: string; name: string; slug: string; image: string | null; memberCount: number };
let mockTeams: MockTeam[] = [];
let mockActiveTeamId: string | null = null;
let mockIsLoading = false;
let mockMultiTeam = false;
const mockSwitchTeam = vi.fn();
const mockRouterPush = vi.fn();
const assignMock = vi.fn();

vi.mock('@/features/teams', () => ({
  useTeams: () => ({
    data: { teams: mockTeams, activeTeamId: mockActiveTeamId },
    isLoading: mockIsLoading,
  }),
  useSwitchTeam: () => ({ mutate: mockSwitchTeam, isPending: false }),
}));

vi.mock('@/hooks/use-team', () => ({
  useTeam: () => ({
    currentTeam:
      (mockActiveTeamId
        ? mockTeams.find((t) => t.id === mockActiveTeamId)
        : mockTeams[0]) ?? null,
    isLoading: mockIsLoading,
  }),
}));

vi.mock('@/config/team', () => ({
  isMultiTeamMode: () => mockMultiTeam,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock('@/components/ui/sidebar', () => ({
  SidebarMenu: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
  useSidebar: () => ({ isMobile: false, state: 'expanded' }),
}));

vi.mock('../sidebar-team-avatar', () => ({
  TeamAvatar: () => <span data-testid="team-avatar" />,
}));

function makeTeams(count: number): MockTeam[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Team ${i + 1}`,
    slug: `team-${i + 1}`,
    image: null,
    memberCount: i + 1,
  }));
}

beforeEach(() => {
  mockTeams = [];
  mockActiveTeamId = null;
  mockIsLoading = false;
  mockMultiTeam = false;
  mockSwitchTeam.mockReset();
  mockRouterPush.mockReset();
  assignMock.mockReset();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, assign: assignMock },
  });
});

describe('TeamSwitcher', () => {
  test('is hidden in single-team mode when the user has only one team', () => {
    mockMultiTeam = false;
    mockTeams = makeTeams(1);
    mockActiveTeamId = 'team-1';
    render(<TeamSwitcher />);
    expect(screen.queryByRole('button', { name: /Current team:/ })).toBeNull();
  });

  test('is visible in single-team mode when the user has two or more teams', () => {
    mockMultiTeam = false;
    mockTeams = makeTeams(2);
    mockActiveTeamId = 'team-1';
    render(<TeamSwitcher />);
    expect(screen.getByRole('button', { name: /Current team: Team 1/ })).toBeInTheDocument();
  });

  test('is visible in multi-team mode even with a single team', () => {
    mockMultiTeam = true;
    mockTeams = makeTeams(1);
    mockActiveTeamId = 'team-1';
    render(<TeamSwitcher />);
    expect(screen.getByRole('button', { name: /Current team: Team 1/ })).toBeInTheDocument();
  });

  test('renders every team with no 5-team cap', async () => {
    const user = userEvent.setup();
    mockMultiTeam = true;
    mockTeams = makeTeams(10);
    mockActiveTeamId = 'team-1';
    render(<TeamSwitcher />);
    await user.click(screen.getByRole('button', { name: /Current team:/ }));
    for (let i = 1; i <= 10; i++) {
      expect(screen.getByRole('menuitem', { name: new RegExp(`Team ${i}\\b`) })).toBeInTheDocument();
    }
  });

  test('shows a filter input for long team lists and narrows results', async () => {
    const user = userEvent.setup();
    mockMultiTeam = true;
    mockTeams = makeTeams(10);
    mockActiveTeamId = 'team-1';
    render(<TeamSwitcher />);
    await user.click(screen.getByRole('button', { name: /Current team:/ }));
    const filter = screen.getByLabelText('Filter teams');
    await user.type(filter, 'Team 7');
    expect(screen.getByRole('menuitem', { name: /Team 7/ })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Team 3\b/ })).toBeNull();
  });

  test('switching a team triggers a full reload to /projects', async () => {
    const user = userEvent.setup();
    mockMultiTeam = true;
    mockTeams = makeTeams(3);
    mockActiveTeamId = 'team-1';
    mockSwitchTeam.mockImplementation(
      (_teamId: string, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.(),
    );
    render(<TeamSwitcher />);
    await user.click(screen.getByRole('button', { name: /Current team:/ }));
    await user.click(screen.getByRole('menuitem', { name: /Team 2/ }));
    expect(mockSwitchTeam).toHaveBeenCalledWith('team-2', expect.any(Object));
    expect(assignMock).toHaveBeenCalledWith('/projects');
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `bun run test src/components/shared/sidebar/__tests__/sidebar-team-switcher.test.tsx`
Expected: FAIL — the current component imports `isSingleTeamMode` (not mocked), caps at 5 teams, has no `Filter teams` input, and has no `aria-label` on the trigger.

- [x] **Step 3: Rewrite the component**

Replace the **entire contents** of `src/components/shared/sidebar/sidebar-team-switcher.tsx` with:

```tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RiExpandUpDownLine, RiAddLine, RiCheckLine } from "@remixicon/react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeams, useSwitchTeam } from "@/features/teams";
import { useTeam } from "@/hooks/use-team";
import { isMultiTeamMode } from "@/config/team";
import { cn } from "@/lib/utils";
import { TeamAvatar } from "./sidebar-team-avatar";

// Show the filter input only once the list is long enough to need it.
const TEAM_FILTER_THRESHOLD = 8;

export function TeamSwitcher() {
  const router = useRouter();
  const { isMobile, state } = useSidebar();
  const { data: teamsData, isLoading } = useTeams();
  const { mutate: switchTeam, isPending: isSwitching } = useSwitchTeam();
  const { currentTeam } = useTeam();
  const [filter, setFilter] = useState("");

  const teams = useMemo(() => teamsData?.teams ?? [], [teamsData?.teams]);
  const isCollapsed = state === "collapsed";

  const filteredTeams = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return teams;
    return teams.filter((team) => team.name.toLowerCase().includes(query));
  }, [teams, filter]);

  const handleTeamSwitch = (teamId: string) => {
    if (teamId === currentTeam?.id) return;

    switchTeam(teamId, {
      onSuccess: () => {
        // Full reload so the server-rendered team context (cookie + DB) is the
        // single source of truth. /projects is role-safe for every member.
        window.location.assign("/projects");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to switch team");
      },
    });
  };

  const handleCreateTeam = () => {
    router.push("/onboarding");
  };

  // Loading state — match the collapsed footprint so the sidebar does not jump.
  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <Skeleton
            className={cn("rounded-lg", isCollapsed ? "size-8" : "h-10 w-full")}
          />
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // No resolvable team — users without a team are redirected to onboarding.
  if (!currentTeam) {
    return null;
  }

  // Visibility: always show in multi-team mode (the "Create team" action stays
  // relevant); in single-team mode show only when the user genuinely belongs
  // to 2+ teams, so a multi-membership user is never stranded.
  const multiTeam = isMultiTeamMode();
  if (!multiTeam && teams.length < 2) {
    return null;
  }

  const showFilter = teams.length > TEAM_FILTER_THRESHOLD;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={isSwitching}>
            <button
              type="button"
              disabled={isSwitching}
              aria-label={`Current team: ${currentTeam.name}. Switch team`}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg transition-colors",
                "hover:bg-sidebar-accent",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isCollapsed
                  ? "p-1"
                  : "border border-sidebar-border/40 bg-sidebar-accent/80 px-1 py-1",
                isSwitching && "cursor-not-allowed opacity-50",
              )}
            >
              <TeamAvatar team={currentTeam} size="sm" />
              {!isCollapsed && (
                <>
                  <span className="min-w-0 flex-1 truncate text-left text-sm font-medium text-sidebar-accent-foreground">
                    {currentTeam.name}
                  </span>
                  <RiExpandUpDownLine className="size-4 shrink-0 text-sidebar-accent-foreground/70" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-[240px] rounded-2xl border border-sidebar-border/60 p-1 shadow-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Teams
            </DropdownMenuLabel>

            {showFilter && (
              <div className="px-1 pb-1">
                <input
                  type="text"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  // Stop Radix's menu typeahead from hijacking keystrokes.
                  onKeyDown={(event) => event.stopPropagation()}
                  placeholder="Filter teams…"
                  aria-label="Filter teams"
                  className="w-full rounded-lg border border-sidebar-border/60 bg-transparent px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            )}

            <div className="max-h-[280px] overflow-y-auto">
              {filteredTeams.length === 0 ? (
                <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                  No teams match your filter
                </div>
              ) : (
                filteredTeams.map((team) => {
                  const isActive = team.id === currentTeam.id;
                  return (
                    <DropdownMenuItem
                      key={team.id}
                      onClick={() => handleTeamSwitch(team.id)}
                      disabled={isSwitching}
                      className={cn(
                        "gap-2 rounded-xl px-2 py-2 text-sm",
                        isActive && "bg-sidebar-accent/30",
                      )}
                    >
                      <TeamAvatar team={team} size="md" />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-medium">{team.name}</span>
                        <span className="truncate text-[11px] text-muted-foreground">
                          {team.memberCount} member{team.memberCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      {isActive && (
                        <RiCheckLine className="size-4 shrink-0 text-sidebar-accent-foreground" />
                      )}
                    </DropdownMenuItem>
                  );
                })
              )}
            </div>

            {multiTeam && (
              <>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  onClick={handleCreateTeam}
                  className="gap-2 rounded-xl px-2 py-2 text-sm font-medium text-sidebar-accent-foreground/90"
                >
                  <div className="flex size-7 items-center justify-center rounded-full bg-sidebar-accent/30 text-sidebar-accent-foreground">
                    <RiAddLine className="size-4" />
                  </div>
                  Create team
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
```

Notes on what changed vs. the old file: removed `VISIBLE_TEAM_LIMIT` / the disabled "+N more" item; removed the `TEAM_SWITCHER_DESIGN` constant object and the multiline template-literal `className`; removed `usePathname` and the `/team/<slug>/settings` redirect; the active team is no longer `disabled` (it gets an explicit `RiCheckLine`); added `aria-label`, `focus-visible:ring-ring`, `min-w-0` on the truncating flex children, a collapsed-aware skeleton, member-count pluralization, and the filter input.

- [x] **Step 4: Run the test to verify it passes**

Run: `bun run test src/components/shared/sidebar/__tests__/sidebar-team-switcher.test.tsx`
Expected: PASS — all six tests green.

- [x] **Step 5: Typecheck**

Run: `bunx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [x] **Step 6: Commit**

```bash
git add src/components/shared/sidebar/sidebar-team-switcher.tsx src/components/shared/sidebar/__tests__/sidebar-team-switcher.test.tsx
git commit -m "$(cat <<'EOF'
feat(sidebar): make the team switcher usable and accessible

Render all teams (drop the 5-team cap) in a scrollable, filterable list;
show the switcher whenever the user has 2+ teams; full-reload to /projects
on switch; fix accessibility (aria-label, focus ring) and layout defects.
EOF
)"
```

---

## Task 4: Full-reload to /projects when accepting a team invitation from a notification

`notification-actions.tsx` accepts a team invitation, then makes a redundant explicit `/switch` call and soft-navigates with `router.push('/projects')` — which can render stale team context. Since Task 1 makes `acceptInvitationById` set the team active server-side, drop the redundant call and full-reload instead.

**Files:**
- Modify: `src/components/shared/notifications/notification-actions.tsx`

- [x] **Step 1: Replace the post-accept navigation block**

In `src/components/shared/notifications/notification-actions.tsx`, find this block inside `handleRespond` (currently lines 154–168):

```tsx
      // Navigate after accepting an invitation. Approvers acting on access
      // requests stay in their inbox (no navigation).
      if (action === 'accept' && !isAccessRequest) {
        const isProjectInvitation = notification.type === 'project_invitation'
        // For team invitations, switch team context first then redirect to projects
        if (!isProjectInvitation && responseData.teamId) {
          await fetch(`/api/teams/${responseData.teamId}/switch`, {
            method: 'POST',
            credentials: 'include',
          })
          router.push('/projects')
        } else if (notification.metadata.target_url) {
          router.push(notification.metadata.target_url)
        }
      }
```

Replace it with:

```tsx
      // Navigate after accepting an invitation. Approvers acting on access
      // requests stay in their inbox (no navigation).
      if (action === 'accept' && !isAccessRequest) {
        const isProjectInvitation = notification.type === 'project_invitation'
        if (!isProjectInvitation && responseData.teamId) {
          // acceptInvitationById has already set the joined team as the user's
          // active team server-side. Full-reload so /projects renders with it.
          window.location.assign('/projects')
          return
        } else if (notification.metadata.target_url) {
          router.push(notification.metadata.target_url)
        }
      }
```

- [x] **Step 2: Typecheck**

Run: `bunx tsc --noEmit -p tsconfig.json`
Expected: no errors. (`router` is still used by the project-invitation / `target_url` branches and the decline path, so its import stays.)

- [ ] **Step 3: Manual verification**

Note: Full notification-button manual verification requires two authenticated users
and live notification data. It was not fully executed in this session; the
implementation was typechecked and reviewed, and Task 5 includes the attempted
local dev-server smoke.

There is no existing unit test for `notification-actions.tsx`, and asserting a full-page navigation in that heavily-wired component is low value — verify manually:

1. Start the dev server: `bun run dev`.
2. As user A (a team owner), invite user B to a team.
3. Sign in as user B, open the notification bell, click **Accept** on the team invitation.
4. Confirm: a success toast appears, the browser does a full reload, and `/projects` shows the **newly joined** team (the switcher in the sidebar shows it as the current team with a checkmark).
5. Open the notification again (or refetch) — the accepted invitation no longer shows Accept/Decline buttons.

- [x] **Step 4: Commit**

```bash
git add src/components/shared/notifications/notification-actions.tsx
git commit -m "$(cat <<'EOF'
fix(notifications): full-reload to /projects after accepting a team invite

acceptInvitationById now sets the joined team active server-side, so drop
the redundant client switch call and full-reload so /projects renders the
correct team instead of stale context.
EOF
)"
```

---

## Task 5: Whole-feature verification

**Files:** none (verification only).

- [x] **Step 1: Run all touched test files together**

Run:
```bash
bun run test src/server/teams/__tests__/invitation-flow.integration.test.ts src/components/shared/sidebar/__tests__/sidebar-team-switcher.test.tsx
```
Expected: PASS — every test green.

- [x] **Step 2: Typecheck and lint the changed files**

Run:
```bash
bunx tsc --noEmit -p tsconfig.json
bunx next lint --dir src/components/shared/sidebar --dir src/components/shared/notifications --dir src/server/teams
```
Expected: no errors.

Note: `bunx next lint --dir ...` is not supported by this installed Next CLI
(`unknown option '--dir'`). Fallback used:
`bunx eslint src/components/shared/sidebar src/components/shared/notifications src/server/teams`.
It completed with 0 errors and 2 pre-existing warnings in
`src/server/teams/team-service.ts`.

- [ ] **Step 3: Manual end-to-end check (dev server, multi-team mode)**

Note: `MULTI_TEAM_MODE=true bun run dev` started successfully with elevated
permission and `/projects` smoke-checked as an unauthenticated 307 to `/sign-in`.
Full authenticated multi-team/invitation checks were not executed because this
session did not have seeded users/session state; MinIO was also not running.

Start with `MULTI_TEAM_MODE=true bun run dev`, then verify:

1. **Switcher visible & uncapped** — as a user in 6+ teams, open the switcher: all teams appear in a scrollable list; with 9+ teams a "Filter teams" input appears and narrows the list. The current team has a checkmark and is not greyed out.
2. **Switch lands on /projects** — switch teams from `/dashboard`, from `/projects`, and from a `/team/<slug>/settings` page; each does a full reload to `/projects` showing the new team. No bounce to a settings page you cannot access.
3. **Accept invitation** — accept an invitation (both the token link page and the notification button); you land in `/projects` for the **newly joined** team.
4. **Revisit invitation link** — open the same invitation link again after joining: you are routed into the team, with no `410`/`409` error page.
5. **Accessibility** — collapse the sidebar; the switcher button has an accessible name (screen reader announces "Current team: …"); Tab to it and confirm a visible focus ring. A very long team name truncates with an ellipsis instead of overflowing.
6. **Single-team mode** — restart with `MULTI_TEAM_MODE=false`: the switcher is hidden for a single-team user, but visible (without the "Create team" item) for a user who belongs to 2+ teams.

- [x] **Step 4: Update the wiki**

Per `CLAUDE.md`, append a dated entry to `.ai/wiki/log.md`:

```
## [2026-05-20] feat | Team switcher fixes — uncapped switcher, accept auto-switch, invite revisit
```

Review `.ai/wiki/features/teams.md` — its "Screens"/switcher notes are still accurate (the switcher remains in `components/shared/sidebar`), so no content change is required beyond confirming it. Commit any wiki change:

```bash
git add .ai/wiki/log.md
git commit -m "docs(wiki): log team switcher fixes"
```

---

## Self-Review

**Spec coverage:**
- Flaw 1 (5-team cap) → Task 3 (uncapped scrollable list, test "renders every team with no 5-team cap").
- Flaw 2 (switch dumps non-admins on settings) → Task 3 (`handleTeamSwitch` → `window.location.assign('/projects')`).
- Flaw 3 (accept does not set active team) → Task 1 (`markTeamActive` in both accept functions).
- Flaw 4 (revisit dead end) → Task 2 (early member-check short-circuit).
- Flaw 5 (single-team mode hides switcher) → Task 3 (visibility = `multiTeam || teams.length >= 2`).
- Flaw 6 (UI defects) → Task 3 (aria-label, focus ring, `min-w-0`, removed dead code, check icon, pluralization, `cn`).
- Notification accept path → Task 4.

**Placeholder scan:** none — every code step contains the full content; the only manual verification steps (Task 4 Step 3, Task 5 Step 3) list concrete, observable checks.

**Type consistency:** `markTeamActive(userId, teamId)` is defined in Task 1 and reused in Task 2. `acceptInvitation` returns `void`; `acceptInvitationById` returns `{ teamId, teamSlug }` — the member short-circuits match those signatures. The switcher consumes `useTeams()`/`useSwitchTeam()`/`useTeam()` exactly as the existing hooks expose them. `isMultiTeamMode` is the real export of `@/config/team`.
