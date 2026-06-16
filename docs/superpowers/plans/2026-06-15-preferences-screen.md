# Preferences Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the mockup Preferences screen into two genuinely-functional settings — a Theme selector wired to the live `next-themes` system, and a cookie-backed Default landing view — and delete the three inert settings.

**Architecture:** Theme uses the existing `next-themes` provider (localStorage, no backend). Default landing view persists in an httpOnly cookie (`landing_view`), read server-side so the root `redirect()` honours it with no flash. A server-only module owns the cookie read + validation; a server action owns the write; the Zod enum guards both. No database migration.

**Tech Stack:** Next.js App Router (server components + server actions), TypeScript, Zod, `next-themes`, shadcn/ui (`Select`, `Card`, `Switch`, `Alert`), `sonner` toasts, Vitest + Testing Library.

**Design doc:** [`docs/plans/2026-06-15-preferences-screen-design.md`](../../plans/2026-06-15-preferences-screen-design.md)

---

## Environment notes (read first)

- **Run tests with `bun run test` (→ `vitest run`). NEVER `bun test`** — Bun's native runner ignores Vitest config and can corrupt the local DB.
- **Use Node 22 via nvm** (`nvm use 22`). Default Node 18 breaks Vitest.
- Tests are **scoped** to changed paths, not the full suite: `bun run test src/server/preferences src/features/user-settings src/app`.
- Typecheck: `bun run typecheck` (alias for `tsc --noEmit`). Lint: `bun run lint`.
- Commit after every task. Work happens on branch `feature/preferences-screen` (already created).

## File map

| File | Responsibility | Action |
|------|----------------|--------|
| `src/server/preferences/landing-view.ts` | Cookie name/options, Zod enum, `LandingView` type, `getLandingView()` (read+validate), `resolveLandingPath()` | **Create** |
| `src/server/preferences/__tests__/landing-view.test.ts` | Unit tests for read/validate/resolve | **Create** |
| `src/features/user-settings/actions/set-landing-view.ts` | `"use server"` action: validate + write cookie | **Create** |
| `src/features/user-settings/actions/__tests__/set-landing-view.test.ts` | Unit tests for the action | **Create** |
| `src/app/page.tsx` | Resolve landing cookie in the authenticated redirect | **Modify** |
| `src/app/page.test.tsx` | Redirect test for landing resolution | **Create** |
| `src/features/auth/hooks/use-sign-in.ts` | Default redirect `/projects` → `/`; fix the line-170 guard | **Modify** |
| `src/features/user-settings/components/mockup-banner.tsx` | Shared "Mockup Preview" alert | **Create** |
| `src/features/user-settings/screens/user-settings-screen.tsx` | Remove the banner (now per-page) | **Modify** |
| `src/features/user-settings/screens/notifications-screen.tsx` / `integrations-screen.tsx` / `other-settings-screen.tsx` | Render `<MockupBanner />` | **Modify** |
| `src/features/user-settings/components/user-preferences.tsx` | Theme via `next-themes` + landing Select via action; drop 3 dead cards | **Rewrite** |
| `src/features/user-settings/components/__tests__/user-preferences.test.tsx` | Render test (controls present, dead cards gone) | **Create** |
| `src/features/user-settings/screens/setting-preferences-screen.tsx` | Accept `initialLandingView` | **Modify** |
| `src/app/(protected)/settings/page.tsx` + `.../settings/preferences/page.tsx` | Read cookie, drop mock import, pass `initialLandingView` | **Modify** |
| `src/features/user-settings/hooks/use-user-preferences.ts` | Fake hook | **Delete** |
| `src/features/user-settings/hooks/index.ts` | Drop `useUserPreferences` re-export | **Modify** |
| `src/features/user-settings/types/index.ts` | Remove `UserPreferences` interface | **Modify** |
| `src/mocks/user-settings.fixtures.ts` + `src/mocks/index.ts` | Remove `MOCK_USER_PREFERENCES` | **Modify** |

---

## Task 1: Landing-view server module (read + validate + resolve)

