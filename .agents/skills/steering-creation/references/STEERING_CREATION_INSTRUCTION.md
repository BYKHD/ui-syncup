# Steering File Creation Instructions

This document provides comprehensive guidelines for creating effective steering files in the `.kiro/steering/` directory. Steering files provide context, standards, and instructions that guide AI assistance throughout the project.

> **Source**: This document is derived from the system instructions that guide AI behavior when working with steering files. It captures the exact patterns and principles used by the AI to understand and apply steering guidance.

## What Are Steering Files?

Steering files are markdown documents that:
- Provide additional context and instructions for AI interactions
- Define standards and norms for the team
- Include useful information about the project
- Guide how to achieve specific tasks (build/test/deploy)

### How AI Uses Steering Files

From the AI's perspective, steering files are:
- **Automatically included** in the context based on inclusion mode
- **Prioritized guidance** that takes precedence when conflicts exist
- **Living documentation** that should be kept in sync with the codebase
- **Single sources of truth** for standards and conventions

### Workspace vs Global Rules

**Critical Hierarchy:**
- Workspace-level steering files (`.kiro/steering/*.md`) take precedence over global-level rules
- When conflicts exist, workspace rules override global rules
- This allows project-specific customization while maintaining general best practices

## Location & Structure

```
.kiro/
└── steering/
    ├── tech.md              # Technology stack & dependencies
    ├── structure.md         # Project organization & architecture
    ├── product.md           # Product overview & business logic
    ├── AGENTS.md            # Scaffolding & development patterns
    └── <custom>.md          # Additional domain-specific guides
```

## Inclusion Modes

Steering files support three inclusion modes via front-matter:

### 1. Always Included (Default)
No front-matter needed. The file is included in every AI interaction.

```markdown
# Tech Stack

Content here is always available...
```

### 2. Conditional (File Match)
Included only when specific files are read into context.

```markdown
---
inclusion: fileMatch
fileMatchPattern: 'README*'
---

# Documentation Standards

This appears when README files are accessed...
```

### 3. Manual (Context Key)
Included only when explicitly referenced via `#` in chat.

```markdown
---
inclusion: manual
---

# Advanced Deployment Guide

This appears only when user types #advanced-deployment...
```

## File References

Steering files can reference other files using special syntax:

```markdown
See the API specification: #[[file:openapi.yaml]]

Database schema: #[[file:schema.sql]]
```

This allows including specs, schemas, and other documents without duplication.

## AI Behavior with Steering Files

### How AI Processes Steering

When AI receives a user request:

1. **Context Loading**: Steering files are loaded based on inclusion mode
   - Always-included files load first
   - Conditional files load when matching files are accessed
   - Manual files load when explicitly referenced with `#`

2. **Priority Assessment**: AI considers steering as high-priority guidance
   - Steering provides direction but doesn't override explicit user requests
   - User's specific request is always the #1 priority
   - Steering helps interpret ambiguous requests

3. **Conflict Resolution**: When guidance conflicts:
   - User request > Workspace steering > Global rules
   - More specific guidance overrides general guidance
   - Recent updates override older patterns

### AI Response to Steering

The AI is instructed to:
- **Consider steering context** for the entire execution
- **Apply patterns consistently** across the codebase
- **Update steering files** when asked by users
- **Reference steering** when explaining decisions
- **Suggest steering updates** when patterns emerge

### Example AI Thought Process

```
User asks: "Add a new feature for user profiles"

AI thinks:
1. Check tech.md → Use Next.js 16, React 19, TypeScript
2. Check structure.md → Create in src/features/user-profiles/
3. Check product.md → Consider RBAC roles and permissions
4. Check AGENTS.md → Follow feature module anatomy
5. Execute: Create feature following all steering patterns
```

## Core Steering Files

### tech.md - Technology Stack
**Purpose**: Define the complete technology stack, dependencies, and tooling.

**Should Include**:
- Framework & runtime versions
- UI libraries & component systems
- Data fetching & state management
- Database & ORM
- Authentication & security
- Testing frameworks
- Common commands & scripts
- Path aliases
- Environment variable guidance

