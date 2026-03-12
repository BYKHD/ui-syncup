---
name: reviewing-code
description: Review, analyze, audit, or grade code for correctness, security, performance, and standards compliance. Use when the user asks to review/analyze/audit/check/grade code, diffs, PRs, or files and wants actionable feedback.
---

# Code Review & Analysis

## Workflow
1. Identify review scope (files, diff, PR, or snippet); ask clarifying questions if unclear.
2. Read project standards: `AGENTS.md` and `.ai/steering/tech.md`, `.ai/steering/structure.md`, `.ai/steering/product.md` if present.
3. Review for correctness, security, performance, architecture/layering, and standards compliance; prioritize regressions and policy violations.
4. Check tests and edge cases; note missing coverage or risky assumptions.
5. Report findings ordered by severity with file/line references and actionable fixes when feasible.

## Output Format
- Findings: `Critical`, `High`, `Medium`, `Low` with file/line references and rationale.
- Tests: call out gaps or recommend specific tests when needed.
- Summary: brief overall assessment; provide a letter grade only if explicitly requested.

## Notes
- Treat steering docs as source of truth; violations are critical issues.
- Prefer minimal, actionable fixes; avoid style nits unless they affect behavior or standards.

## Resources
- [Tech Stack Standards](../../../.ai/steering/tech.md)
- [Project Structure](../../../.ai/steering/structure.md)
- [Product Requirements](../../../.ai/steering/product.md)
- [Agent Instructions](../../../AGENTS.md)
