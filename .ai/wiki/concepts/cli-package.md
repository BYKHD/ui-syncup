---
title: Concept — CLI Package
type: concept
tags: [cli, npm, build, self-host, tsup]
last_updated: 2026-05-01
sources: [sources/steering-tech, sources/steering-structure]
---

# CLI Package (`cli/`)

A standalone npm package published independently of the Next.js app. Bootstraps and operates a self-hosted UI SyncUp instance.

## Layout

```
cli/
├── index.ts              # Entry — shebang #!/usr/bin/env node
├── commands/             # init, up, down, reset, purge
├── lib/                  # ui, prompts, docker, supabase utilities
├── templates/            # Config templates copied by `ui-syncup init`
├── package.json          # Standalone manifest. NOT private. "bin": ui-syncup
├── tsup.config.ts        # Bundles → dist/index.js (CJS, Node 20)
├── .npmignore            # Excludes TS source + tests
└── dist/index.js         # GENERATED — what npm users actually run
```

## Build & publish

```bash
cd cli
bun run build              # tsup → dist/index.js
npm publish --dry-run      # preview tarball
npm publish --access public
```

Local testing: `cd cli && npm link && ui-syncup --help`.

## Notable build details

- **`commander` is external** — listed as a runtime `dependency` because its dual ESM/CJS exports cause class-instance conflicts when bundled.
- All other deps (`dotenv`, `postgres`, `zod`) are bundled.
- `shims: true` in `tsup.config.ts` to support `import.meta.url` in CJS.
- **Template path resolution** — `findTemplatePath()` in `cli/lib/filesystem.ts` checks `__dirname/../templates/` (bundled) before falling back to dev source layout.
- **Version resolution** — `getVersion()` in `cli/lib/constants.ts` searches candidate `package.json` paths in bundled-then-dev order.

## Related

- Concepts: [[concepts/deployment]], [[concepts/tech-stack]]
- Features: [[features/setup]]
- Sources: [[sources/steering-tech]]
