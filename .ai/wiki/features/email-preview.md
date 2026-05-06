---
title: Feature — email-preview
type: feature
tags: [feature, email, dev-tools]
last_updated: 2026-05-01
sources: [sources/steering-tech]
---

# Feature: `email-preview`

Developer-only screen for previewing React Email templates locally.

## Code map

- **screens/** — `email-preview-screen.tsx`
- **actions/** — server actions for rendering templates

Backed by Resend + React Email templates from `src/server/email/templates/`. See [[concepts/tech-stack]].

## Related

- Concepts: [[concepts/tech-stack]]
- Features: [[features/notifications]] (some templates are email versions of in-app notifications)
