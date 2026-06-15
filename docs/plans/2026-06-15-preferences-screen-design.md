# Design — Make the Preferences screen real

- **Date:** 2026-06-15
- **Status:** Approved (brainstorm complete)
- **Branch:** `feature/preferences-screen`
- **Owner:** BYKHD
- **Scope:** `src/features/user-settings` preferences screen + landing-view redirect wiring

---

## Problem

`setting-preferences-screen.tsx` is a deliberate, labelled mockup. The shared
settings layout renders a "Mockup Preview … not yet wired to a backend API"
banner, the page feeds `MOCK_USER_PREFERENCES`, the `use-user-preferences` hook
fakes a 300ms save, the API layer is an empty placeholder, and **no preference
columns exist in the database.**

The instinct is "wire it to a backend." Investigation showed that would be the
wrong move:

1. **Theme is not unfinished — it is a disconnected duplicate.** Theme already
   works app-wide via `next-themes` (`ThemeProvider` in `app/layout.tsx`, a live
   toggle in `header-user-menu.tsx`). The preferences `<Select>` writes to fake
   local state and never calls `setTheme`. Persisting a `theme` field would
   create a second source of truth that fights `next-themes` (hydration flicker).
2. **Three of the four settings have zero consumers.** `compactMode`,
   `soundEnabled`, `emailDigest` appear only in mock fixtures. Nothing reads
   them. Persisting them would ship toggles that save to a DB but change
   nothing — a *more convincing lie* than the honest mockup banner.

**Yardstick adopted for this work:** a preference earns a place on this screen
only if (1) toggling it changes real behaviour the user notices, and (2) the
consumer that reads it exists or is feasible to build now.

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Cut** Compact mode, Sound, Email digest | No consumers; would be inert. Email digest also overlaps the Notifications screen and needs a backend digest job. |
| 2 | **Keep Theme**, rewired to `next-themes` (client, no DB) | The one setting with a working consumer. Makes the header toggle and this selector one source of truth. |
| 3 | **Add Default landing view** (Dashboard \| Projects), cookie-backed | Unifies a real existing inconsistency (root → `/dashboard`, sign-in → `/projects`). Cheap: two well-defined chokepoints. |
| 4 | **Persist via cookies, no DB migration** | Both new-style prefs must be readable server-side (the landing redirect is a server `redirect()`). Cookies are server-readable, need no migration, and are isolated behind a reader so a later DB upgrade is contained. Trade-off: per-device, not cross-device. |
| 5 | **Default landing view = `dashboard`** | Canonical "home"; unifies the split default. |
| 6 | **Defer date/time format** to its own PR | There is no central date formatter — timestamps are formatted ad-hoc across ~10+ files (`project-detail-activity-feed.tsx` has its own `formatTimestamp`, `metadata-section.tsx` notes "until date-fns is added", etc.). A format preference requires consolidating those first. That is a "consolidate date formatting" refactor that does not belong on the perf branch and would otherwise ship a partially-inert toggle. |

## Out of scope

- Date/time format preference (deferred — see Decision 6).
- Cross-device sync of preferences (would require the DB path).
- Any change to the Notifications / Integrations / Other settings screens beyond
  relocating the mockup banner onto them.

---

## Design detail

### Appearance — Theme (no backend)

The existing `<Select>` uses `next-themes` directly instead of the fake hook:

```tsx
const { theme, setTheme } = useTheme()
// value={theme}; onValueChange={setTheme}; options unchanged (light/dark/system)
```

Mirror the pattern already in `header-user-menu.tsx`. Add the standard `mounted`
guard so the control does not cause a hydration mismatch. `next-themes` owns
persistence (localStorage); no cookie, no DB.

### Startup — Default landing view (cookie)

- **Write:** server action `setLandingView(view)` in `user-settings/actions/`
  (same pattern as the existing `actions/set-password.ts`):
  `cookies().set('<name>', view, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: ~1yr })`.
  Cookie name to follow the existing session-cookie convention (confirm at
  implementation).
- **Validate:** `z.enum(['dashboard', 'projects'])` on every read. A cookie is an
  untrusted boundary (CLAUDE.md: validate every network boundary with Zod).
  Invalid/missing → fall back to `dashboard`.
