# Versioning & Release Guide

This project follows [Semantic Versioning](https://semver.org/) (MAJOR.MINOR.PATCH).

## How to Release

The release pipeline is **fully tag-driven**. Pushing a git tag triggers all publishing automatically — Docker, npm, and GitHub Release.

### Stable release

```bash
git tag v0.4.0
git push origin v0.4.0
```

### Pre-release (alpha / beta / rc)

```bash
git tag v0.4.0-alpha-1
git push origin v0.4.0-alpha-1
```

That's it. The workflow handles everything else.

---

## What the Workflow Does Automatically

| Step | Stable (`v0.4.0`) | Pre-release (`v0.4.0-alpha-1`) |
|---|---|---|
| Docker tags pushed | `:latest`, `:v0.4.0`, `:v0.4`, `:v0` | `:v0.4.0-alpha-1` only |
| npm dist-tag | `latest` | `alpha` (label extracted from tag) |
| `cli/package.json` version | Stamped from tag automatically | Stamped from tag automatically |
| GitHub Release | Stable | Marked as pre-release |

You **never need to edit** `cli/package.json` manually — the CI stamps it before publishing.

---

## Versioning Rules

- **MAJOR** — incompatible API or breaking changes
- **MINOR** — new backward-compatible functionality
- **PATCH** — backward-compatible bug fixes
- **Pre-release suffix** — append `-alpha-N`, `-beta-N`, or `-rc-N` for pre-releases

---

## Manual Steps Before Tagging

These files are not touched by CI and should be updated in a commit before tagging:

1. **`src/config/version.ts`** — bump `APP_VERSION`
2. **`src/config/changelog.ts`** — add a new entry to `changelogData` (newest first)

```typescript
{
  version: '0.4.0',
  date: '2026-03-20',
  title: 'New Feature Release',
  description: 'Short summary.',
  changes: [
    { type: 'feature', text: 'Added X.' },
    { type: 'fix', text: 'Fixed Y.' }
  ]
},
```

Then commit and tag:

```bash
git add src/config/version.ts src/config/changelog.ts
git commit -m "chore(release): bump version to v0.4.0"
git tag v0.4.0
git push origin main
git push origin v0.4.0
```
