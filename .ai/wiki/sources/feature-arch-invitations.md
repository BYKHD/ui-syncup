---
title: Source — docs/feature-architectures/INVITATIONS.md
type: source
tags: [source, invitations, teams, projects]
last_updated: 2026-05-01
original_path: docs/feature-architectures/INVITATIONS.md
original_status: removed (this wiki page is now canonical)
---

# Source: `docs/feature-architectures/INVITATIONS.md` *(original removed)*

> [!note]
> The original `docs/feature-architectures/INVITATIONS.md` has been removed. **This wiki page is now the canonical reference.**

Covers both team invitations and project invitations: creation, delivery, accept/decline, unauthenticated user flows, token security.

## Key facts

- **Two invite types**: team invites (`/join-team?token=…`) and project invites (`/invite/project/TOKEN`).
- **Token security**: stored only as SHA-256 hashes in DB. 7-day expiry for both types.
- **Rate limits**: 10 invites per hour per team / per project.
- **Email mismatch + duplicate guards**: enforced for both types.
- **Decline-from-email (unauthenticated)**: supported for project invites; not for team invites.
- **Email delivery tracking**: project invites only (3 DB columns).
- **Service**: `src/server/teams/invitation-service.ts` orchestrates team invites.
- **Endpoints**: `GET /api/teams/invitations/[token]/accept`, `POST /api/teams/invitations/by-id/[id]/decline`, `POST /api/invite/project/[token]`, `POST /api/invite/project/[token]/decline`.
- **Auth requirement**: viewing invite pages requires authentication (redirects to sign-in).
- **Role assignment**: accepting an invite triggers RBAC role assignment with auto-promotion as appropriate.

## Feeds into

- [[features/teams]]
- [[features/team-settings]]
- [[features/projects]]
- [[concepts/security]]
- [[entities/team]], [[entities/project]]
