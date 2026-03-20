# Admin Setup Wizard Routing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the fully-built Admin Setup Wizard into the request lifecycle so that a fresh Docker deployment automatically redirects to `/setup`, completes cleanly, and locks the wizard afterward.

**Architecture:** A Next.js `proxy.ts` (Next.js 16 replaces `middleware.ts` with `proxy.ts`, exporting `proxy()`) intercepts all page requests, checks a `setup-complete` cookie (fast path) or calls `GET /api/setup/status` (one-time cold path), and redirects to `/setup` when incomplete. A server-side guard on the setup page itself prevents re-running wizard after completion. Two small bug fixes close the post-setup redirect loop.

> **Note:** `src/proxy.ts` already exists with CORS, CSP, HSTS, and partial setup-check logic. Task 1 extends it with the cookie fast-path and the post-setup `/setup → /sign-in` guard rather than creating a new file.

**Tech Stack:** Next.js 16 (App Router, proxy), Vitest + jsdom, `@testing-library/react`, `next/server` (NextRequest/NextResponse)

---

## Discovery Summary

All 6 wizard steps, all API routes, all server services, and the `instance_settings` DB schema are **already implemented and migrated**. The only gaps are:

1. `src/proxy.ts` exists but lacks cookie fast-path and the post-setup `/setup → /sign-in` guard → root `page.tsx` always redirects to `/sign-in`, never `/setup`
2. `/setup` has no server-side guard → anyone can re-visit after setup is done
3. `POST /api/setup/complete` never returns `redirectUrl` → wizard falls back to `/dashboard` (doesn't exist)
4. `SampleDataStep` fallback hardcoded as `/dashboard` instead of `/projects`

---

## Requirements (EARS Patterns)

The following acceptance criteria define the expected system behaviour. Each item maps directly to a task below.

| ID | EARS Statement | Task |
|----|----------------|------|
| R1 | **WHEN** a page request arrives AND the `setup-complete` cookie equals `"1"`, **THE SYSTEM SHALL** skip the status API call and continue the request. | Task 1 |
| R2 | **WHEN** a request targets a protected route AND the `setup-complete` cookie is absent AND `GET /api/setup/status` returns `isSetupComplete: false`, **THE SYSTEM SHALL** respond with a 302 redirect to `/setup`. | Task 1 |
| R3 | **WHEN** `GET /api/setup/status` returns `isSetupComplete: true` AND the `setup-complete` cookie is absent, **THE SYSTEM SHALL** set `setup-complete=1` (httpOnly, SameSite=Lax, 1-year) on the response and continue the request. | Task 1 |
| R4 | **WHEN** a request targets `/setup` AND the `setup-complete` cookie equals `"1"`, **THE SYSTEM SHALL** respond with a 302 redirect to `/sign-in`. | Task 1 |
| R5 | **WHEN** `SetupPage` is rendered AND `isSetupComplete()` returns `true`, **THE SYSTEM SHALL** redirect to `/sign-in` before rendering any UI. | Task 2 |
| R6 | **WHEN** `SetupPage` is rendered AND `isSetupComplete()` throws, **THE SYSTEM SHALL** allow the error to propagate to the nearest Next.js `error.tsx` boundary. | Task 2 |
| R7 | **WHEN** `POST /api/setup/complete` succeeds, **THE SYSTEM SHALL** return `{ redirectUrl: "/projects" }` in the response body AND set the `setup-complete=1` cookie. | Task 3 |
| R8 | **WHEN** `SampleDataStep` receives a `POST /api/setup/complete` response with no `redirectUrl`, **THE SYSTEM SHALL** navigate to `/projects` as the fallback. | Task 4 |

---

## Task 1: Extend `src/proxy.ts` — Setup routing gate

**Files:**
- Modify: `src/proxy.ts`

---

> **Helper context:** `shouldBypassSetupCheck(pathname)` returns `true` for static assets and API routes (e.g., `/api/setup/*`, `/_next/*`). `isProtectedRoute(pathname)` returns `true` for any route that requires setup to be complete before access (excludes `/sign-in`, `/sign-up`, `/setup` from the redirect loop). Both helpers already exist in `src/proxy.ts` — do not modify them.

### Step 1.1: Write the failing tests

Create `src/proxy/__tests__/proxy-setup-gate.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetSetupStatus = vi.fn();
vi.mock('@/lib/setup-status', () => ({ getSetupStatus: mockGetSetupStatus }));

// Import after mocks
const { proxy } = await import('../../proxy');

function makeRequest(pathname: string, cookies: Record<string, string> = {}) {
  const req = new NextRequest(`http://localhost${pathname}`);
  Object.entries(cookies).forEach(([k, v]) => req.cookies.set(k, v));
  return req;
}