**Example Structure**:
```markdown
# Tech Stack

## Framework & Runtime
- Next.js 16 (App Router)
- React 19.2
- TypeScript 5
- Node 20 LTS

## UI & Styling
- shadcn/ui
- Tailwind CSS 4
- Framer Motion

## Data & State
- TanStack Query 5
- Zod validation

## Database
- PostgreSQL 15
- Drizzle ORM
- Supabase

## Common Commands
\`\`\`bash
bun dev                 # Start dev server
bun run test           # Run tests (NOT 'bun test')
bun run db:migrate     # Run migrations
\`\`\`

## Critical Rules
- ALWAYS use `bun run test`, NEVER `bun test`
- Tests use in-memory DB by default
```

### structure.md - Project Organization
**Purpose**: Define directory structure, naming conventions, and architectural patterns.

**Should Include**:
- Complete directory tree with explanations
- Layer contracts (import rules)
- Feature module anatomy
- Naming conventions
- Page structure patterns
- Barrel export strategy
- Mock data organization
- Testing structure

**Example Structure**:
```markdown
# Project Structure

## Overview
Feature-first architecture with strict layering.

## Directory Layout
\`\`\`
src/
├── app/                    # Next.js routing
├── features/               # Product features
│   └── <feature>/
│       ├── api/           # Fetchers + DTOs
│       ├── hooks/         # React Query wrappers
│       ├── components/    # Feature UI
│       ├── screens/       # Screen components
│       ├── types/         # Domain models
│       └── index.ts       # Public API
├── components/
│   ├── ui/                # shadcn primitives
│   └── shared/            # Cross-feature widgets
├── lib/                   # App utilities
├── server/                # Server-only logic
└── config/                # Single sources of truth
\`\`\`

## Layer Contracts
- app/ can import: features/*, components/*, lib, config
- features/<name>/components can import: own hooks/types/utils, components/ui, lib
- components/ui NEVER imports from features/*

## Naming Conventions
- Files: kebab-case (create-issue-dialog.tsx)
- Components: PascalCase (CreateIssueDialog)
- Hooks: camelCase with use prefix (useIssue)
```

### product.md - Product Overview
**Purpose**: Document product features, business logic, and domain concepts.

**Should Include**:
- Product description & purpose
- Core features
- User roles & permissions
- Business rules
- Monetization model
- Target users
- Workflow states

**Example Structure**:
```markdown
# Product Overview

[Product Name] is a [description] platform for [purpose].

## Core Features
- Feature 1: Description
- Feature 2: Description

## Role System
### Management Roles
- OWNER: Full control, can delete team
- ADMIN: Manage members, cannot delete team

### Operational Roles
- EDITOR: Create content (billable at $X/month)
- MEMBER: View and comment (free)
- VIEWER: Read-only (free)

## Business Rules
- Only EDITOR role is billable
- Management roles are NOT billable by themselves
- Users with PROJECT_OWNER auto-promote to EDITOR

## Monetization
Pro plan bills per EDITOR at $X/month.
```

### AGENTS.md - Development Patterns
**Purpose**: Define scaffolding guidelines, coding patterns, and best practices.

**Should Include**:
- Core principles
- Feature module anatomy
- Auth system patterns
- Shared UI conventions
- Testing guidelines
- Thin pages pattern
- Example code snippets

**Example Structure**:
```markdown
# Project Scaffolding Guide

## Core Principles
- Feature-first organization
- Strict layering
- Typed boundaries with Zod
- Security defaults (httpOnly cookies)

## Feature Module Anatomy
\`\`\`
features/<name>/
├── api/          # Fetchers + DTO schemas
├── hooks/        # React Query wrappers
├── components/   # Feature UI
├── types/        # Domain models
└── index.ts      # Barrel exports
\`\`\`

## Thin Pages Pattern
Pages are route handlers that:
1. Read searchParams, cookies, headers
2. Perform auth/tenant gating
3. Light Zod validation
4. Render a single feature Screen

\`\`\`tsx
// app/(protected)/issues/page.tsx
export default function IssuesPage({ searchParams }) {
  const teamId = cookies().get('team_id')?.value
  if (!teamId) redirect('/select-team')
  return <IssuesListScreen teamId={teamId} search={searchParams} />
}
\`\`\`
```

## Best Practices

### 0. Understand AI Response Style

Steering files should align with how AI communicates:

