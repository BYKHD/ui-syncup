---
title: Concept — Project Access Requests
type: concept
tags: [access-requests, projects, rbac, invitations]
last_updated: 2026-05-07
sources: []
---

# Project Access Requests

User-initiated requests to join a private project. Triggered when a signed-in non-member visits a shared issue link.

## Lifecycle

`pending → approved | declined | superseded | cancelled`

- **pending** — request created, awaiting decision.
- **approved** — approver granted access; requester now `PROJECT_VIEWER`. The member service ensures a baseline team operational role if absent.
- **declined** — approver denied; requester sees neutral message; 7-day cooldown via `declineCooldownUntil`.
- **superseded** — requester realized membership via another path (invitation accepted, public-project join). Idempotent.
- **cancelled** — requester self-cancelled before any decision.

## Race-safety

Partial unique index `project_access_requests_pending_unique_idx` on `(project_id, requester_user_id) WHERE status = 'pending'` enforces one-pending-per-pair. Mirrors `project_invitations.activeInvitationUniqueIdx`. See [[features/projects]].

## Approvers

`PROJECT_OWNER` + `PROJECT_EDITOR` per [[concepts/rbac-roles]]. Granted project role on approval is always `PROJECT_VIEWER` (approver can promote later).

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