describe('proxy() — setup gate (R1–R4)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('R1: skips status API when setup-complete cookie is present', async () => {
    const res = await proxy(makeRequest('/dashboard', { 'setup-complete': '1' }));
    expect(mockGetSetupStatus).not.toHaveBeenCalled();
    expect(res.status).not.toBe(302);
  });

  it('R2: redirects to /setup when cookie absent and setup not complete', async () => {
    mockGetSetupStatus.mockResolvedValueOnce({ isSetupComplete: false });
    const res = await proxy(makeRequest('/dashboard'));
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('/setup');
  });

  it('R3: stamps setup-complete cookie when cold-path confirms setup done', async () => {
    mockGetSetupStatus.mockResolvedValueOnce({ isSetupComplete: true });
    const res = await proxy(makeRequest('/dashboard'));
    expect(res.headers.get('set-cookie')).toContain('setup-complete=1');
  });

  it('R4: redirects /setup to /sign-in when setup-complete cookie present', async () => {
    const res = await proxy(makeRequest('/setup', { 'setup-complete': '1' }));
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('/sign-in');
  });
});
```

### Step 1.2: Run to confirm failure

```bash
bun run test src/proxy/__tests__/proxy-setup-gate.test.ts
```

Expected: FAIL — the existing proxy logic does not yet have the cookie fast-path or the `/setup` guard.

### Step 1.3: Extend the implementation

Modify `src/proxy.ts` — add cookie fast-path and `/setup` post-completion guard inside the existing `proxy()` function. The existing CORS, CSP, and HSTS logic remains untouched.

Replace the existing setup-check block (after the `FORCE_SETUP` block, before `NextResponse.next()`) in `src/proxy.ts`:

```typescript
  // Fast path: cookie already set by a previous successful check.
  const cookieValue = request.cookies.get('setup-complete')?.value;
  const hasCookie = cookieValue === '1';

  // Guard /setup — if setup is already done, redirect away immediately.
  if (pathname === '/setup' && hasCookie) {
    return NextResponse.redirect(new URL('/sign-in', request.nextUrl.origin));
  }

  // Only run the cold-path status check for protected routes.
  if (!shouldBypassSetupCheck(pathname) && isProtectedRoute(pathname) && !hasCookie) {
    const status = await getSetupStatus(request);

    if (status && !status.isSetupComplete) {
      logger.info(`Redirecting to /setup - setup not complete`, { pathname });
      return NextResponse.redirect(new URL('/setup', request.nextUrl.origin));
    }

    // Setup is confirmed complete — continue and stamp the cookie below.
  }

  // Continue with the request.
  const response = NextResponse.next();

  // Stamp the fast-path cookie now that we know setup is complete.
  if (!hasCookie && !shouldBypassSetupCheck(pathname) && isProtectedRoute(pathname)) {
    response.cookies.set('setup-complete', '1', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });
  }
```

> **Note:** Keep the existing CSP/HSTS header blocks after this, and remove the old `getSetupStatus` call that was in the `isProtectedRoute` branch (it is now replaced by the block above).

### Step 1.4: Run tests to confirm they pass

```bash
bun run test src/proxy/__tests__/proxy-setup-gate.test.ts
```

Expected: All tests PASS.

### Step 1.5: Commit

```bash
git add src/proxy.ts src/proxy/__tests__/proxy-setup-gate.test.ts
git commit -m "feat: add cookie fast-path and setup guard to proxy"
```

---

## Task 2: Guard `/setup` with a server-side check

**Files:**
- Modify: `src/app/(public)/setup/page.tsx`
- Create: `src/app/(public)/setup/__tests__/page.test.tsx`

---

### Step 2.1: Write the failing test

Create `src/app/(public)/setup/__tests__/page.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';

const mockRedirect = vi.fn();
const mockIsSetupComplete = vi.fn();

vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('@/server/setup', () => ({ isSetupComplete: mockIsSetupComplete }));
vi.mock('@/features/setup/screens/setup-screen', () => ({
  SetupScreen: () => null,
}));

