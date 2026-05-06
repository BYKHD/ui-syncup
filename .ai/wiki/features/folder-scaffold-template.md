---
title: Feature — folder-scaffold-template
type: feature
tags: [feature, scaffold, template, dev-tools]
last_updated: 2026-05-01
sources: [sources/steering-structure]
---

# Feature: `folder-scaffold-template`

Reference template for a feature module's folder layout. **Not a runtime feature** — used as a copy-paste starting point when scaffolding a new feature in `src/features/`.

## Code map

Has the canonical subfolders (`api/`, `components/`, `hooks/`, `screens/`, `types/`, `utils/`) and an `index.ts` barrel. Mirrors the structure documented in [[concepts/feature-module-anatomy]].

## Usage

When creating a new feature, copy this folder, rename, and fill in the implementations. Keep the layer contracts from [[concepts/import-rules]].

## Related

- Concepts: [[concepts/feature-module-anatomy]], [[concepts/import-rules]]