**AI Communication Principles:**
- **Knowledgeable, not instructive**: Show expertise without being condescending
- **Speak like a dev**: Use technical language when necessary, relatable language otherwise
- **Decisive, precise, clear**: Lose the fluff
- **Supportive, not authoritative**: Compassionate and welcoming
- **Easygoing, not mellow**: Care about coding but don't take it too seriously
- **Concise and direct**: Avoid long, elaborate sentences
- **Show, don't tell**: Use facts and reality, avoid hyperbole

**How This Affects Steering Files:**
```markdown
❌ Bad (instructive, verbose):
"You should always remember to carefully consider the overall architecture 
before proceeding to implement any new features, as this will help ensure 
that your code remains maintainable and scalable over time."

✅ Good (knowledgeable, concise):
"Check structure.md before adding features. Follow the feature-first pattern 
in src/features/<name>/ with api/, hooks/, components/, types/."
```

**Tone Guidelines for Steering:**
- Use imperative mood for rules: "Use X" not "You should use X"
- Provide context briefly: "Why: X enables Y"
- Use examples over explanations
- Keep it scannable with bullets and code blocks
- No exclamation points or hyperbole

### 1. Be Concise & Actionable
- Focus on what developers need to know
- Avoid verbose explanations
- Provide concrete examples
- Use code snippets liberally

### 2. Maintain Single Sources of Truth
- Don't duplicate information across files
- Reference other files when needed
- Use file references: `#[[file:path]]`

### 3. Keep Files Focused
- Each file should have a clear purpose
- Split large topics into separate files
- Use conditional inclusion for specialized content

### 4. Update Regularly
- Keep steering files in sync with codebase
- Update when architecture changes
- Document new patterns as they emerge

### 5. Use Clear Formatting
- Use headers for organization
- Use code blocks for examples
- Use lists for rules and guidelines
- Use tables for comparisons

### 6. Include Critical Rules
Highlight rules that prevent common mistakes:

```markdown
## Critical Rules
- ⚠️ ALWAYS use `bun run test`, NEVER `bun test`
- ⚠️ NEVER import from features/* in components/ui
- ⚠️ Store tokens in httpOnly cookies, NEVER localStorage
```

### 7. Provide Context
Explain the "why" behind rules:

```markdown
## Why Feature-First?
- Keeps related code together
- Makes features portable
- Reduces cognitive load
- Scales better than type-based organization
```

### 8. Align with System Instructions

Steering files should complement (not contradict) core AI instructions:

**AI Core Principles** (from system instructions):
- Be concise and direct
- Prioritize actionable information
- Don't repeat yourself
- Use minimal wording for summaries
- Write minimal code needed
- Never discuss sensitive/personal topics
- Always prioritize security best practices

**Steering Should:**
- Reinforce these principles with project-specific examples
- Provide concrete patterns that embody these principles
- Add domain-specific guidance that complements core behavior
- Never contradict core security or privacy rules

**Example Alignment:**
```markdown
# Code Review Standards

## Conciseness (aligns with AI core principle)
- Keep functions under 50 lines
- Extract complex logic into named functions
- Use early returns to reduce nesting

## Security (reinforces AI core principle)
- Never log sensitive data
- Use parameterized queries for all DB access
- Store secrets in environment variables only
```

### 9. Update Maintenance Strategy

Include guidance on when to update steering files:

```markdown
## When to Update This File

Update tech.md when:
- [ ] Upgrading major dependencies (React, Next.js, etc.)
- [ ] Adding new libraries to the stack
- [ ] Changing testing frameworks
- [ ] Modifying build/dev commands
- [ ] Discovering critical gotchas (like "never use bun test")

Update structure.md when:
- [ ] Adding new top-level directories
- [ ] Changing import rules or layer contracts
- [ ] Introducing new architectural patterns
- [ ] Refactoring feature organization

Update product.md when:
- [ ] Adding/removing user roles
- [ ] Changing billing model
- [ ] Adding major features
- [ ] Modifying business rules
```

## Custom Steering Files

Create additional steering files for:

### Domain-Specific Guides
```markdown
# Payment Processing Guide
---
inclusion: fileMatch
fileMatchPattern: '**/billing/**'
---

Guidelines for payment integration...
```