// Import after mocks
const { default: SetupPage } = await import('../page');

describe('SetupPage (server component)', () => {
  it('redirects to /sign-in when setup is already complete', async () => {
    mockIsSetupComplete.mockResolvedValueOnce(true);
    await SetupPage();
    expect(mockRedirect).toHaveBeenCalledWith('/sign-in');
  });

  it('renders SetupScreen when setup is not complete', async () => {
    mockIsSetupComplete.mockResolvedValueOnce(false);
    const result = await SetupPage();
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(result).not.toBeNull();
  });
});
```

### Step 2.2: Run to confirm failure

```bash
bun run test src/app/\(public\)/setup/__tests__/page.test.tsx
```

Expected: FAIL — `SetupPage` is not async, so redirect is never called.

### Step 2.3: Update `src/app/(public)/setup/page.tsx`

```typescript
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isSetupComplete } from '@/server/setup';
import { SetupScreen } from '@/features/setup/screens/setup-screen';

export const metadata: Metadata = {
  title: 'Setup | UI Syncup',
  description: 'Initial setup wizard for UI Syncup instance.',
};

export default async function SetupPage() {
  const done = await isSetupComplete();
  if (done) redirect('/sign-in');
  return <SetupScreen />;
}
```

### Step 2.4: Run tests to confirm they pass

```bash
bun run test src/app/\(public\)/setup/__tests__/page.test.tsx
```

Expected: All tests PASS.

### Step 2.5: Commit

```bash
git add "src/app/(public)/setup/page.tsx" "src/app/(public)/setup/__tests__/page.test.tsx"
git commit -m "feat: guard /setup with server-side redirect when setup is complete"
```

---

## Task 3: Fix `POST /api/setup/complete` — add `redirectUrl` + set cookie

**Files:**
- Modify: `src/app/api/setup/complete/route.ts`
- Create: `src/app/api/setup/complete/__tests__/route.test.ts`

---

### Step 3.1: Write the failing tests

Create `src/app/api/setup/complete/__tests__/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Stable session
const mockGetSession = vi.fn();
const mockIsSetupComplete = vi.fn();
const mockGetInstanceStatus = vi.fn();
const mockCreateSampleProject = vi.fn();

vi.mock('@/server/auth/session', () => ({ getSession: mockGetSession }));
vi.mock('@/server/setup', () => ({
  isSetupComplete: mockIsSetupComplete,
  getInstanceStatus: mockGetInstanceStatus,
}));
vi.mock('@/server/setup/sample-data-service', () => ({
  createSampleProject: mockCreateSampleProject,
}));
vi.mock('@/lib/db', () => ({
  db: {
    query: { instanceSettings: { findFirst: vi.fn(() => ({ id: 'settings-1' })) } },
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
  },
}));
vi.mock('@/server/db/schema', () => ({ instanceSettings: {} }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }));

