# Steering File Creation Guide (Brief)

> Condensed guide for creating effective steering files in `.kiro/steering/`. Derived from system instructions.

## What Are Steering Files?

Markdown documents that provide context, standards, and instructions for AI assistance. They're automatically included based on inclusion mode and serve as single sources of truth.

**Hierarchy**: User request > Workspace steering > Global rules

## Location & Inclusion Modes

```
.kiro/steering/
├── tech.md              # Always included (default)
├── structure.md         # Always included
├── product.md           # Always included
├── AGENTS.md            # Always included
└── custom.md            # Conditional or manual
```

**Three modes:**
1. **Always** (default): No front-matter needed
2. **Conditional**: `inclusion: fileMatch` + `fileMatchPattern: 'pattern'`
3. **Manual**: `inclusion: manual` (user types `#filename`)

**File references**: `#[[file:path/to/file.ext]]`

## Core Files Structure

### tech.md - Technology Stack
```markdown
# Tech Stack

## Framework & Runtime
- Next.js 16, React 19.2, TypeScript 5, Node 20 LTS

## UI & Styling
- shadcn/ui, Tailwind CSS 4, Framer Motion

## Data & State
- TanStack Query 5, Zod validation

## Database
- PostgreSQL 15, Drizzle ORM, Supabase

## Commands
bun dev                 # Start dev
bun run test           # Run tests (NOT 'bun test')
bun run db:migrate     # Migrations

## Critical Rules
- ⚠️ ALWAYS `bun run test`, NEVER `bun test` (corrupts DB)
- Tests use in-memory DB by default
```

### structure.md - Project Organization
```markdown
# Project Structure

## Directory Layout
src/
├── app/                    # Next.js routing
├── features/<name>/        # Product features
│   ├── api/               # Fetchers + DTOs
│   ├── hooks/             # React Query wrappers
│   ├── components/        # Feature UI
│   ├── screens/           # Screen components
│   └── types/             # Domain models
├── components/
│   ├── ui/                # shadcn primitives
│   └── shared/            # Cross-feature widgets
├── lib/                   # App utilities
├── server/                # Server-only logic
└── config/                # Single sources of truth

## Layer Contracts
- app/ imports: features/*, components/*, lib, config
- features/<name>/components imports: own hooks/types/utils, components/ui, lib
- components/ui NEVER imports features/*

## Naming
- Files: kebab-case (create-issue-dialog.tsx)
- Components: PascalCase (CreateIssueDialog)
- Hooks: camelCase with use prefix (useIssue)
```

### product.md - Product Overview
```markdown
# Product Overview

[Product] is a [description] platform for [purpose].

## Core Features
- Feature 1, Feature 2, Feature 3

## Role System
### Management Roles (Team Settings)
- OWNER: Full control, can delete team
- ADMIN: Manage members, cannot delete team

### Operational Roles (Content & Billing)
- EDITOR: Create content (billable $X/month)
- MEMBER: View and comment (free)
- VIEWER: Read-only (free)

## Business Rules
- Only EDITOR role is billable
- Management roles NOT billable by themselves
- PROJECT_OWNER/PROJECT_EDITOR auto-promote to EDITOR

## Monetization
Pro plan: $X/month per EDITOR
```

### AGENTS.md - Development Patterns
```markdown
# Scaffolding Guide

## Core Principles
- Feature-first organization
- Strict layering
- Typed boundaries with Zod
- Security defaults (httpOnly cookies)

## Feature Module Anatomy
features/<name>/
├── api/          # Fetchers + DTO schemas
├── hooks/        # React Query wrappers
├── components/   # Feature UI
├── types/        # Domain models
└── index.ts      # Barrel exports

## Thin Pages Pattern
1. Read searchParams, cookies, headers
2. Perform auth/tenant gating
3. Light Zod validation
4. Render single feature Screen

\`\`\`tsx
export default function Page({ searchParams }) {
  const teamId = cookies().get('team_id')?.value
  if (!teamId) redirect('/select-team')
  return <FeatureScreen teamId={teamId} search={searchParams} />
}
\`\`\`
```

## AI Response Style Alignment

**Communication Principles:**
- Knowledgeable, not instructive
- Speak like a dev
- Decisive, precise, clear
- Supportive, not authoritative
- Concise and direct
- Show, don't tell

**Steering Tone:**
```markdown
❌ "You should always carefully consider architecture before implementing..."
✅ "Check structure.md before adding features. Follow feature-first pattern."
```

- Use imperative: "Use X" not "You should use X"
- Brief context: "Why: X enables Y"
- Examples over explanations
- Scannable with bullets/code blocks
- No exclamation points or hyperbole

## Critical Rules from System Instructions

### Security & Privacy
✅ httpOnly cookies for tokens, Zod validation, parameterized queries
❌ Bypass security, store secrets in code

### Code Quality
✅ Minimal code, getDiagnostics for type checking, DRY principles
❌ Copy-paste everywhere, skip error handling

### Testing
✅ `bun run test` (Vitest), property-based tests for invariants
❌ `bun test` (FORBIDDEN - corrupts DB), skip tests

### File Operations
✅ fsWrite for new files, strReplace for edits, fsAppend for additions
❌ Bash to create files, pipe output, manual mkdir

