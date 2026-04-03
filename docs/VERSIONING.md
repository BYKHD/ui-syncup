# Versioning & Release Guide

This project follows [Semantic Versioning](https://semver.org/) (MAJOR.MINOR.PATCH) via **[semantic-release](https://semantic-release.gitbook.io/)**.

---

## Configured Branches

| Branch | Channel | npm dist-tag | Docker tag | Example version |
|---|---|---|---|---|
| `main` | Stable | `latest` | `:latest`, `:vX.Y.Z`, `:vX.Y`, `:vX` | `1.2.3` |
| `release/X.Y` | Release candidate | `rc` | `:rc`, `:vX.Y.Z-rc.N` | `1.2.3-rc.1` |
| `develop` | Beta pre-release | `beta` | `:beta`, `:vX.Y.Z-beta.N` | `1.2.3-beta.1` |
| `alpha` | Alpha pre-release | `alpha` | `:alpha`, `:vX.Y.Z-alpha.N` | `1.2.3-alpha.1` |

---

## Commit Message Format (Conventional Commits)

semantic-release reads your commits to decide the version bump:

| Commit prefix | Version bump | Example |
|---|---|---|
| `fix:` | PATCH | `fix: correct login redirect` |
| `feat:` | MINOR | `feat: add dark mode` |
| `feat!:` or `BREAKING CHANGE:` | MAJOR | `feat!: remove legacy API` |
| `chore:`, `docs:`, `style:`, `refactor:`, `test:` | none | no release |

**You never create tags or edit `package.json` manually.**

---

## Pre-Release Checklists

### Alpha release (`alpha` branch)

Alpha is for early experimental work — not feature-complete, may be unstable.

1. Ensure commits on `alpha` use Conventional Commits format
2. Push directly or merge a feature branch → `alpha`
3. The Release workflow triggers automatically
4. semantic-release bumps to `x.x.x-alpha.N`, creates a GitHub pre-release and tag
5. Docker image is pushed as `:alpha` and `:vx.x.x-alpha.N`
6. CLI is published to npm under `@alpha` dist-tag **only if files under `cli/` changed**

**Verify:** `gh release list --limit 5` should show the new pre-release tag.

---

### Beta release (`develop` branch)

Beta is for feature-complete work undergoing testing before an RC.

1. Ensure commits on `develop` use Conventional Commits format
2. Open a PR from a feature branch (or `alpha`) → `develop`, get checks to pass (`Lint`, `Typecheck`, `Docker Smoke Build`)
3. Merge the PR — the Release workflow triggers automatically on `develop` push
4. semantic-release bumps to `x.x.x-beta.N`, creates a GitHub pre-release and tag
5. Docker image is pushed as `:beta` and `:vx.x.x-beta.N`
6. CLI is published to npm under `@beta` dist-tag **only if files under `cli/` changed**

**Verify:** `gh release list --limit 5` should show the new pre-release tag.

---

### Release candidate (`release/X.Y` branch)

RC is for final stabilization before a stable release. Cut a release branch from `develop` when the feature set is locked.

1. Cut the release branch from `develop`:
   ```bash
   git checkout develop
   git checkout -b release/1.2
   git push origin release/1.2
   ```
2. Only bug-fix commits (`fix:`) should land on this branch
3. Push commits to `release/1.2` — the Release workflow triggers automatically
4. semantic-release bumps to `x.x.x-rc.N`, creates a GitHub pre-release and tag
5. Docker image is pushed as `:rc` and `:vx.x.x-rc.N`
6. CLI is published to npm under `@rc` dist-tag **only if files under `cli/` changed**

**Verify:** `gh release list --limit 5` should show the new pre-release tag.

---

### Stable release (`main` branch)

1. Confirm the latest RC on `release/X.Y` (or beta on `develop`) is tested and ready
2. Open a PR from `release/X.Y` → `main` (or `develop` → `main` if skipping RC)
3. Wait for all required checks to pass: `Lint`, `Typecheck`, `Docker Smoke Build`
4. Merge the PR — the Release workflow triggers on `main` push
5. semantic-release analyzes commits since the last stable tag, bumps version (PATCH/MINOR/MAJOR), creates a GitHub release and updates `CHANGELOG.md`
6. Docker stable image is pushed with `:latest`, `:vX.Y.Z`, `:vX.Y`, `:vX` tags
7. CLI is published to npm under `@latest` dist-tag **only if files under `cli/` changed**
8. `develop` is automatically synced with `main` via a `chore: sync main into develop [skip ci]` merge commit

**Verify:** `gh release list --limit 5` should show the new stable release (no pre-release suffix).

---

## CLI npm Publish Behavior

The CLI (`ui-syncup-cli`) is only published to npm when source files under `cli/` have changed since the last release. This prevents unnecessary npm publishes when only the app (Next.js) code changed.

- The version in `cli/package.json` is **always bumped** to match the release version
- The npm publish step is **conditionally skipped** if no `cli/` files changed
- The dist-tag matches the release channel: `@alpha`, `@beta`, `@rc`, or `@latest`

**Users install the CLI:**
```bash
npm install ui-syncup-cli           # stable
npm install ui-syncup-cli@beta      # beta
npm install ui-syncup-cli@rc        # release candidate
npm install ui-syncup-cli@alpha     # alpha
```

---

## How Releases Work

The pipeline is **commit-driven, not tag-driven**. Pushing to a configured branch triggers semantic-release, which:

1. Analyzes commit messages since the last release on that branch
2. Determines the version bump automatically
3. Creates the git tag, GitHub Release, updates `CHANGELOG.md`, stamps `package.json` versions
4. Then the Docker job builds and pushes the multi-arch image (linux/amd64 + linux/arm64)
5. The CLI publish step runs if `cli/` changed

---

## How the Release Workflow Is Triggered

| Event | When it fires |
|---|---|
| `push` to `main` / `develop` / `alpha` / `release/**` | Immediately when the branch is updated |
| `workflow_dispatch` | Manual fallback via CLI or GitHub UI |

A branch-based concurrency group (`release-${{ github.ref_name }}`) ensures only one release workflow runs per branch at a time. A second push while a release is in progress will queue and run after, never in parallel.

---

## Versioning Rules

- **MAJOR** — incompatible API or breaking changes (`feat!:` or `BREAKING CHANGE:` footer)
- **MINOR** — new backward-compatible functionality (`feat:`)
- **PATCH** — backward-compatible bug fixes (`fix:`)
- **Pre-release** — automatic suffix (`-alpha.N`, `-beta.N`, `-rc.N`) based on the branch

---

## Can I Choose My Own Version Number?

**No — semantic-release owns the version number** based on your commit messages. You control it indirectly:

| You want | Commit to use |
|---|---|
| `0.3.x` patch bump | `fix: ...` |
| `0.x.0` minor bump | `feat: ...` |
| `x.0.0` major bump | `feat!: ...` or `BREAKING CHANGE:` in footer |

**One-time escape hatch:** If you need to force a specific baseline version (e.g. jump to `1.0.0`), manually create a git tag on the last commit before pushing — semantic-release uses the last tag as its starting point. Use this only once to correct a version baseline.

---

## Troubleshooting

### Release workflow ran but version didn't bump

semantic-release found no `fix:` or `feat:` commits since the last release on this branch (only `chore:` etc.).

- Check: `git log vX.X.X..HEAD --oneline` — look for any `fix:` or `feat:` commits
- If none, there is nothing to release (correct behavior)
- If commits exist but release didn't fire, check the Release workflow run logs on GitHub Actions

### PR is blocked ("Cannot update this protected ref")

All required checks must pass on the PR head commit. If checks passed but merge is still blocked:

1. The checks may have run on a previous commit — push an empty commit to retrigger:
   ```bash
   git commit --allow-empty -m "chore: retrigger ci"
   git push origin <branch>
   ```
2. Wait for checks to complete, then merge

### Release job didn't fire after a merge (manual trigger)

```bash
gh workflow run release.yml --branch main          # for stable
gh workflow run release.yml --branch develop       # for beta
gh workflow run release.yml --branch alpha         # for alpha
gh workflow run release.yml --branch release/1.2   # for rc
```

Or go to **GitHub → Actions → Release → Run workflow** and select the branch.

### CLI was not published to npm

The CLI publish is skipped when no files under `cli/` changed since the last release. This is intentional. If you believe it should have published:

1. Check the release workflow run logs — look for the `Check if CLI source changed` step output
2. If `changed=false` but you expected a publish, verify that your CLI changes were committed before the release tag (not after)