const { POST } = await import('../route');

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/setup/complete', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/setup/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com' });
    mockIsSetupComplete.mockResolvedValue(false);
    mockGetInstanceStatus.mockResolvedValue({ adminEmail: 'admin@test.com' });
  });

  it('returns redirectUrl: /projects in response body', async () => {
    const res = await POST(makeRequest({ workspaceId: 'ws-1', createSampleData: false }));
    const data = await res.json();
    expect(data.redirectUrl).toBe('/projects');
  });

  it('sets setup-complete cookie on the response', async () => {
    const res = await POST(makeRequest({ workspaceId: 'ws-1', createSampleData: false }));
    const cookie = res.headers.get('set-cookie');
    expect(cookie).toContain('setup-complete=1');
  });

  it('returns 200 on success', async () => {
    const res = await POST(makeRequest({ workspaceId: 'ws-1', createSampleData: false }));
    expect(res.status).toBe(200);
  });
});
```

### Step 3.2: Run to confirm failure

```bash
bun run test "src/app/api/setup/complete/__tests__/route.test.ts"
```

Expected: FAIL — `redirectUrl` not in response, no `setup-complete` cookie.

### Step 3.3: Update the complete route

In `src/app/api/setup/complete/route.ts`, locate the block that begins with `return NextResponse.json(` and contains `message: "Setup completed successfully"` — replace the entire `return` statement (from `return NextResponse.json(` through its closing `);`):

```typescript
    // Mark setup as complete (workspace should already exist from previous step)
    const { db } = await import("@/lib/db");
    const { instanceSettings } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");

    const settings = await db.query.instanceSettings.findFirst();
    if (settings) {
      await db.update(instanceSettings)
        .set({
          setupCompletedAt: new Date(),
          defaultWorkspaceId: body.workspaceId,
          updatedAt: new Date(),
        })
        .where(eq(instanceSettings.id, settings.id));
    }

    // Optionally create sample data
    let sampleDataCreated = false;
    if (body.createSampleData) {
      try {
        await createSampleProject({
          workspaceId: body.workspaceId,
          userId: session.id,
        });
        sampleDataCreated = true;

        logger.info("setup.complete.sample_data_created", {
          requestId,
          workspaceId: body.workspaceId,
        });
      } catch (sampleError) {
        // Log but don't fail the setup if sample data creation fails
        logger.warn("setup.complete.sample_data_failed", {
          requestId,
          workspaceId: body.workspaceId,
          error: sampleError instanceof Error ? sampleError.message : "Unknown error",
        });
      }
    }

    logger.info("setup.complete.success", {
      requestId,
      userId: session.id,
      workspaceId: body.workspaceId,
      sampleDataCreated,
    });

    return NextResponse.json(
      {
        success: true,
        workspaceId: body.workspaceId,
        sampleDataCreated,
        message: "Setup completed successfully",
      },
      { status: 200 }
    );
```

Replace with:

```typescript
    // Mark setup as complete (workspace should already exist from previous step)
    const { db } = await import("@/lib/db");
    const { instanceSettings } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");

    const settings = await db.query.instanceSettings.findFirst();
    if (settings) {
      await db.update(instanceSettings)
        .set({
          setupCompletedAt: new Date(),
          defaultWorkspaceId: body.workspaceId,
          updatedAt: new Date(),
        })
        .where(eq(instanceSettings.id, settings.id));
    }

    // Optionally create sample data
    let sampleDataCreated = false;
    if (body.createSampleData) {
      try {
        await createSampleProject({
          workspaceId: body.workspaceId,
          userId: session.id,
        });
        sampleDataCreated = true;

        logger.info("setup.complete.sample_data_created", {
          requestId,
          workspaceId: body.workspaceId,
        });
      } catch (sampleError) {
        // Log but don't fail the setup if sample data creation fails
        logger.warn("setup.complete.sample_data_failed", {
          requestId,
          workspaceId: body.workspaceId,
          error: sampleError instanceof Error ? sampleError.message : "Unknown error",
        });
      }
    }

    logger.info("setup.complete.success", {
      requestId,
      userId: session.id,
      workspaceId: body.workspaceId,
      sampleDataCreated,
    });

    const response = NextResponse.json(
      {
        success: true,
        workspaceId: body.workspaceId,
        sampleDataCreated,
        redirectUrl: "/projects",
        message: "Setup completed successfully",
      },
      { status: 200 }
    );

    // Cache setup completion in the browser so middleware takes the fast path
    response.cookies.set("setup-complete", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });

    return response;
