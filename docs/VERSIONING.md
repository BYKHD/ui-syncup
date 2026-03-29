# Versioning & Release Guide

This project follows [Semantic Versioning](https://semver.org/) (MAJOR.MINOR.PATCH) via **[semantic-release](https://semantic-release.gitbook.io/)**.

---

## Pre-Release Checklist (read this before every release)

### Beta release (develop → npm beta)

1. Make sure all commits on `develop` use Conventional Commits format (`fix:`, `feat:`, etc.)
2. Open a PR from a feature branch → `develop`, get checks to pass (`Lint`, `Typecheck`, `Docker Smoke Build`)
3. Merge the PR — the Release workflow triggers automatically on `develop` push
4. semantic-release bumps the version to `x.x.x-beta.N`, publishes to npm under `beta` dist-tag, creates a GitHub pre-release, and pushes a `chore(release): x.x.x-beta.N [skip ci]` commit back to `develop`
5. Docker pre-release image is built and pushed to `ghcr.io/bykhd/ui-syncup:beta`

**Verify:** `gh release list --limit 3` should show the new pre-release tag.

---

### Stable release (develop → main)

1. Confirm the latest beta on `develop` is tested and ready
2. Open a PR from `develop` → `main`
3. Wait for all 3 required checks to pass: `Lint`, `Typecheck`, `Docker Smoke Build`
4. Merge the PR — the Release workflow triggers on `main` push **and** on the PR closed event (dual trigger for reliability)
5. semantic-release analyzes commits since last stable tag, bumps version (PATCH/MINOR/MAJOR), publishes to npm under `latest`, creates a GitHub release
6. Docker stable image is built and pushed with `latest`, `vX.Y.Z`, `vX.Y`, `vX` tags
7. semantic-release pushes `chore(release): x.x.x [skip ci]` back to `main`

**Verify:** `gh release list --limit 3` should show the new stable release (no `-beta` suffix).

---

### If the release workflow ran but stable version didn't bump

This means semantic-release found no `fix:` or `feat:` commits since the last stable tag (only `chore:` etc.).

- Check: `git log vX.X.X..main --oneline` — look for any `fix:` or `feat:` commits
- If none, there is nothing to release (correct behavior)
- If commits exist but release didn't fire, check the Release workflow run logs on GitHub Actions

### If the PR is blocked ("Cannot update this protected ref")

All 3 required checks must pass on the PR head commit. If checks passed but merge is still blocked:

1. The checks may have run on a previous commit — push an empty commit to retrigger:
   ```bash
   git commit --allow-empty -m "chore: retrigger ci"
   git push origin develop
   ```
2. Wait for checks to complete, then merge

### If the release job didn't fire after a merge (manual trigger)

The Release workflow has two triggers — `push` and `pull_request: closed` — so a dropped event from GitHub is automatically covered by the second path. If both are missed (rare), trigger manually:

```bash
gh workflow run release.yml --branch main   # for stable
gh workflow run release.yml --branch develop  # for beta
```

Or go to **GitHub → Actions → Release → Run workflow** and select the branch.

---

## How Releases Work

The pipeline is **commit-driven, not tag-driven**. Pushing to a configured branch (or merging a PR into one) triggers semantic-release, which:

1. Analyzes commit messages since the last release
2. Determines the version bump automatically
3. Creates the git tag, GitHub Release, updates `CHANGELOG.md`, stamps `package.json` versions, and publishes to npm
4. Then the Docker job builds and pushes the multi-arch image

**You never create tags or edit `package.json` manually.**

---

## How the Release Workflow Is Triggered

The Release workflow fires on two independent event paths to guard against GitHub dropping a push event:

| Event | When it fires |
|---|---|
| `push` to `main` / `develop` | Immediately when the branch is updated |
| `pull_request: closed` on `main` / `develop` | When the PR is merged (different GitHub event path) |
| `workflow_dispatch` | Manual fallback via CLI or GitHub UI |

A SHA-based concurrency group (`release-${{ github.sha }}`) ensures that if both events fire for the same merge commit, the second run queues and exits immediately once it sees the first already completed.

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