**Files:**
- Create: `src/server/preferences/landing-view.ts`
- Test: `src/server/preferences/__tests__/landing-view.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/server/preferences/__tests__/landing-view.test.ts`:

```ts
import { describe, test, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted; use vi.hoisted so the factory can reference the mock fn.
const { getCookie } = vi.hoisted(() => ({ getCookie: vi.fn() }))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: getCookie, set: vi.fn() })),
}))

import {
  getLandingView,
  resolveLandingPath,
  DEFAULT_LANDING_VIEW,
} from '../landing-view'

describe('landing-view preference', () => {
  beforeEach(() => vi.clearAllMocks())

  test('returns the cookie value when valid', async () => {
    getCookie.mockReturnValue({ value: 'projects' })
    expect(await getLandingView()).toBe('projects')
  })

  test('falls back to the default when the cookie is missing', async () => {
    getCookie.mockReturnValue(undefined)
    expect(await getLandingView()).toBe(DEFAULT_LANDING_VIEW)
  })

  test('falls back to the default when the cookie is garbage', async () => {
    getCookie.mockReturnValue({ value: 'not-a-view' })
    expect(await getLandingView()).toBe('dashboard')
  })

  test('resolveLandingPath maps each view to its route', () => {
    expect(resolveLandingPath('dashboard')).toBe('/dashboard')
    expect(resolveLandingPath('projects')).toBe('/projects')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test src/server/preferences/__tests__/landing-view.test.ts`
Expected: FAIL — cannot resolve `../landing-view`.

- [ ] **Step 3: Implement the module**

Create `src/server/preferences/landing-view.ts`:

```ts
import { cookies } from 'next/headers'
import { z } from 'zod'
import { isProduction } from '@/lib/env'

/** Cookie that stores the user's preferred post-login landing view. */
export const LANDING_VIEW_COOKIE = 'landing_view'

const LANDING_VIEW_MAX_AGE = 60 * 60 * 24 * 365 // 1 year in seconds

export const landingViewSchema = z.enum(['dashboard', 'projects'])
export type LandingView = z.infer<typeof landingViewSchema>

export const DEFAULT_LANDING_VIEW: LandingView = 'dashboard'

/** Security attributes for the landing-view cookie (mirrors the session cookie). */
export const LANDING_VIEW_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction(),
  sameSite: 'lax' as const,
  maxAge: LANDING_VIEW_MAX_AGE,
  path: '/',
} as const

/**
 * Reads and validates the landing-view cookie.
 * A cookie is untrusted input, so an invalid or missing value falls back to the default.
 * Server-only (uses next/headers) — never import from a client component.
 */
export async function getLandingView(): Promise<LandingView> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(LANDING_VIEW_COOKIE)?.value
  const parsed = landingViewSchema.safeParse(raw)
  return parsed.success ? parsed.data : DEFAULT_LANDING_VIEW
}

/** Maps a landing-view preference to its route path. */
export function resolveLandingPath(view: LandingView): string {
  return view === 'projects' ? '/projects' : '/dashboard'
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test src/server/preferences/__tests__/landing-view.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/server/preferences/landing-view.ts src/server/preferences/__tests__/landing-view.test.ts
git commit -m "feat(preferences): add landing-view cookie reader + schema"
```

---

## Task 2: Server action to write the landing-view cookie

**Files:**
- Create: `src/features/user-settings/actions/set-landing-view.ts`
- Test: `src/features/user-settings/actions/__tests__/set-landing-view.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/user-settings/actions/__tests__/set-landing-view.test.ts`:

```ts
import { describe, test, expect, vi, beforeEach } from 'vitest'

const { setCookie } = vi.hoisted(() => ({ setCookie: vi.fn() }))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: setCookie })),
}))

import { setLandingView } from '../set-landing-view'
import { LANDING_VIEW_COOKIE } from '@/server/preferences/landing-view'

describe('setLandingView action', () => {
  beforeEach(() => vi.clearAllMocks())

  test('sets the cookie for a valid value', async () => {
    const result = await setLandingView('projects')
    expect(result).toEqual({ success: true })
    expect(setCookie).toHaveBeenCalledWith(
      LANDING_VIEW_COOKIE,
      'projects',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
    )
  })

  test('rejects an invalid value without setting a cookie', async () => {
    const result = await setLandingView('hacker')
    expect(result).toEqual({ success: false, error: 'Invalid landing view' })
    expect(setCookie).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test src/features/user-settings/actions/__tests__/set-landing-view.test.ts`
