---
title: Wiki Schema & Conventions
description: How LLM agents should read, write, and maintain this wiki
type: schema
last_updated: 2026-05-01
---

# UI SyncUp Wiki — Schema & Operating Manual

This file is the operating manual for any LLM agent working with `.ai/wiki/`. Read it before reading or writing any wiki page.

## Purpose

The wiki is a persistent, LLM-maintained knowledge base for the UI SyncUp project. It compounds over time: every source ingested, every question answered, and every connection discovered is integrated back into a structured collection of markdown pages. The agent does the bookkeeping (summarizing, cross-referencing, filing, reconciling); the human curates sources and asks questions.

This is **not RAG**. The wiki is a first-class artifact, not a query-time index. Source documents live untouched in their original locations (`.ai/steering/`, `docs/`, `src/features/`) — wiki pages are derived, interlinked summaries that stay current.

## Layout

```
.ai/wiki/
├── WIKI.md         # This file. Schema and conventions.
├── index.md        # Catalog of every page, grouped by category. Read this FIRST when answering a query.
├── log.md          # Append-only chronological record. One entry per ingest/query/lint.
├── overview.md     # Synthesized "what is UI SyncUp" page.
├── sources/        # One page per ingested raw source. 1:1 with the original document.
├── features/       # One page per feature module in src/features/*. Map into the codebase.
├── concepts/       # Cross-cutting topics that span features (RBAC, workflow, security, etc.).
└── entities/       # Domain nouns (Team, Project, Issue, User, Annotation, ...).
```

**Folder rules:**
- `sources/` — created on ingest; never modified after the source itself changes.
- `features/` — mirrors `src/features/<name>/`. One page per feature directory.
- `concepts/` — concepts referenced by 2+ features OR called out in steering docs.
- `entities/` — domain nouns referenced in 3+ pages.

## Page conventions

Every page starts with YAML frontmatter:

```yaml
---
title: <Page title>
type: source | feature | concept | entity | schema | index | log | overview
tags: [tag1, tag2]
last_updated: YYYY-MM-DD
sources: [sources/steering-product, sources/feature-arch-rbac]   # which source pages this page draws from
---
```

**Cross-references** use Obsidian-style wikilinks: `[[features/issues]]`, `[[entities/team]]`. They are readable as plain text and clickable in Obsidian.

**Source citations.** When a claim originates from a specific source, mark it inline: `Issues have five workflow states [[sources/steering-product]].`

**Contradictions.** When two sources disagree, do not silently resolve. Use a callout:
```markdown
> [!warning] Contradiction
> [[sources/steering-product]] says X. [[sources/feature-arch-rbac]] says Y. Newer source wins until reconciled.
```

**No code-derivation.** Feature pages are *maps into the codebase*, not re-derivations of code. List filenames, screen names, and public exports. Do not paste code or re-document what `index.ts` already exports.

## Workflows

### Ingest

When the user adds a new source (or asks to ingest one):

1. Read the raw source in full.
2. Briefly discuss the key takeaways with the user before writing.
3. Write `sources/<slug>.md` — a one-paragraph summary, key facts as bullets, and a `feeds_into` list.
4. Update affected `features/`, `concepts/`, `entities/` pages — add/revise content, add wikilinks, flag contradictions.
5. Update `index.md` to list any new pages.
6. Append one entry to `log.md`: `## [YYYY-MM-DD] ingest | <source title>`.

A single source typically touches 5–15 pages.

### Query

When the user asks a question:

1. Read `index.md` first to find candidate pages.
2. Drill into 2–5 of the most relevant pages.
3. Answer with inline citations to source pages.
4. If the answer is novel synthesis (a comparison, a new connection, a derived analysis), offer to file it as a new page in `concepts/` or as a standalone synthesis.
5. Append a log entry only if you filed a new page or made changes.

### Lint

When asked to health-check the wiki:

- Find contradictions across pages.
- Flag stale claims (sources superseded by newer ones).
- Find orphan pages (no inbound wikilinks).
- Find concepts mentioned in 3+ pages without their own page.
- Find missing cross-references where two pages clearly relate.
- Suggest data gaps that could be filled by a new source.

Report as a checklist. Do not auto-fix without confirmation.

## Log entry format

Every log entry starts with the same prefix so `grep "^## \[" log.md` parses cleanly:

```
## [YYYY-MM-DD] <op> | <subject>
- <bullet>
- <bullet>
```

Valid `<op>` values: `init`, `ingest`, `query`, `lint`, `refactor`.

## Ownership

- **LLM owns:** every file under `.ai/wiki/`. Creates, updates, deletes pages. Maintains cross-references and the index.
- **Human owns:** raw sources, the questions asked, the direction of investigation. The human reads the wiki; the LLM writes it.

## What this wiki is not

- Not a documentation site for end users (that's `README.md`, `docs/`).
- Not a replacement for the steering files in `.ai/steering/` (those are still the canonical product/structure/tech directives).
- Not a code reference (the codebase is the truth — feature pages just point into it).