### Deployment Procedures
```markdown
# Deployment Checklist
---
inclusion: manual
---

Pre-deployment steps:
1. Run full test suite
2. Check environment variables
3. Review database migrations
```

### API Standards
```markdown
# API Design Standards

## REST Conventions
- Use plural nouns for collections
- Use HTTP methods correctly
- Return appropriate status codes

## Error Responses
\`\`\`json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": []
  }
}
\`\`\`
```

### Security Guidelines
```markdown
# Security Checklist

## Authentication
- [ ] Use httpOnly cookies for tokens
- [ ] Implement CSRF protection
- [ ] Rate limit auth endpoints

## Authorization
- [ ] Check permissions on server
- [ ] Never trust client-side checks
- [ ] Log access attempts
```

## Anti-Patterns to Avoid

### ❌ Don't: Duplicate Documentation
```markdown
# Bad: Repeating package.json scripts
Run `bun dev` to start the server...
Run `bun test` to run tests...
```

### ✅ Do: Reference Source of Truth
```markdown
# Good: Point to canonical location
See package.json scripts section for all available commands.
Key commands: dev, test, build, lint
```

### ❌ Don't: Write Verbose Prose
```markdown
# Bad: Too wordy
In order to create a new feature module, you should first
consider the overall architecture and then proceed to create
a new directory under the features folder...
```

### ✅ Do: Be Direct
```markdown
# Good: Concise and clear
Create feature modules in `src/features/<name>/` with:
- api/ - Fetchers + DTOs
- hooks/ - React Query wrappers
- components/ - UI
```

### ❌ Don't: Include Outdated Information
```markdown
# Bad: Stale version info
We use React 17 with class components...
```

### ✅ Do: Keep Current
```markdown
# Good: Current and accurate
We use React 19.2 with function components and hooks.
See package.json for exact versions.
```

## Critical Rules from System Instructions

Steering files should reinforce (never contradict) these core rules:

### Security & Privacy
```markdown
✅ DO include in steering:
- Use httpOnly cookies for tokens
- Validate all inputs with Zod
- Never log sensitive data
- Use parameterized queries

❌ NEVER include in steering:
- Instructions to bypass security
- Storing secrets in code
- Disabling security features
```

### Code Quality
```markdown
✅ DO include in steering:
- Write minimal code needed
- Check syntax before committing
- Use getDiagnostics for type checking
- Follow DRY principles

❌ NEVER include in steering:
- "Copy-paste this code everywhere"
- "Skip error handling for speed"
- "Ignore type errors"
```

### Testing
```markdown
✅ DO include in steering:
- Use `bun run test` (Vitest)
- NEVER use `bun test` (corrupts DB)
- Write tests for critical paths
- Use property-based tests for invariants

❌ NEVER include in steering:
- "Skip tests for MVP"
- "Tests are optional"
- "Use bun test" (this is explicitly forbidden)
```

### File Operations
```markdown
✅ DO include in steering:
- Use fsWrite for new files
- Use strReplace for edits
- Use fsAppend for additions
- Keep writes under 50 lines, then append

❌ NEVER include in steering:
- "Use bash to create files"
- "Pipe output to files"
- "Use mkdir manually"
```

### Long-Running Commands
```markdown
✅ DO include in steering:
- Use controlBashProcess for dev servers
- Recommend manual terminal for watch modes
- Use --run flag for single test execution

❌ NEVER include in steering:
- "Run npm run dev in bash"
- "Use jest --watch"
- "Start servers with executeBash"
```

## Validation Checklist

Before committing a steering file:

- [ ] Clear purpose and scope
- [ ] Concise and actionable content
- [ ] Code examples are correct
- [ ] No duplication with other files
- [ ] Proper front-matter if conditional/manual
- [ ] File references use correct syntax
- [ ] Critical rules are highlighted
- [ ] Information is current and accurate
- [ ] Formatting is consistent
- [ ] Examples follow project conventions
- [ ] Aligns with AI core principles (concise, secure, actionable)
- [ ] Tone is knowledgeable but not instructive
- [ ] No hyperbole or excessive punctuation

## Kiro-Specific Features to Consider

When creating steering files, be aware of Kiro's capabilities:

