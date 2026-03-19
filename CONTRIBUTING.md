# Contributing to UI SyncUp

Thank you for contributing! All contributions are welcome.

## Development Setup

```bash
git clone https://github.com/BYKHD/ui-syncup.git
cd ui-syncup
bun install
cp .env.example .env.local
# Fill in required vars (DATABASE_URL, REDIS_URL, etc.)
bun run dev
```

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Effect |
|--------|--------|
| `feat:` | Minor version bump |
| `fix:` | Patch version bump |
| `feat!:` / `BREAKING CHANGE:` | Major version bump |
| `chore:`, `docs:`, `ci:` | No version bump |

## Pull Request Process

1. Fork and create your branch from `main`
2. Run `bun run lint && bun run typecheck && bun run test` — all must pass
3. Open a PR using the PR template
4. Wait for CI to pass and a maintainer review
