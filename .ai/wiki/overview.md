---
title: UI SyncUp — Overview
type: overview
tags: [overview, product]
last_updated: 2026-05-01
sources: [sources/steering-product, sources/steering-structure, sources/steering-tech]
---

# UI SyncUp — Overview

UI SyncUp is a **visual feedback and issue-tracking platform for design-to-development collaboration**. Designers, QA, and developers annotate UI mockups, file issues directly from those annotations, and track them through a workflow until resolved [[sources/steering-product]].

## What it does

- **Visual annotations** — pin-based and box annotations on images and mockups, with threaded comments. See [[features/annotations]].
- **Issue management** — create, track, and resolve UI/UX issues across a fixed workflow (Open → In Progress → In Review → Resolved → Archived). See [[features/issues]] and [[concepts/issue-workflow]].
- **Multi-team workspaces** — projects scoped under teams, with member and role management. See [[features/teams]] and [[features/projects]].
- **Two-tier RBAC** — management roles (OWNER, ADMIN) for team settings + operational roles (EDITOR, MEMBER, VIEWER) for content access. See [[concepts/rbac-roles]].

## Who it's for

- **Designers / QA** create issues and annotate mockups.
- **Developers** view issues, update status, implement fixes.
- **Project managers** assign roles and track progress.
- **Team admins / owners** manage team settings, members, and integrations.

See [[concepts/rbac-roles]] for the full role matrix.

## Architecture in one paragraph

A Next.js 16 App Router application with feature-first directory layout (`src/features/<name>/`), strict layer contracts, PostgreSQL + Drizzle, S3-compatible storage, optional Redis (rate-limit + SSE fan-out), and `better-auth` for sessions. Real-time notifications stream over Server-Sent Events. A standalone CLI (`cli/`) is published independently to npm for self-hosters. See [[concepts/architecture]] and [[concepts/tech-stack]].

## Deployment

MIT-licensed. Self-host via the `ui-syncup` CLI (Docker Compose), or run on managed infra. Requires PostgreSQL; Redis and S3-compatible storage are optional but recommended. See [[concepts/deployment]].

## Where to start

- New here? Read the [[index]] for the full catalog.
- Working on a feature? Open the relevant page under [[features/]].
- Looking for cross-cutting topics (RBAC, security, storage)? See [[concepts/]].
- Want to know what changed and when? See [[log]].
