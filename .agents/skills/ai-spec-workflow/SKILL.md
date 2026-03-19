---
name: ai-spec-workflow
description: Create or update UI SyncUp feature specifications (requirements.md, design.md, tasks.md) using the AI Specification Workflow. Use when asked to create a spec, generate requirements/design/tasks, or revise an existing spec for a feature.
---

# Ai Spec Workflow

## Overview

Create specification artifacts for a feature using the AI Specification Workflow in `references/AI_SPECIFICATION_WORKFLOW.md`. Follow the workflow gates and file conventions exactly, and do not implement product code during this process.

## Workflow Decision Tree

- If the user asks for a new spec or requirements, start Phase 1.
- If the user asks to revise requirements, stay in Phase 1 until approved.
- If the user asks for design and requirements are approved, start Phase 2.
- If the user asks for tasks and design is approved, start Phase 3.
- If approvals are missing, return to the prior phase and ask for explicit approval.

## Global Rules

- Read `references/AI_SPECIFICATION_WORKFLOW.md` at the start of the task and treat it as the source of truth.
- Determine a kebab-case feature name and create or update files under `.ai/specs/{feature-name}/`.
- Never proceed to the next phase without explicit user approval.
- Use the exact approval questions from the workflow.
- If the user requests changes that affect an earlier phase, return to that phase.
- Do not implement feature code during this workflow.

## Phase 1: Requirements

- Create `.ai/specs/{feature-name}/requirements.md` without asking clarifying questions first.
- Use EARS patterns for every acceptance criterion and validate with INCOSE rules.
- Call out parsers/serializers explicitly and include pretty-printer and round-trip requirements when applicable.
- Present for review using the userInput tool with reason `spec-requirements-review`, then ask: "Do the requirements look good? If so, we can move on to the design."
- Iterate until the user explicitly approves.

## Phase 2: Design

- Create `.ai/specs/{feature-name}/design.md`.
- Identify any research needed, gather it in conversation, and summarize key findings.
- Before writing Correctness Properties, do prework analysis of acceptance criteria and perform property reflection.
- Write correctness properties with explicit universal quantification and requirement traceability.
- Present for review using the userInput tool with reason `spec-design-review`, then ask: "Does the design look good? If so, we can move on to the implementation plan."
- Iterate until the user explicitly approves.

## Phase 3: Tasks

- Create `.ai/specs/{feature-name}/tasks.md`.
- Convert the design into incremental coding tasks and include property-based test tasks.
- Mark test-related sub-tasks optional with `*` unless the user opts to make all tasks required.
- Present for review using the userInput tool with reason `spec-tasks-review`, then ask: "The current task list marks some tasks (e.g. tests, documentation) as optional to focus on core features first. Would you like to: 1) Keep optional tasks (faster MVP), or 2) Make all tasks required (comprehensive from start)?"
- Iterate until the user explicitly approves.

## Output Expectations

- Prefer using templates in `references/templates/` when present.
- Keep requirements, design, and tasks linked by explicit traceability.
- If asked to update an existing spec, edit only the relevant phase files and preserve numbering and traceability.
