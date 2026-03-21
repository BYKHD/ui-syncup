# Versioning & Release Guide

This project follows [Semantic Versioning](https://semver.org/) (MAJOR.MINOR.PATCH) via **[semantic-release](https://semantic-release.gitbook.io/)**.

---

## How Releases Work

The pipeline is **commit-driven, not tag-driven**. Pushing to a configured branch triggers semantic-release, which:

1. Analyzes commit messages since the last release
2. Determines the version bump automatically
3. Creates the git tag, GitHub Release, updates `CHANGELOG.md`, stamps `package.json` versions, and publishes to npm
4. Then the Docker job builds and pushes the multi-arch image

**You never create tags or edit `package.json` manually.**

---

## Configured Branches

| Branch | Release type | npm dist-tag | Example version |
|---|---|---|---|
| `main` | Stable | `latest` | `1.2.3` |
| `develop` | Beta pre-release | `beta` | `1.2.3-beta.1` |

---

## Commit Message Format (Conventional Commits)

semantic-release reads your commits to decide the version bump:

| Commit prefix | Version bump | Example |
|---|---|---|
| `fix:` | PATCH | `fix: correct login redirect` |
| `feat:` | MINOR | `feat: add dark mode` |
| `feat!:` or `BREAKING CHANGE:` | MAJOR | `feat!: remove legacy API` |
| `chore:`, `docs:`, `style:`, `refactor:`, `test:` | none | no release |

---

## Stable Release (push to `main`)

```bash
# Make sure your commits use Conventional Commits format, then:
git push origin main
```

semantic-release handles the rest — no tagging needed.

---

## Beta Release (push to `develop`)

> Requires `develop` to be added to the `branches` list in `.releaserc.json` — see below.

```bash
git push origin develop
```

This publishes a `1.2.3-beta.1` pre-release to npm under the `beta` dist-tag and creates a pre-release on GitHub. Docker is **not** built for pre-releases (only stable releases trigger the docker job).

---

## `src/config/version.ts` — Auto-Updated by CI

`version.ts` is **automatically stamped by semantic-release** via `@semantic-release/exec` — you do not need to edit it manually. CI updates it, commits it, and pushes it back as part of the release commit.

---

## Manual Steps Before Releasing

Only **`src/config/changelog.ts`** requires a manual update before pushing. Add a new entry (newest first):

```typescript
{
  version: '0.4.0',
  date: '2026-03-22',
  title: 'New Feature Release',
  description: 'Short summary.',
  changes: [
    { type: 'feature', text: 'Added X.' },
    { type: 'fix', text: 'Fixed Y.' }
  ]
},
```

Then commit and push:

```bash
git add src/config/changelog.ts
git commit -m "chore: update changelog for 0.4.0"
git push origin main   # or develop for a beta
```

---

## Versioning Rules

- **MAJOR** — incompatible API or breaking changes (`feat!:` or `BREAKING CHANGE:` footer)
- **MINOR** — new backward-compatible functionality (`feat:`)
- **PATCH** — backward-compatible bug fixes (`fix:`)
- **Pre-release** — automatic suffix (`-beta.N`) when releasing from `develop`

---

## Can I Choose My Own Version Number?

**No — semantic-release owns the version number** based on your commit messages. You control it indirectly:

| You want | Commit to use |
|---|---|
| `0.3.x` patch bump | `fix: ...` |
| `0.x.0` minor bump | `feat: ...` |
| `x.0.0` major bump | `feat!: ...` or `BREAKING CHANGE:` in footer |

**One-time escape hatch:** If you need to force a specific baseline version (e.g. jump to `1.0.0`), manually create a git tag on the last commit before pushing — semantic-release uses the last tag as its starting point. This is not a regular workflow, use it only once to correct a version baseline.