```

### Step 3.4: Run tests to confirm they pass

```bash
bun run test "src/app/api/setup/complete/__tests__/route.test.ts"
```

Expected: All tests PASS.

### Step 3.5: Commit

```bash
git add "src/app/api/setup/complete/route.ts" "src/app/api/setup/complete/__tests__/route.test.ts"
git commit -m "fix: return redirectUrl and set setup-complete cookie in complete setup route"
```

---

## Task 4: Fix `SampleDataStep` fallback redirect

**Files:**
- Modify: `src/features/setup/components/sample-data-step.tsx` (line 59)
- Modify: `src/features/setup/components/__tests__/setup-wizard-ui.test.tsx`

---

### Step 4.1: Write the failing test

Add to the existing `setup-wizard-ui.test.tsx`. Find the `SampleDataStep` describe block (or add one) with:

```typescript
describe('SampleDataStep redirect', () => {
  it('redirects to /projects on success when no redirectUrl returned', async () => {
    const mockPush = vi.fn();
    vi.mocked(require('next/navigation').useRouter).mockReturnValue({ push: mockPush });

    mockUseCompleteSetup.mockReturnValue({
      mutate: (_data: unknown, opts: { onSuccess: (d: { redirectUrl?: string }) => void }) => {
        opts.onSuccess({}); // no redirectUrl in response
      },
      isPending: false,
      error: null,
    });

    const wizard = { ...createWizardStub(), workspaceData: { id: 'ws-1', name: 'Test', slug: 'test' } };
    const { getByRole } = render(<SampleDataStep wizard={wizard} />);
    fireEvent.click(getByRole('button', { name: /complete setup/i }));

    expect(mockPush).toHaveBeenCalledWith('/projects');
  });
});
```

You'll need `fireEvent` — add to the import: `import { render, screen, fireEvent } from '@testing-library/react';`

### Step 4.2: Run to confirm failure

```bash
bun run test "src/features/setup/components/__tests__/setup-wizard-ui.test.tsx"
```

Expected: FAIL — push called with `/dashboard`, not `/projects`.

### Step 4.3: Fix the fallback in `sample-data-step.tsx`

In `src/features/setup/components/sample-data-step.tsx`, line ~59:

```typescript
// Before
router.push('/dashboard');
// After
router.push('/projects');
```

### Step 4.4: Run tests to confirm they pass

```bash
bun run test "src/features/setup/components/__tests__/setup-wizard-ui.test.tsx"
```

Expected: All tests PASS.

### Step 4.5: Run the full test suite

```bash
bun run test
```

Expected: All existing tests still pass. Confirm the count is ≥ before + tests added.

### Step 4.6: Final commit

```bash
git add "src/features/setup/components/sample-data-step.tsx" "src/features/setup/components/__tests__/setup-wizard-ui.test.tsx"
git commit -m "fix: redirect to /projects (not /dashboard) after setup completion"
```

---

## Edge Cases

The following scenarios have been reviewed and resolved. No additional code changes are required unless noted.

| Scenario | Expected Behaviour | Resolved By |
|----------|--------------------|-------------|
| **Cookie deleted/expired after setup completes** | Next request misses the cookie → cold-path calls `GET /api/setup/status` → returns `isSetupComplete: true` → proxy re-stamps `setup-complete=1` cookie and continues. Full automatic recovery, no user impact. | R3 (Task 1) |
| **Concurrent first requests on fresh instance** | Multiple parallel requests all miss the cookie and call the status API simultaneously. All receive `isSetupComplete: false` and all 302 to `/setup`. The status API is read-only at this point — no state corruption possible. Acceptable behaviour. | R2 (Task 1) |
| **`isSetupComplete()` throws in `SetupPage`** | Error propagates to the nearest Next.js `error.tsx` boundary. This is the correct signal that infrastructure is broken. Fail-open (showing the wizard) is dangerous because setup may already be complete; redirect-on-error is confusing. Let Next.js handle it. | R6 (Task 2) |
| **`POST /api/setup/complete` DB write succeeds but cookie fails** | Setup is marked complete in the DB. On the next browser request, the cookie is absent → cold-path status check returns `isSetupComplete: true` → proxy re-stamps the cookie. Self-recovering with no user-facing impact. | R3 (Task 1) |

---

## Verification (End-to-End)

After implementing all 4 tasks, verify the full flow manually with a clean database:

| Step | Action | Expected |
|------|--------|----------|
| 1 | `GET /` | 302 → `/setup` |
| 2 | `GET /sign-in` | 302 → `/setup` |
| 3 | Complete all 6 wizard steps | Cookie `setup-complete=1` set, redirect to `/projects` |
| 4 | `GET /setup` | 302 → `/sign-in` (middleware blocks re-run) |
| 5 | Clear cookies, `GET /sign-in` | 200 OK (status check confirms setup done, re-sets cookie) |
| 6 | `GET /api/setup/status` | Always 200, middleware skips it |

Run full test suite one final time:

```bash
bun run test
```

---

## Files Changed Summary

| Action | File |
|--------|------|
| MODIFY | `src/proxy.ts` |
| CREATE | `src/proxy/__tests__/proxy-setup-gate.test.ts` |
| UPDATE | `src/app/(public)/setup/page.tsx` |
| CREATE | `src/app/(public)/setup/__tests__/page.test.tsx` |
| UPDATE | `src/app/api/setup/complete/route.ts` |
| CREATE | `src/app/api/setup/complete/__tests__/route.test.ts` |
| UPDATE | `src/features/setup/components/sample-data-step.tsx` |
| UPDATE | `src/features/setup/components/__tests__/setup-wizard-ui.test.tsx` |