### Autopilot vs Supervised Mode
- **Autopilot**: AI can modify files autonomously
- **Supervised**: Users review changes before application
- Steering should work well in both modes

### Chat Context Features
Users can reference:
- `#File` or `#Folder` - Specific files/folders
- `#Problems` - Current file issues
- `#Terminal` - Terminal output
- `#Git Diff` - Current changes
- `#Codebase` - Whole codebase search (once indexed)

**Steering Tip:**
```markdown
## Debugging Workflow
1. Check #Problems for type errors
2. Review #Git Diff for recent changes
3. Check #Terminal for runtime errors
4. Use #Codebase to find similar patterns
```

### Agent Hooks
Steering can reference hooks for automated workflows:

```markdown
## Testing Workflow
When you save a file, the test hook automatically:
1. Runs related tests
2. Reports failures
3. Suggests fixes

Configure in: Agent Hooks panel or .kiro/hooks/
```

### Model Context Protocol (MCP)
Steering can guide MCP server usage:

```markdown
## Database Operations
Use Supabase MCP tools for database work:
- `mcp_supabase_local_execute_sql` - Run queries
- `mcp_supabase_local_list_tables` - List tables
- `mcp_supabase_local_apply_migration` - Apply migrations

Config: .kiro/settings/mcp.json
```

## Example: Creating a New Steering File

Let's create a steering file for database migrations:

```markdown
---
inclusion: fileMatch
fileMatchPattern: 'drizzle/**'
---

# Database Migration Guide

## Creating Migrations

Generate migration from schema changes:
\`\`\`bash
bun run db:generate
\`\`\`

## Migration Naming

Use descriptive snake_case names:
- `0001_create_users_table.sql`
- `0002_add_email_verification.sql`
- `0003_enable_realtime_notifications.sql`

## Migration Rules

1. **Never modify existing migrations** - Create new ones
2. **Test locally first** - Run against local DB
3. **Include rollback** - Document how to revert
4. **Avoid data loss** - Use transactions
5. **Check constraints** - Validate before deploying

## Running Migrations

Local:
\`\`\`bash
bun run db:migrate
\`\`\`

Production:
\`\`\`bash
bun run db:migrate:prod
\`\`\`

## Common Patterns

### Adding a Column
\`\`\`sql
ALTER TABLE users 
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
\`\`\`

### Creating an Index
\`\`\`sql
CREATE INDEX idx_users_email ON users(email);
\`\`\`

### Enabling RLS
\`\`\`sql
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);
\`\`\`

## Troubleshooting

**Migration fails**: Check syntax, rollback, fix, retry
**Constraint violation**: Ensure data compatibility first
**Performance issues**: Add indexes, use batching

## References

- Schema: #[[file:src/server/db/schema/index.ts]]
- Config: #[[file:drizzle.config.ts]]
```

## Related Documentation

### Specification Workflow
For creating structured feature specifications (requirements, design, tasks), see:
- **`docs/spec/AI_SPECIFICATION_WORKFLOW.md`** - Complete specification-driven development workflow
- **`.kiro/specs/`** - Example specifications for reference

**Key Differences:**
- **Steering files** provide ongoing context and standards for all AI interactions
- **Specification files** define specific features with requirements, design, and implementation tasks

**When to Use Each:**
- Use **steering files** for: Tech stack, architecture patterns, coding standards, project structure
- Use **spec files** for: New feature development, complex implementations, formal requirements

### File References in Both Systems

Both steering files and spec files support the same file reference syntax:
```markdown
See the API specification: #[[file:openapi.yaml]]
Database schema: #[[file:schema.sql]]
```

This allows both systems to reference shared documentation without duplication.

## Conclusion

Effective steering files:
- Provide clear, actionable guidance
- Stay current with the codebase
- Avoid duplication
- Use concrete examples
- Focus on what matters
- Make AI assistance more effective

Remember: Steering files are living documents. Update them as your project evolves, patterns emerge, and best practices change.

---

**See Also:**
- `.ai/steering/tech.md` - Current tech stack steering file
- `.ai/steering/structure.md` - Current structure steering file
- `.ai/steering/product.md` - Current product steering file
- `.ai/steering/AGENTS.md` - Current development patterns
- `docs/spec/AI_SPECIFICATION_WORKFLOW.md` - Feature specification workflow
