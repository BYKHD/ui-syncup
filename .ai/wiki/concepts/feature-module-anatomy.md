---
title: Concept — Feature Module Anatomy
type: concept
tags: [features, structure, conventions]
last_updated: 2026-05-01
sources: [sources/steering-structure]
---

# Feature Module Anatomy

Every feature in `src/features/<name>/` follows the same shape. Treat it as a mini-package with a public API exposed through `index.ts` (barrel).

## Standard layout

```
features/<feature>/
├── api/              # Network layer — fetchers + DTO schemas (Zod). No React.
│   ├── get-<resource>.ts
│   ├── create-<resource>.ts
│   ├── update-<resource>.ts
│   ├── delete-<resource>.ts
│   ├── types.ts
│   └── index.ts
├── hooks/            # React Query / SWR hooks; mutations
│   ├── use-<resource>.ts
│   ├── use-create-<resource>.ts
│   └── index.ts
├── components/       # Presentational components
├── screens/          # Screen components — thin, compose hooks
├── types/            # Domain types (PascalCase)
├── utils/            # Feature-specific helpers
└── index.ts          # Public API barrel
```

## Optional dirs (in practice)

- `actions/` — server actions (used by `user-settings`, `email-preview`).
- `config/` — feature-local config (used by `issues`, `projects`).
- `docs/`, `examples/` — feature-local docs/examples (used by `annotations`, `issues`).

## Naming conventions

- Files: kebab-case (`create-issue-dialog.tsx`, `use-issues.ts`).
- Components: PascalCase (`CreateIssueDialog`).
- Hooks: camelCase with `use` prefix.
- API funcs: verb-noun (`getIssues`, `createIssue`).
- Types: PascalCase.
- Constants: UPPER_SNAKE_CASE.

## Reference

The `[[features/folder-scaffold-template]]` directory is the canonical copy-paste template.

## Related

- Concepts: [[concepts/import-rules]], [[concepts/architecture]]
- Sources: [[sources/steering-structure]]
