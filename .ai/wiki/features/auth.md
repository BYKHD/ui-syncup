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

## Related

- Sources: [[sources/feature-arch-rbac]], [[sources/feature-arch-rate-limit-reset]]
- Concepts: [[concepts/rbac-roles]], [[concepts/security]], [[concepts/rate-limiting]]
- Features: [[features/teams]], [[features/setup]], [[features/projects]] (invitation acceptance)
- Entities: [[entities/user]]
