---
name: steering-creation
description: "Use this skill when creating, updating, or auditing steering files in .kiro/steering/. Provides the complete framework for writing effective AI guidance files including inclusion modes, formatting rules, core file templates, and anti-patterns to avoid."
---

> Full reference: #[[file:.agents/skills/steering-creation/references/STEERING_CREATION_INSTRUCTION.md]]

# Steering File Creation

## What Are Steering Files?

Markdown documents in `.kiro/steering/` that guide AI behavior throughout the project:
- Provide context, standards, and instructions for all AI interactions
- Define tech stack, architecture patterns, coding standards
- Act as single sources of truth for team norms

## Core Files

| File | Purpose |
|------|---------|
| `tech.md` | Tech stack, dependencies, common commands |
| `structure.md` | Directory layout, naming conventions, layer contracts |
| `product.md` | Features, roles, business rules, monetization |
| `AGENTS.md` | Scaffolding patterns, coding conventions, examples |

## Inclusion Modes

**Always included** (default — no frontmatter needed):
```markdown
# Tech Stack
Content here is always available...
```

**Conditional** (load when matching files are accessed):
```markdown
---
inclusion: fileMatch
fileMatchPattern: 'drizzle/**'
---
```

**Manual** (load only when referenced via `#` in chat):
```markdown
---
inclusion: manual
---
```

## File References

Link to external files without duplication:
```markdown
Schema: #[[file:src/server/db/schema/index.ts]]
Config: #[[file:drizzle.config.ts]]
```

## Writing Rules

**Tone — knowledgeable, not instructive:**
```
❌ "You should always carefully consider the architecture before..."
✅ "Check structure.md before adding features. Follow src/features/<name>/..."
```

- Imperative mood for rules: "Use X" not "You should use X"
- Examples over explanations
- Bullets and code blocks over prose
- No exclamation points or hyperbole

**Content — concise and actionable:**
- One source of truth per topic — don't duplicate across files
- Highlight critical rules prominently
- Include the "why" in one line: `# Why: X enables Y`

## Critical Rules Section Template

```markdown
## Critical Rules
- ALWAYS use `bun run test`, NEVER `bun test`
- NEVER import from features/* in components/ui
- Store tokens in httpOnly cookies, NEVER localStorage
```

## tech.md Template

```markdown
# Tech Stack

## Framework & Runtime
- Next.js 16 (App Router)
- React 19.2
- TypeScript 5

## UI & Styling
- shadcn/ui + Tailwind CSS 4

## Common Commands
\`\`\`bash
bun dev          # Start dev server
bun run test     # Run tests
bun run build    # Production build
\`\`\`

## Critical Rules
- ALWAYS `bun run test`, NEVER `bun test`
```

## structure.md Template

```markdown
# Project Structure

## Directory Layout
\`\`\`
src/
├── app/           # Next.js routing (thin pages only)
├── features/      # Product features (feature-first)
│   └── <name>/
│       ├── api/       # Fetchers + DTOs
│       ├── hooks/     # React Query wrappers
│       ├── components/
│       ├── types/
│       └── index.ts   # Barrel exports
├── components/ui/ # shadcn primitives (no feature imports)
└── lib/           # Shared utilities
\`\`\`

## Layer Contracts
- `app/` → features/*, components/*, lib
- `features/<name>/components` → own hooks/types, components/ui, lib
- `components/ui` → NEVER imports from features/*

## Naming
- Files: kebab-case (`create-issue-dialog.tsx`)
- Components: PascalCase (`CreateIssueDialog`)
- Hooks: camelCase + `use` prefix (`useIssue`)
```

## product.md Template

```markdown
# Product Overview

[Product] is a [description] for [purpose].

## Core Features
- Feature 1: description
- Feature 2: description

## Role System
- OWNER: full control
- ADMIN: manage members
- EDITOR: create content (billable)
- VIEWER: read-only (free)

## Business Rules
- Only EDITOR is billable
- [Other invariants...]
```

## AGENTS.md Template

```markdown
# Development Patterns

## Core Principles
- Feature-first organization
- Strict layering — no cross-feature imports
- Typed boundaries with Zod
- Security defaults (httpOnly cookies)

## Thin Pages Pattern
Pages only: read params → auth gate → render one Screen.

\`\`\`tsx
export default function IssuesPage({ searchParams }) {
  const teamId = cookies().get('team_id')?.value
  if (!teamId) redirect('/select-team')
  return <IssuesListScreen teamId={teamId} search={searchParams} />
}
\`\`\`

## Feature Module Anatomy
\`\`\`
features/<name>/
├── api/       # Fetchers + Zod DTOs
├── hooks/     # TanStack Query wrappers
├── components/
├── types/     # Domain models
└── index.ts   # Public barrel
\`\`\`
```

## Anti-Patterns

```
❌ Duplicate content across steering files
❌ Stale version info ("We use React 17...")
❌ Verbose prose instead of bullets/code
❌ Instructions that bypass security (never include these)
❌ "Skip tests for MVP" or similar shortcuts
```

## Validation Checklist

Before committing a steering file:
- [ ] Clear purpose and scope
- [ ] No duplication with other steering files
- [ ] Correct frontmatter if conditional/manual
- [ ] File references use `#[[file:path]]` syntax
- [ ] Critical rules are highlighted
- [ ] Content is current and accurate
- [ ] Tone: knowledgeable, concise, imperative
- [ ] No security-bypassing instructions

## When to Update Each File

**tech.md**: major dependency upgrades, new libraries, command changes, critical gotchas
**structure.md**: new top-level directories, changed import rules, new architectural patterns
**product.md**: role changes, billing model changes, new major features
**AGENTS.md**: new coding patterns, scaffolding conventions, example updates