### Long-Running Commands
✅ controlBashProcess for dev servers, --run flag for single test execution
❌ `npm run dev` in bash, `jest --watch`, servers with executeBash

## Best Practices

1. **Be Concise**: Focus on what devs need, use code snippets
2. **Single Source of Truth**: Don't duplicate, reference with `#[[file:path]]`
3. **Keep Focused**: Clear purpose per file, split large topics
4. **Update Regularly**: Sync with codebase, document new patterns
5. **Clear Formatting**: Headers, code blocks, lists, tables
6. **Highlight Critical Rules**: Use ⚠️ for common mistakes
7. **Provide Context**: Brief "why" explanations
8. **Align with AI Core**: Complement, never contradict system instructions
9. **Maintenance Strategy**: Document when to update each file

## Kiro-Specific Features

### Autopilot vs Supervised
- Autopilot: AI modifies autonomously
- Supervised: User reviews first

### Chat Context
- `#File` / `#Folder` - Specific files/folders
- `#Problems` - Current file issues
- `#Terminal` - Terminal output
- `#Git Diff` - Current changes
- `#Codebase` - Whole codebase search

### Agent Hooks
Automated workflows on events (save, test, etc.)
Configure: Agent Hooks panel or `.kiro/hooks/`

### MCP (Model Context Protocol)
Guide MCP server usage in steering:
```markdown
## Database Operations
- mcp_supabase_local_execute_sql - Run queries
- mcp_supabase_local_list_tables - List tables
Config: .kiro/settings/mcp.json
```

## Custom Steering Examples

### Domain-Specific (Conditional)
```markdown
---
inclusion: fileMatch
fileMatchPattern: '**/billing/**'
---
# Payment Processing Guide
[Guidelines for payment integration...]
```

### Deployment (Manual)
```markdown
---
inclusion: manual
---
# Deployment Checklist
1. Run full test suite
2. Check environment variables
3. Review database migrations
```

### API Standards
```markdown
# API Design Standards

## REST Conventions
- Plural nouns for collections
- Correct HTTP methods
- Appropriate status codes

## Error Responses
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": []
  }
}
```

## Anti-Patterns

❌ **Duplicate docs**: Repeating package.json scripts
✅ **Reference source**: "See package.json for commands"

❌ **Verbose prose**: "In order to create a feature, you should first consider..."
✅ **Direct**: "Create features in `src/features/<name>/` with api/, hooks/, components/"

❌ **Outdated info**: "We use React 17 with class components"
✅ **Current**: "React 19.2 with function components. See package.json for versions"

## Validation Checklist

- [ ] Clear purpose and scope
- [ ] Concise and actionable
- [ ] Correct code examples
- [ ] No duplication
- [ ] Proper front-matter if conditional/manual
- [ ] File references use `#[[file:path]]`
- [ ] Critical rules highlighted with ⚠️
- [ ] Current and accurate
- [ ] Consistent formatting
- [ ] Follows project conventions
- [ ] Aligns with AI core principles
- [ ] Knowledgeable tone (not instructive)
- [ ] No hyperbole or excessive punctuation

## Example: Database Migration Steering

```markdown
---
inclusion: fileMatch
fileMatchPattern: 'drizzle/**'
---

# Database Migration Guide

## Creating Migrations
bun run db:generate

## Naming
- 0001_create_users_table.sql
- 0002_add_email_verification.sql

## Rules
1. Never modify existing migrations
2. Test locally first
3. Include rollback documentation
4. Use transactions
5. Validate before deploying

## Running
Local: bun run db:migrate
Production: bun run db:migrate:prod

## Common Patterns

### Add Column
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;

### Create Index
CREATE INDEX idx_users_email ON users(email);

### Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own" ON notifications FOR SELECT USING (auth.uid() = user_id);

## Troubleshooting
- Migration fails: Check syntax, rollback, fix, retry
- Constraint violation: Ensure data compatibility first
- Performance: Add indexes, use batching

## References
- Schema: #[[file:src/server/db/schema/index.ts]]
- Config: #[[file:drizzle.config.ts]]
```

## Related Documentation

**Specification Workflow** (different from steering):
- `docs/spec/AI_SPECIFICATION_WORKFLOW.md` - Feature specs (requirements, design, tasks)
- `.kiro/specs/` - Example specifications

**When to Use:**
- **Steering**: Tech stack, architecture, coding standards, project structure
- **Specs**: New features, complex implementations, formal requirements

**Both support**: `#[[file:path]]` for shared documentation

## Quick Reference

**AI Processing:**
1. Context Loading (always → conditional → manual)
2. Priority Assessment (user > workspace > global)
3. Conflict Resolution (specific > general, recent > old)

**Update Triggers:**
- tech.md: Dependency upgrades, new libraries, testing changes, command changes
- structure.md: New directories, import rule changes, architectural patterns
- product.md: Role changes, billing changes, major features, business rules
- AGENTS.md: New patterns, scaffolding changes, best practice updates

**Remember**: Steering files are living documents. Update as project evolves.

---

**See Also:**
- `.kiro/steering/tech.md` - Current tech stack
- `.kiro/steering/structure.md` - Current structure
- `.kiro/steering/product.md` - Current product
- `.kiro/steering/AGENTS.md` - Current patterns
- `docs/spec/AI_SPECIFICATION_WORKFLOW.md` - Feature specs
