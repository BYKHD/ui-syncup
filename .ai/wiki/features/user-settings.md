---
title: Feature — user-settings
type: feature
tags: [feature, user, preferences, integrations]
last_updated: 2026-06-16
sources: [sources/steering-structure]
---

# Feature: `user-settings`

Per-user preferences: profile, notifications, integrations, other. Self-scoped; no RBAC beyond auth.

## Screens

- `user-settings-screen.tsx` (root)
- `setting-preferences-screen.tsx`
- `notifications-screen.tsx`
- `integrations-screen.tsx`
- `other-settings-screen.tsx`

## Hooks

- `use-notification-preferences`

(The old mock `use-user-preferences` hook was removed once Preferences became real — theme + landing view no longer need a local-state hook.)

## Preferences screen (real, not mock)

`setting-preferences-screen.tsx` exposes two genuinely-functional settings (the earlier `compactMode` / `soundEnabled` / `emailDigest` mock toggles were cut as having no consumers):

- **Theme** — wired directly to `next-themes` (`useTheme`), client-side; no DB/cookie. The `UserPreferencesComponent` uses a `useSyncExternalStore` mount flag for hydration-safety.
- **Default landing view** (`dashboard` | `projects`) — persisted in the httpOnly `landing_view` cookie. Source of truth: [`src/server/preferences/landing-view.ts`](../../src/server/preferences/landing-view.ts) (`landingViewSchema`, `getLandingView`, `resolveLandingPath`, cookie name/options). Written by the `actions/set-landing-view.ts` server action; read server-side in the settings pages (display) and in [`src/app/page.tsx`](../../src/app/page.tsx) (post-login redirect). Sign-in defaults to `/` so it flows through that resolver. See [[concepts/loading-patterns]] / [[features/auth]].

> [!note] The landing-view preference is currently honored on the root redirect + email/password sign-in only. OAuth and the already-authenticated guards on the sign-in/sign-up pages still hardcode `/projects` (tracked follow-up).

The "Mockup Preview" banner now lives in a shared `components/mockup-banner.tsx`, rendered only by the still-mock screens (notifications, integrations, other) — not on the real Preferences screen.

## Notable

Has `actions/` directory (server actions) in addition to `api/` — user-settings uses Next server actions for some mutations (`set-password.ts`, `set-landing-view.ts`), an exception within the feature-first pattern.

## Related

- Features: [[features/auth]], [[features/notifications]]
- Concepts: [[concepts/storage]] (avatar uploads under `media/`)
- Entities: [[entities/user]]
