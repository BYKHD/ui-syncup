---
title: Source — .ai/steering/structure.md
type: source
tags: [source, steering, architecture]
last_updated: 2026-05-01
source_path: .ai/steering/structure.md
---

# Source: `.ai/steering/structure.md`

Steering doc that defines the directory layout, layer contracts, naming conventions, and feature-module anatomy. Canonical for *how the codebase is organized*.

## Key facts

- **Feature-first architecture**: `src/features/<name>/` as mini-packages; routing in `src/app/` is thin.
- **Top-level dirs**: `app/`, `features/`, `components/{ui,shared}/`, `config/`, `lib/`, `server/`, `mocks/`, `hooks/`, `providers/`, `styles/`, `types/`, plus a standalone `cli/` package.
- **Proxy** (Next 16): logic lives in `src/proxy.ts`, not `middleware.ts`. Treat it as a last-resort HTTP boundary; keep stateless and fast.
- **Layer contracts (import rules)**:
  - `app/` may import features, components, hooks, lib, config.
  - `features/<x>/components` may import own hooks/types/utils + shared UI/lib/config.
  - `features/<x>/hooks` may import own api/types/utils + lib.
  - `features/<x>/api` may import only lib + own types/utils (no React).
  - `components/ui` and `components/shared` never import `features/*`.
  - `server/` is server-only.
- **Feature module anatomy**: `api/`, `hooks/`, `components/`, `screens/`, `types/`, `utils/`, `index.ts` (barrel).
- **Page structure**: thin pages — read params, auth gate, light Zod, render one feature Screen.
- **Naming**: kebab-case files, PascalCase components, `use*` hooks, verb-noun API funcs, UPPER_SNAKE_CASE constants.
- **RBAC source of truth**: `config/roles.ts` ↔ `server/auth/rbac.ts` ↔ `features/auth/hooks/use-session.ts`.
- **Mock data**: `src/mocks/*.fixtures.ts`; tied to feature-level Zod DTOs.
- **Tests**: co-located `__tests__/`, E2E under `tests/e2e/`, property-based as `*.property.test.ts`.

## Feeds into

- [[concepts/architecture]]
- [[concepts/feature-module-anatomy]]
- [[concepts/import-rules]]
- All `[[features/*]]` skeleton pages
- [[concepts/proxy]]
