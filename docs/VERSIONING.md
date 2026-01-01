# Versioning & Release Guide

This project follows [Semantic Versioning](https://semver.org/) (MAJOR.MINOR.PATCH).

## Quick Start

1. **Update Version**: Bump `APP_VERSION` in `src/config/version.ts`.
2. **Update Changelog**: Add a new entry to `src/config/changelog.ts`.
3. **Commit & Tag**: Follow the Git conventions below.

## Versioning Rules

- **MAJOR** version when you make incompatible API changes.
- **MINOR** version when you add functionality in a backward compatible manner.
- **PATCH** version when you make backward compatible bug fixes.

## Git Tagging Conventions

We use git tags to mark release points in our history.

### Tag Format
Tags effectively should match the version number with a `v` prefix.

- Format: `vX.Y.Z`
- Example: `v1.0.0`, `v0.1.0`, `v1.2.3`

### release Workflow

1. Prepare the release commit:
   ```bash
   # Update files first
   git add src/config/version.ts src/config/changelog.ts
   git commit -m "chore(release): bump version to v0.1.1"
   ```

2. Create the tag:
   ```bash
   git tag -a v0.1.1 -m "Release v0.1.1"
   ```

3. Push changes and tags:
   ```bash
   git push origin main
   git push origin v0.1.1
   ```

## Adding Changelog Entries

Edit `src/config/changelog.ts` and add a new object to the `changelogData` array at the top (newest first).

```typescript
{
  version: '0.2.0',
  date: '2025-01-15',
  title: 'New Feature Release',
  description: 'Added dark mode support.',
  changes: [
    { type: 'feature', text: 'Dark mode toggle added to settings.' },
    { type: 'fix', text: 'Fixed login button alignment.' }
  ]
},
```
