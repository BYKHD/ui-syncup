---
title: Feature — auth
type: feature
tags: [feature, auth, sessions, onboarding]
last_updated: 2026-05-01
sources: [sources/steering-tech, sources/feature-arch-rbac, sources/feature-arch-rate-limit-reset]
---

# Feature: `auth`

Authentication, email verification, password recovery, account linking, onboarding, invitation acceptance. Built on `better-auth` with httpOnly session cookies and Argon2 password hashing [[sources/steering-tech]].

## Screens

- `sign-in-screen.tsx`, `sign-up-screen.tsx`, `sign-up-success-screen.tsx`
- `forgot-password-screen.tsx`, `reset-password-screen.tsx`
- `verify-email-screen.tsx`, `verify-email-confirm-screen.tsx`
- `onboarding-screen.tsx`

## Hooks

`use-onboarding`, `use-forgot-password`, `use-resend-verification`, `use-force-verify`, `use-accept-invitation`, `use-delete-account`, `use-link-account`, `use-linked-accounts`, `use-session` (RBAC client surface — see [[concepts/rbac-roles]]).

## Server-side

`src/server/auth/` (out of feature scope but tightly coupled): `cookies.ts`, `password.ts` (Argon2), `rate-limiter.ts` (Redis), `rbac.ts`, `session.ts`, `tokens.ts`. See [[concepts/rbac-roles]] and [[concepts/rate-limiting]].

## Post-auth landing & OAuth path

- **Landing-view routing.** All post-sign-in entry points send the user to their `landing_view` preference, not a hardcoded `/projects`. Server guards (`sign-in/page.tsx`, `sign-up/page.tsx`, root `app/page.tsx`) call `getLandingView()` + `resolveLandingPath()` from `src/server/preferences/landing-view.ts`. Client redirects (`use-sign-in.ts`, OAuth `callbackURL`) default to `"/"` and let `app/page.tsx` resolve the cookie. An explicit invitation `callbackUrl` always takes precedence.
- **Live OAuth path = `SocialLoginButtons`.** `sign-in-form.tsx` and `sign-up-form.tsx` render `SocialLoginButtons`, which owns the real `authClient.signIn.social` call. The `handleOAuthSignIn` returned by `use-sign-in`/`use-sign-up` is **dead** (the forms drop/ignore it), so the `invitation_callback_url` localStorage persistence in those hooks does not run on the live OAuth path. Touch `SocialLoginButtons` for OAuth behavior changes.

## Related

- Sources: [[sources/feature-arch-rbac]], [[sources/feature-arch-rate-limit-reset]]
- Concepts: [[concepts/rbac-roles]], [[concepts/security]], [[concepts/rate-limiting]]
- Features: [[features/teams]], [[features/setup]], [[features/projects]] (invitation acceptance)
- Entities: [[entities/user]]