- **Read (display):** `settings/preferences/page.tsx` reads the cookie
  server-side and passes `initialLandingView` to the screen (replacing the
  `MOCK_USER_PREFERENCES` import).
- **Read (effect):** `app/page.tsx` resolves the cookie:
  `redirect(landingFromCookie ?? '/dashboard')` (mapping `projects` → `/projects`).
- **Single chokepoint:** change the sign-in default in `use-sign-in.ts` from
  `/projects` to `/` (only when there is no `callbackUrl`), so post-login flows
  through the same root resolver. `callbackUrl` deep-links are preserved.

### Data flow summary

- **Theme:** `useTheme()` ⇄ localStorage. Pure client.
- **Landing view (write):** Screen → `setLandingView` action → `cookies().set`.
- **Landing view (read, display):** `preferences/page.tsx` → `cookies()` → Zod → prop.
- **Landing view (read, effect):** `app/page.tsx` → `cookies()` → Zod → `redirect()`.

### Mockup banner relocation

The banner lives in the shared `user-settings-screen.tsx`, so it stamps every
settings page. Move the `<Alert>` out of the shared screen into the three
screens still mocked — `notifications-screen.tsx`, `integrations-screen.tsx`,
`other-settings-screen.tsx` — so the now-real Preferences page renders clean and
the rest stay honest.

### Error handling

- Bad/missing cookie → `safeParse` → silent fallback to `dashboard`. Never throw.
- Server action failure → `toast.error` + revert the Select (optimistic update
  with rollback via `useTransition`).
- Theme → `mounted` guard prevents hydration flash; `next-themes` owns the rest.

---

## Testing

Scoped Vitest only (`bun run test`, Node 22 via nvm), targeting changed files:

- **Zod schema** — `dashboard`/`projects` pass; `null`/`""`/`"garbage"` → default.
- **Server action** — sets cookie with correct name/value/attributes; rejects
  invalid input.
- **Root redirect** — extend the existing `(protected)/layout.test.tsx` pattern:
  cookie `projects` → `/projects`; missing → `/dashboard`.
- **Screen** — renders theme + landing controls; changing landing calls the
  action; theme Select calls `setTheme` (mock `next-themes` + the action).
- **Regression** — grep tests for removed fields (`compactMode` / `soundEnabled`
  / `emailDigest`) and the deleted mock hook; update any that reference them.

---

## File-by-file change list

| File | Change |
|------|--------|
| `features/user-settings/types/index.ts` | Drop the 3 cut fields from `UserPreferences`; remove the interface if landing view does not reuse it |
| `features/user-settings/components/user-preferences.tsx` | Remove Sound + Email digest cards & compact row; theme → `useTheme`; add landing-view Select |
| `features/user-settings/hooks/use-user-preferences.ts` | **Delete** (fake hook) |
| `features/user-settings/actions/set-landing-view.ts` | **New** server action + Zod enum |
| `features/user-settings/api/index.ts` (or a small server reader) | **New** `getLandingView()` cookie reader (Zod-validated) |
| `features/user-settings/screens/setting-preferences-screen.tsx` | Accept `initialLandingView`; pass down |
| `app/(protected)/settings/preferences/page.tsx` | Read cookie; drop `MOCK_USER_PREFERENCES` |
| `app/page.tsx` | Resolve landing cookie in `redirect()` |
| `features/auth/hooks/use-sign-in.ts` | Default `/projects` → `/` (preserve `callbackUrl`) |
| `features/user-settings/screens/user-settings-screen.tsx` + 3 mock screens | Relocate the Mockup banner |
| `mocks/user-settings.fixtures.ts` | Trim/remove `MOCK_USER_PREFERENCES` |

## Deferred follow-up

**Consolidate date formatting** → then add a date/time format preference
(relative vs absolute, 12h vs 24h) governed app-wide. Prerequisite: a single
`formatDateTime` util + `useDateFormat`/`getDateFormat` reader, with the ~10+
ad-hoc call sites migrated to it. Tracked separately from this work.