Expected: FAIL — cannot resolve `../set-landing-view`.

- [ ] **Step 3: Implement the action**

Create `src/features/user-settings/actions/set-landing-view.ts`:

```ts
'use server'

import { cookies } from 'next/headers'
import {
  LANDING_VIEW_COOKIE,
  LANDING_VIEW_COOKIE_OPTIONS,
  landingViewSchema,
} from '@/server/preferences/landing-view'

type SetLandingViewResult = { success: true } | { success: false; error: string }

/** Validates and persists the user's preferred landing view to a cookie. */
export async function setLandingView(value: unknown): Promise<SetLandingViewResult> {
  const parsed = landingViewSchema.safeParse(value)
  if (!parsed.success) {
    return { success: false, error: 'Invalid landing view' }
  }

  const cookieStore = await cookies()
  cookieStore.set(LANDING_VIEW_COOKIE, parsed.data, LANDING_VIEW_COOKIE_OPTIONS)
  return { success: true }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test src/features/user-settings/actions/__tests__/set-landing-view.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/user-settings/actions/set-landing-view.ts src/features/user-settings/actions/__tests__/set-landing-view.test.ts
git commit -m "feat(preferences): add setLandingView server action"
```

---

## Task 3: Honour the landing preference in the root redirect

**Files:**
- Modify: `src/app/page.tsx`
- Test: `src/app/page.test.tsx`

**Note on the existing try/catch:** `app/page.tsx` wraps its `redirect()` calls in `try/catch`. We are **not** changing that structure — only swapping the literal `redirect("/dashboard")` for the resolved landing path, so runtime behaviour is identical to today. The test mocks `redirect` as a non-throwing `vi.fn()` (same approach as `src/app/(protected)/layout.test.tsx`) and asserts it was *called* with the right path.

- [ ] **Step 1: Write the failing test**

Create `src/app/page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import { redirect } from 'next/navigation'

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/server/setup', () => ({ isSetupComplete: vi.fn() }))
vi.mock('@/server/auth/cookies', () => ({ getSessionCookie: vi.fn() }))
vi.mock('@/server/auth/session', () => ({ getSession: vi.fn() }))
vi.mock('@/server/preferences/landing-view', () => ({
  getLandingView: vi.fn(),
  resolveLandingPath: (v: string) => (v === 'projects' ? '/projects' : '/dashboard'),
}))

import { isSetupComplete } from '@/server/setup'
import { getSessionCookie } from '@/server/auth/cookies'
import { getSession } from '@/server/auth/session'
import { getLandingView } from '@/server/preferences/landing-view'

async function importPage() {
  const mod = await import('./page')
  return mod.default
}

describe('HomePage landing redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(isSetupComplete as Mock).mockResolvedValue(true)
    ;(getSessionCookie as Mock).mockResolvedValue('token')
    ;(getSession as Mock).mockResolvedValue({ user: { id: 'u1' } })
  })

  it('redirects to the preferred view for an authenticated user', async () => {
    ;(getLandingView as Mock).mockResolvedValue('projects')
    const HomePage = await importPage()
    await HomePage()
    expect(redirect).toHaveBeenCalledWith('/projects')
  })

  it('redirects to /dashboard by default', async () => {
    ;(getLandingView as Mock).mockResolvedValue('dashboard')
    const HomePage = await importPage()
    await HomePage()
    expect(redirect).toHaveBeenCalledWith('/dashboard')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test src/app/page.test.tsx`
Expected: FAIL — `redirect` called with `/dashboard` (old hardcoded value) in the first test instead of `/projects`.

- [ ] **Step 3: Modify `src/app/page.tsx`**

Replace the entire file with:

