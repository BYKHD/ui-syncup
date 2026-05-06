---
title: Wiki Index
type: index
last_updated: 2026-05-05
---

# Wiki Index

Catalog of every page in `.ai/wiki/`. Read this first when answering a query — drill into the most relevant pages from here.

> Schema: [[WIKI]] · Timeline: [[log]] · Synthesis: [[overview]]

## Sources (12)

Pages that summarize raw source documents. The `feature-arch-*` originals were removed from the repo; those pages now exist as provenance pointing at the canonical concept page.

- [[sources/steering-product]] — `.ai/steering/product.md` (product overview, role system, deployment)
- [[sources/steering-structure]] — `.ai/steering/structure.md` (directory layout, layer contracts, naming)
- [[sources/steering-tech]] — `.ai/steering/tech.md` (Next 16 / React 19 / Postgres / S3 / SSE / CLI)
- [[sources/feature-arch-rbac]] — *(original removed; canonical: [[concepts/rbac-roles]])*
- [[sources/feature-arch-invitations]] — *(original removed; provenance only)*
- [[sources/feature-arch-loading]] — *(original removed; canonical: [[concepts/loading-patterns]])*
- [[sources/feature-arch-notifications]] — *(original removed; canonical: [[concepts/realtime-sse]])*
- [[sources/feature-arch-rate-limit-reset]] — *(original removed; canonical: [[concepts/rate-limiting]])*
- [[sources/feature-arch-resource-limits]] — *(original removed; canonical: [[concepts/quotas-and-plans]])*
- [[sources/feature-arch-security]] — *(original removed; canonical: [[concepts/security]])*
- [[sources/feature-arch-storage]] — *(original removed; canonical: [[concepts/storage]])*
- [[sources/feature-arch-teams]] — *(original removed; provenance only — see [[features/teams]])*

## Features (15)

One page per feature module in `src/features/<name>/`.

- [[features/annotations]] — pin/box annotations on attachments + threaded comments
- [[features/auth]] — sign-in/up, password reset, email verify, onboarding, account linking
- [[features/dashboard]] — "my issues" landing surface
- [[features/email-preview]] — dev preview for React Email templates
- [[features/folder-scaffold-template]] — copy-paste template for new features
- [[features/health]] — health-check page + API
- [[features/instance-settings]] — instance-level admin config
- [[features/issues]] — issue tracking, details, share, attachments
- [[features/legal]] — public legal pages
- [[features/notifications]] — real-time SSE notifications (headless)
- [[features/projects]] — project CRUD, members, project invitations
- [[features/setup]] — first-run setup wizard
- [[features/team-settings]] — team admin UI
- [[features/teams]] — team CRUD, switching, team invitations
- [[features/user-settings]] — per-user preferences

## Concepts (16)

Cross-cutting topics referenced by multiple features.

- [[concepts/architecture]] — top-level layout + layered composition
- [[concepts/cli-package]] — `cli/` standalone npm package
- [[concepts/deployment]] — self-host vs managed, required services
- [[concepts/feature-module-anatomy]] — standard layout of a feature module
- [[concepts/import-rules]] — layer contracts (which layer can import what)
- [[concepts/issue-workflow]] — Open → In Progress → In Review → Resolved → Archived
- [[concepts/loading-patterns]] — server-prefetch + container/presentational composition
- [[concepts/proxy]] — Next 16 `src/proxy.ts`
- [[concepts/quotas-and-plans]] — instance-level resource limits
- [[concepts/rate-limiting]] — Redis-backed auth rate limits
- [[concepts/rbac-roles]] — two-tier role model + permissions API
- [[concepts/realtime-sse]] — pg_notify → Redis → SSE pipeline
- [[concepts/security]] — CSP, CORS, headers, HSTS
- [[concepts/storage]] — single-bucket S3-compatible model
- [[concepts/tech-stack]] — runtimes, libraries, conventions
- [[concepts/testing]] — Vitest + PGlite + Playwright

## Entities (5)

Domain nouns referenced across many pages.

- [[entities/annotation]] — pin/box overlay with comment thread
- [[entities/issue]] — feedback unit scoped to a project
- [[entities/project]] — workspace inside a team
- [[entities/team]] — top-level org unit
- [[entities/user]] — authenticated account

## Summary

| Category | Count |
|---|---|
| Sources | 12 |
| Features | 15 |
| Concepts | 16 |
| Entities | 5 |
| Meta (WIKI, index, log, overview) | 4 |
| **Total** | **52** |
