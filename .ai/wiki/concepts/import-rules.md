---
title: Concept — Layer Contracts (Import Rules)
type: concept
tags: [architecture, imports, layers]
last_updated: 2026-05-20
sources: [sources/steering-structure]
---

# Layer Contracts (Import Rules)

Strict rules about which layers may import from which. Keeps features decoupled and prevents circular dependencies.

## Rules

| Layer | May import from |
|---|---|
| `app/` | `features/*`, `components/*`, `hooks`, `lib`, `config` |
| `features/<x>/components` & `screens` | own `hooks`, `types`, `utils` + `components/ui`, `components/shared`, `components/layout`, `lib`, `config` |
| `features/<x>/hooks` | own `api`, `types`, `utils` + `lib` |
| `features/<x>/api` | `lib`, own `types`/`utils` (**no React**) |
| `components/ui` | `lib`, `utils` (never `features/*`) |
| `components/shared` | `components/ui`, `lib`, `utils` (never `features/*`) |
| `components/layout` | `features/*`, `components/ui`, `components/shared`, `hooks`, `lib`, `config` — app-shell composition |
| `server/` | server-only — never import from client components |

## Rationale

- **api/** has no React → can be reused on the server (e.g. for SSR prefetch in [[features/issues]]'s `get-project-issues-server.ts`).
- **components/ui** + **components/shared** never import features → safe to reuse anywhere without pulling in feature dependencies.
- **components/layout** is the app-shell composition layer (sidebar, header, notification chrome). It MAY import `features/*` because it renders feature data, and `features/*` MAY import it back (feature screens mount `AppHeaderConfigurator`). It is the single composition layer that sits alongside features — `app/` wires it into the shell.
- **features/** are siblings; one feature may use another only via its public barrel (`features/<x>/index.ts`).

## Path alias

`@/*` → `./src/*`. Use absolute imports across module boundaries; relative imports inside a single feature are fine.

## Related

- Concepts: [[concepts/feature-module-anatomy]], [[concepts/architecture]]
- Sources: [[sources/steering-structure]]