```tsx
import { redirect } from "next/navigation"
import { isSetupComplete } from "@/server/setup"
import { getSessionCookie } from "@/server/auth/cookies"
import { getSession } from "@/server/auth/session"
import { getLandingView, resolveLandingPath } from "@/server/preferences/landing-view"

export default async function HomePage() {
  try {
    const done = await isSetupComplete()
    if (!done) redirect("/setup")

    const sessionToken = await getSessionCookie()
    if (sessionToken) {
      const session = await getSession()
      if (session) {
        const landingView = await getLandingView()
        redirect(resolveLandingPath(landingView))
      }
    }

    redirect("/sign-in")
  } catch {
    redirect("/setup")
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test src/app/page.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/page.test.tsx
git commit -m "feat(preferences): resolve landing view in root redirect"
```

---

## Task 4: Route post-sign-in through the root resolver

**Files:**
- Modify: `src/features/auth/hooks/use-sign-in.ts:70` and `:170`

**Why:** sign-in currently pushes straight to `/projects`, bypassing the landing cookie. Default it to `/` so it flows through the `HomePage` resolver (Task 3). The line-170 guard (which only attaches `callbackUrl` for non-default destinations) must change in lockstep, or it will wrongly preserve `/` as a callbackUrl. Net effect: the unified default landing becomes `dashboard`, and explicit `callbackUrl` deep-links are still honoured.

- [ ] **Step 1: Check for existing sign-in tests**

Run: `rg -l "useSignIn|use-sign-in" src --glob '*.test.*'`
If a test asserts a redirect to `/projects` as the default, update that expectation to `/` in Step 4's verification.

- [ ] **Step 2: Change the default redirect (line 70)**

Find:
```ts
  const { defaultEmail = "", onSuccess, redirectTo = "/projects" } = options;
```
Replace with:
```ts
  const { defaultEmail = "", onSuccess, redirectTo = "/" } = options;
```

- [ ] **Step 3: Fix the verify-email guard (line ~170)**

Find:
```ts
          if (redirectTo && redirectTo !== "/projects") {
            params.set("callbackUrl", redirectTo);
          }
```
Replace with:
```ts
          if (redirectTo && redirectTo !== "/") {
            params.set("callbackUrl", redirectTo);
          }
```

- [ ] **Step 4: Verify typecheck + any existing sign-in tests pass**

Run: `bun run typecheck`
Run: `bun run test src/features/auth` (only if sign-in tests exist; update any `/projects`-default expectation to `/`)
Expected: PASS / no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/hooks/use-sign-in.ts
git commit -m "feat(preferences): route post-sign-in through landing resolver"
```

---

## Task 5: Extract a shared MockupBanner and move it onto the still-mock screens

**Files:**
- Create: `src/features/user-settings/components/mockup-banner.tsx`
- Test: `src/features/user-settings/components/__tests__/mockup-banner.test.tsx`
- Modify: `screens/user-settings-screen.tsx`, `screens/notifications-screen.tsx`, `screens/integrations-screen.tsx`, `screens/other-settings-screen.tsx`, `components/index.ts`

**Why:** the banner currently lives in the shared `user-settings-screen.tsx`, so it stamps every settings page — including the now-real Preferences page. Move it to a shared component rendered only by the three screens that are still mockups.

- [ ] **Step 1: Write the failing test**

Create `src/features/user-settings/components/__tests__/mockup-banner.test.tsx`:

```tsx
import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MockupBanner } from '../mockup-banner'

