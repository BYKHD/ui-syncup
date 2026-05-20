# UI SyncUp — Agent Instructions

## Project
Self-hostable design QA platform. Next.js App Router + TypeScript + shadcn/ui, Postgres + Drizzle, feature-first architecture. See [.ai/wiki/overview.md](.ai/wiki/overview.md) for full context.

`AGENTS.md` is a pointer to this file. If they diverge, `CLAUDE.md` is canonical.

---

## Wiki protocol

This repo uses an LLM Wiki — a persistent, interlinked knowledge base under `.ai/wiki/` that compounds across sessions. You own everything in it; the human owns raw sources and the questions asked.

**At session start:**
- Read [.ai/wiki/index.md](.ai/wiki/index.md) for the page catalog before answering any query.

**Before touching an area:**
- A feature → read `.ai/wiki/features/<name>.md` if it exists
- Architecture / layering questions → [[concepts/architecture]], [[concepts/import-rules]], [[concepts/feature-module-anatomy]]
- RBAC, auth, permissions → [[concepts/rbac-roles]]
- Issue workflow / state machine → [[concepts/issue-workflow]]
- Storage (S3) → [[concepts/storage]]
- Real-time / SSE → [[concepts/realtime-sse]]
- Security (CSP, CORS, headers) → [[concepts/security]]
- Rate limiting → [[concepts/rate-limiting]]
- Quotas / plans → [[concepts/quotas-and-plans]]
- Deployment / self-host → [[concepts/deployment]]
- CLI package → [[concepts/cli-package]]
- Loading patterns → [[concepts/loading-patterns]]
- Proxy (`src/proxy.ts`) → [[concepts/proxy]]
- Testing → [[concepts/testing]]
- Tech stack → [[concepts/tech-stack]]

**During a session — write when you:**
- Make or discover an architectural decision
- Find a non-obvious constraint or pattern
- Discover a bug that reveals a hidden assumption
- Find that a wiki page is wrong or outdated — fix it
- Synthesize a novel comparison or analysis a future query would ask again — file it as a new `concepts/` page rather than letting it disappear into chat

**Ingest a new source** (something new appears in `.ai/steering/`, `README.md`, etc.):
1. Read it in full; briefly discuss takeaways with the user before writing.
2. Write `.ai/wiki/sources/<slug>.md` — one-paragraph summary, key facts as bullets, `feeds_into` list.
3. Update affected `features/`, `concepts/`, `entities/` pages — revise, add `[[wikilinks]]`, flag contradictions with `> [!warning] Contradiction` blocks (never silently resolve).
4. Update [.ai/wiki/index.md](.ai/wiki/index.md) for new pages.

**At session end:**
- Append a dated entry to [.ai/wiki/log.md](.ai/wiki/log.md): `## [YYYY-MM-DD] <op> | <subject>` so `grep "^## \[" log.md` works.

Full schema and conventions in [.ai/wiki/WIKI.md](.ai/wiki/WIKI.md).

---

## Hard constraints (never violate)

- **`bun run test` only.** Never `bun test` — Bun's native runner ignores Vitest config and can corrupt the local DB.
- **`components/ui` and `components/shared` never import from `features/*`.** Shared UI knows nothing about features. App-shell composition that needs feature data lives in `components/layout` — the one composition layer allowed to import `features/*` (and which `features/*` may import back). See [[concepts/import-rules]].
- **`server/*` never imported from client components.** It's server-only.
- **Pages don't fetch.** `app/*/page.tsx` does auth/tenant gating + Zod validation, then renders one feature `Screen`. Data flows `features/api` → `features/hooks` → `features/components`.
- **Validate every network boundary with Zod.** No untyped DTOs across the wire.
- **Barrels use explicit named exports.** Never `export *` — it breaks tree-shaking and hides circular deps.
- **Mock data lives in `src/mocks/`.** Never in `src/server/`.
- **`docs/feature-architectures/*` and `docs/development/*` are gone.** Their content is canonical in the wiki — don't recreate those files.

## Critical thinking policy

- Do not accept user statements as ground truth automatically.
- If a user's assumption, code logic, or technical claim appears incorrect, flag it explicitly before proceeding.
- Prefer "I disagree because…" over silently implementing wrong assumptions.
- When correcting: explain *why* the user's understanding is off, then provide the correct path.

---

## Naming

- **Files**: kebab-case (`create-issue-dialog.tsx`, `use-issues.ts`)
- **Components**: PascalCase (`CreateIssueDialog`)
- **Hooks**: `useX` (`useIssue`)
- **API callers**: `verb-noun.ts` (`get-issues.ts`, `create-issue.ts`)
- **Path alias**: `@/*` → `./src/*`
- **New feature**: copy [`src/features/folder-scaffold-template/`](src/features/folder-scaffold-template/) and rename.

## Wiki page frontmatter

Every wiki page starts with:

```yaml
---
title: <Page title>
type: source | feature | concept | entity | schema | index | log | overview
tags: [tag1, tag2]
last_updated: YYYY-MM-DD
sources: [sources/steering-product]
---
```

Cross-links use Obsidian-style `[[features/issues]]`, `[[entities/team]]`. Citations are inline: `Issues use a 5-state workflow [[sources/steering-product]].`

Feature pages are **maps, not re-derivations** — list filenames, screen names, public exports. Don't paste code.
