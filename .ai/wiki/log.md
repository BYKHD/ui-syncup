---
title: Wiki Log
type: log
last_updated: 2026-05-05
---

# Wiki Log

Append-only. Newest entries at the bottom. Each entry starts with `## [YYYY-MM-DD] <op> | <subject>` so `grep "^## \[" log.md` works.

## [2026-05-01] init | wiki bootstrapped
- Created [[WIKI]] schema, [[index]], [[overview]], and this log.
- Layout: `sources/`, `features/`, `concepts/`, `entities/`.
- Seeded from `.ai/steering/{product,structure,tech}.md` and `docs/feature-architectures/*`.

## [2026-05-01] ingest | steering source documents
- Ingested `.ai/steering/product.md` → [[sources/steering-product]].
- Ingested `.ai/steering/structure.md` → [[sources/steering-structure]].
- Ingested `.ai/steering/tech.md` → [[sources/steering-tech]].
- Created [[concepts/rbac-roles]], [[concepts/issue-workflow]], [[concepts/architecture]], [[concepts/tech-stack]], [[concepts/deployment]].

## [2026-05-01] ingest | feature architecture docs
- Ingested 9 docs from `docs/feature-architectures/`.
- Created source pages and integrated into matching feature/concept pages.

## [2026-05-01] ingest | codebase feature crawl
- Walked `src/features/*` and created one feature page per directory (15 features).
- Each page is a *map* into the codebase, not a re-derivation.

## [2026-05-01] init | CLAUDE.md added
- Created `CLAUDE.md` at repo root following Karpathy's LLM Wiki pattern.
- Orients Claude Code to the wiki on session start; embeds the three workflows (ingest, query, lint) and conventions cheat sheet.
- Points at `.ai/wiki/WIKI.md` for full schema and `.ai/wiki/index.md` for the catalog.

## [2026-05-01] refactor | consolidated agent guidance into CLAUDE.md
- Merged the full `AGENTS.md` scaffolding guide into `CLAUDE.md`. `CLAUDE.md` is now the single canonical agent guidance file.
- `AGENTS.md` shrunk to a 3-line pointer at `CLAUDE.md`.
- Replaced `CLAUDE.md` §13 ("Extended Documentation" with dead `docs/architecture/*` links) with pointers into `concepts/` wiki pages.
- Replaced §14 ("Feature Modules" with stale list including `landing`/`onboarding`) with a pointer to the wiki index — the catalog there is correct.
- The redundant `docs/feature-architectures/*` and `docs/development/*` docs were removed from the repo. Annotated all 9 source pages under `.ai/wiki/sources/feature-arch-*` with `original_status: removed (this wiki page is now canonical)` plus a callout note. The wiki source page is now authoritative.

## [2026-05-05] lint | dedup source ↔ concept
- Audit found 7 `feature-arch-*` source pages duplicating their paired concept page (rbac, storage, security, loading, notifications, resource-limits, rate-limit-reset).
- Resolved with option (a): concepts are canonical; source pages slimmed to provenance stubs (identity, scope, `feeds_into`) pointing at the concept page. Source frontmatter `original_status` updated from "this wiki page is now canonical" to "canonical content in [[concepts/X]]".
- Fixed [[index]]: stale `Concepts (12)` header → `(16)`; replaced removed `docs/feature-architectures/*` paths in source descriptions with provenance/canonical pointers.
- No content lost — concept pages already covered every fact in the slimmed sources.

## [2026-05-06] fix | invitation duplicate race review fixes
- Tightened project/team invitation duplicate handling to map only the active-invitation partial unique indexes to duplicate-invitation errors.
- Fixed project invitation create typing so raw database rows are not assigned to the domain `ProjectInvitation` shape.