describe('MockupBanner', () => {
  test('renders the mockup preview notice', () => {
    render(<MockupBanner />)
    expect(screen.getByText('Mockup Preview')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test src/features/user-settings/components/__tests__/mockup-banner.test.tsx`
Expected: FAIL — cannot resolve `../mockup-banner`.

- [ ] **Step 3: Create the component**

Create `src/features/user-settings/components/mockup-banner.tsx`:

```tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { RiInformationLine } from '@remixicon/react'

/** Notice shown on settings screens that are still visual mockups. */
export function MockupBanner() {
  return (
    <Alert className="mb-6 bg-blue-50/50 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900 border">
      <RiInformationLine className="h-4 w-4" />
      <AlertTitle>Mockup Preview</AlertTitle>
      <AlertDescription>
        These settings pages are currently a visual mockup. Layout and interactions are for
        demonstration purposes and are not yet wired to a backend API.
      </AlertDescription>
    </Alert>
  )
}
```

- [ ] **Step 4: Remove the banner from the shared screen**

In `src/features/user-settings/screens/user-settings-screen.tsx`, delete the `<Alert>…</Alert>` block (the one with `AlertTitle` "Mockup Preview") and remove the now-unused imports: `Alert, AlertDescription, AlertTitle` from `@/components/ui/alert` and `RiInformationLine` from `@remixicon/react`. The `<main>` should now render `{children}` directly.

- [ ] **Step 5: Render the banner on the three mock screens**

Add `import { MockupBanner } from '../components/mockup-banner'` and place `<MockupBanner />` as the first child of the root `<div className="space-y-6">` in each of:
- `screens/notifications-screen.tsx`
- `screens/integrations-screen.tsx`
- `screens/other-settings-screen.tsx`

Example for `other-settings-screen.tsx`:
```tsx
'use client'

import { OtherSettings } from '../components/other-settings'
import { MockupBanner } from '../components/mockup-banner'

export default function OtherSettingsScreen() {
  return (
    <div className="space-y-6">
      <MockupBanner />
      <div>
        <h2 className="text-xl font-semibold">Other Settings</h2>
        <p className="text-muted-foreground mt-1">
          Advanced settings and account management
        </p>
      </div>
      <OtherSettings />
    </div>
  )
}
```

- [ ] **Step 6: Export from the components barrel**

In `src/features/user-settings/components/index.ts`, add:
```ts
export { MockupBanner } from './mockup-banner'
```

- [ ] **Step 7: Run tests + typecheck**

Run: `bun run test src/features/user-settings/components/__tests__/mockup-banner.test.tsx`
Run: `bun run typecheck`
Expected: PASS / no type errors.

- [ ] **Step 8: Commit**

```bash
git add src/features/user-settings/components/mockup-banner.tsx \
        src/features/user-settings/components/__tests__/mockup-banner.test.tsx \
        src/features/user-settings/components/index.ts \
        src/features/user-settings/screens/user-settings-screen.tsx \
        src/features/user-settings/screens/notifications-screen.tsx \
        src/features/user-settings/screens/integrations-screen.tsx \
        src/features/user-settings/screens/other-settings-screen.tsx
git commit -m "refactor(settings): move mockup banner onto still-mock screens"
```

---

## Task 6: Rewrite the Preferences UI (component + screen + both pages)

These four files share one prop contract, so they change together to keep the build green. The component drops the three dead settings, drives Theme from `next-themes`, and writes the landing view through the Task 2 action.

**Files:**
- Rewrite: `src/features/user-settings/components/user-preferences.tsx`
- Test: `src/features/user-settings/components/__tests__/user-preferences.test.tsx`
- Modify: `src/features/user-settings/screens/setting-preferences-screen.tsx`
- Modify: `src/app/(protected)/settings/preferences/page.tsx` and `src/app/(protected)/settings/page.tsx`

**Note:** client files import `import type { LandingView }` from the server module. A type-only import is erased at compile time, so it pulls no server runtime into the client bundle — this does not violate the "server/* not imported from client" rule.

**Note on the component test:** Radix `Select` is unreliable to drive in jsdom, so the test asserts the rendered structure (Theme control present; the cut "Sound"/"Email digest" cards absent). The write path is covered by Task 2's action test.

- [ ] **Step 1: Write the failing test**

Create `src/features/user-settings/components/__tests__/user-preferences.test.tsx`:

```tsx
import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'system', setTheme: vi.fn() }),
}))
vi.mock('../../actions/set-landing-view', () => ({
  setLandingView: vi.fn(async () => ({ success: true })),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { UserPreferencesComponent } from '../user-preferences'

describe('UserPreferencesComponent', () => {
  test('renders Appearance and Startup, not the cut settings', () => {
    render(<UserPreferencesComponent initialLandingView="dashboard" />)
    expect(screen.getByText('Appearance')).toBeInTheDocument()
    expect(screen.getByText('Default view')).toBeInTheDocument()
    expect(screen.queryByText('Email digest')).not.toBeInTheDocument()
    expect(screen.queryByText('Enable sounds')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test src/features/user-settings/components/__tests__/user-preferences.test.tsx`
Expected: FAIL — current component still renders "Email digest"/"Enable sounds" and has no "Default view".

- [ ] **Step 3: Rewrite `user-preferences.tsx`**

Replace the entire file with:

```tsx
'use client'

import { useEffect, useState, useTransition } from 'react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { setLandingView } from '../actions/set-landing-view'
import type { LandingView } from '@/server/preferences/landing-view'

interface UserPreferencesComponentProps {
  initialLandingView: LandingView
}

export function UserPreferencesComponent({
  initialLandingView,
}: UserPreferencesComponentProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [landingView, setLandingViewState] =
    useState<LandingView>(initialLandingView)
  const [isPending, startTransition] = useTransition()

  const handleLandingChange = (value: LandingView) => {
    const previous = landingView
    setLandingViewState(value) // optimistic
    startTransition(async () => {
      const result = await setLandingView(value)
      if (result.success) {
        toast.success('Preferences updated')
      } else {
        setLandingViewState(previous) // revert
        toast.error('Failed to update preferences')
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize how the application looks and feels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select
              value={mounted ? theme : undefined}
              onValueChange={setTheme}
              disabled={!mounted}
            >
              <SelectTrigger id="theme" className="w-full sm:w-64">
                <SelectValue placeholder="System" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose your preferred color scheme
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Startup</CardTitle>
          <CardDescription>Choose where you land after signing in</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="landing-view">Default view</Label>
            <Select
              value={landingView}
              onValueChange={(value: LandingView) => handleLandingChange(value)}
              disabled={isPending}
            >
              <SelectTrigger id="landing-view" className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dashboard">Dashboard</SelectItem>
                <SelectItem value="projects">Projects</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              The page you see first when you open the app
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Update `setting-preferences-screen.tsx`**

Replace the entire file with:

```tsx
'use client'

import { UserPreferencesComponent } from '../components/user-preferences'
import type { LandingView } from '@/server/preferences/landing-view'

interface PreferencesScreenProps {
  initialLandingView: LandingView
}

export default function PreferencesScreen({
  initialLandingView,
}: PreferencesScreenProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Preferences</h2>
        <p className="text-muted-foreground mt-1">Customize your experience</p>
      </div>
      <UserPreferencesComponent initialLandingView={initialLandingView} />
    </div>
  )
}
```

- [ ] **Step 5: Update both pages that render the screen**

In **`src/app/(protected)/settings/preferences/page.tsx`**, replace the mock import + usage:

```tsx
import { AppHeaderConfigurator, type BreadcrumbItem } from '@/components/layout/headers'
import PreferencesScreen from '@/features/user-settings/screens/setting-preferences-screen'
import { getLandingView } from '@/server/preferences/landing-view'

const PREFERENCES_BREADCRUMBS: BreadcrumbItem[] = [
  { label: 'Settings', href: '/settings' },
  { label: 'Preferences' },
]

export default async function PreferencesPage() {
  const landingView = await getLandingView()
  return (
    <>
      <AppHeaderConfigurator
        pageName="Preferences"
        breadcrumbs={PREFERENCES_BREADCRUMBS}
      />
      <PreferencesScreen initialLandingView={landingView} />
    </>
  )
}
```

Then open **`src/app/(protected)/settings/page.tsx`** and apply the same change: remove the `MOCK_USER_PREFERENCES` import, make the default export `async`, `const landingView = await getLandingView()` (import from `@/server/preferences/landing-view`), and pass `initialLandingView={landingView}` to `<PreferencesScreen />`. (Confirm it is a server component — no `'use client'` at the top; if present, the page already gates server-side, so removing the mock import and reading the cookie server-side is correct.)

- [ ] **Step 6: Run tests + typecheck**

Run: `bun run test src/features/user-settings/components/__tests__/user-preferences.test.tsx`
Run: `bun run typecheck`
Expected: PASS / no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/user-settings/components/user-preferences.tsx \
        src/features/user-settings/components/__tests__/user-preferences.test.tsx \
        src/features/user-settings/screens/setting-preferences-screen.tsx \
        "src/app/(protected)/settings/preferences/page.tsx" \
        "src/app/(protected)/settings/page.tsx"
git commit -m "feat(preferences): real theme + landing-view controls"
```

---

## Task 7: Delete the dead mock code

After Task 6, the fake hook, the `UserPreferences` type, and `MOCK_USER_PREFERENCES` have no live consumers. Remove them.

**Files:**
- Delete: `src/features/user-settings/hooks/use-user-preferences.ts`
- Modify: `hooks/index.ts`, `types/index.ts`, `src/mocks/user-settings.fixtures.ts`, `src/mocks/index.ts`

- [ ] **Step 1: Delete the fake hook and its barrel export**

```bash
git rm src/features/user-settings/hooks/use-user-preferences.ts
```
In `src/features/user-settings/hooks/index.ts`, remove the line:
```ts
export { useUserPreferences } from './use-user-preferences'
```

- [ ] **Step 2: Remove the `UserPreferences` interface**

In `src/features/user-settings/types/index.ts`, delete the whole block:
```ts
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  emailDigest: 'daily' | 'weekly' | 'never'
  soundEnabled: boolean
  compactMode: boolean
}
```

- [ ] **Step 3: Remove the mock fixture and its re-export**

In `src/mocks/user-settings.fixtures.ts`, delete the `MOCK_USER_PREFERENCES` declaration and remove `UserPreferences` from the `import type { … }` at the top of the file.
In `src/mocks/index.ts`, remove `MOCK_USER_PREFERENCES` from the re-export list.

- [ ] **Step 4: Verify nothing references the removed symbols**

Run:
```bash
rg -n "UserPreferences\b|useUserPreferences|MOCK_USER_PREFERENCES" src
```
Expected: **no matches.** If any remain, fix them before continuing.

- [ ] **Step 5: Typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add -A src/features/user-settings/hooks src/features/user-settings/types src/mocks
git commit -m "chore(preferences): remove inert mock preferences code"
```

---

## Task 8: Full verification

- [ ] **Step 1: Run the scoped test suite**

Run: `bun run test src/server/preferences src/features/user-settings src/app`
Expected: all PASS. (Ensure `nvm use 22` first.)

- [ ] **Step 2: Typecheck and lint**

Run: `bun run typecheck`
Run: `bun run lint`
Expected: no errors.

- [ ] **Step 3: Manual smoke check (optional but recommended)**

Run the app (`bun run dev` under Node 22), sign in, open **Settings → Preferences**:
- Theme selector reflects and changes the live theme (and stays in sync with the header toggle).
- Set **Default view → Projects**, reload the bare URL `/` → lands on `/projects`.
- The "Mockup Preview" banner is gone from Preferences but still shows on Notifications/Integrations/Other.

- [ ] **Step 4: Final commit (if smoke fixes were needed)**

```bash
git add -A
git commit -m "test(preferences): verification pass"
```

---

## Self-review notes

- **Spec coverage:** Theme→next-themes (Task 6) ✓; landing view persist+read+redirect (Tasks 1–4, 6) ✓; cut 3 settings (Tasks 6–7) ✓; banner relocation (Task 5) ✓; Zod at the cookie boundary (Task 1) ✓; error handling — invalid cookie fallback (Task 1), action failure revert + toast (Task 6) ✓; tests for each (every task) ✓.
- **Deferred (out of scope):** date/time format preference — requires consolidating ~10 ad-hoc formatters first; tracked as a separate follow-up in the design doc.
- **Pre-existing observation (do not fix here):** `src/features/user-settings/index.ts` uses `export *`, which the project's barrel rule discourages. Unrelated to this change.
