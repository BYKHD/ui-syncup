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

**Ingest a new source** — trigger on something *appearing* in `.ai/steering/`, `README.md`, etc., not just on being asked. Follow the steps in [.ai/wiki/WIKI.md](.ai/wiki/WIKI.md) § Workflows → Ingest. Never silently resolve a contradiction between sources — flag it.

**At session end:**
- Append a dated entry to [.ai/wiki/log.md](.ai/wiki/log.md): `## [YYYY-MM-DD] <op> | <subject>` so `grep "^## \[" log.md` works.

Full schema and conventions in [.ai/wiki/WIKI.md](.ai/wiki/WIKI.md).

---

## Hard constraints (never violate)

- **`bun run test` only.** Never `bun test` — Bun's native runner ignores Vitest config and can corrupt the local DB.
- **Unit tests are `*.test.ts(x)` only.** `vitest.config.ts` lists `*.spec.ts` in `include` but then excludes it (reserved for Playwright `tests/e2e/`). A `.spec.ts` unit test silently never runs and the suite still reports green.
- **Schema change ⇒ `bun run db:generate` before `bun run test`.** The PGlite test DB is built by replaying `drizzle/*.sql`, not the Drizzle TS schema — skip it and every DB test fails with a bogus `column "x" does not exist`.
- **Never `bun run db:push`.** It writes the schema without recording in `drizzle.__drizzle_migrations`, so the next `db:migrate` replays `0000_init.sql` and aborts. `db:migrate:sync` will *not* rescue you — its checks are keyed to migration filenames that no longer exist. Always `db:generate` → `db:migrate`.
- **`components/ui` and `components/shared` never import from `features/*`.** Shared UI knows nothing about features. App-shell composition that needs feature data lives in `components/layout` — the one composition layer allowed to import `features/*` (and which `features/*` may import back). See [[concepts/import-rules]].
- **`server/*` never imported from client components.** It's server-only.
- **Pages don't fetch.** `app/*/page.tsx` does auth/tenant gating + Zod validation, then renders one feature `Screen`. Data flows `features/api` → `features/hooks` → `features/components`. *Known debt (don't copy): the `team/settings` route family runs raw Drizzle, and `[projectSlug]`/`issue/[issueKey]` call `fetch` inline.*
- **Validate every network boundary with Zod.** No untyped DTOs across the wire. *Known debt (don't copy): `features/issues/api/*` validates nothing, and `lib/api-client.ts` casts responses rather than parsing them.*
- **Barrels use explicit named exports.** Never `export *` — it breaks tree-shaking and hides circular deps. *Known debt (don't copy): 14 barrels still use it, incl. `src/mocks/index.ts` and several `features/*/index.ts`.*
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
- **New feature**: copy [`src/features/folder-scaffold-template/`](src/features/folder-scaffold-template/) and rename.
