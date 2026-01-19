---
name: executing-specs
description: Executes a specific task from a specification suite, adhering to requirements, design, and project guidelines. Use when the user asks to execute a task from .ai/specs.
---

# Execute Specification Task

## When to use this skill
- User asks to "Execute Task [Task Name]" from a tasks.md file.
- User provides a path to a task file and asks to implement it.
- User references `.ai/specs` tasks.

## Workflow
1.  **Context Assembly (Critical)**
    - **Derive Spec Folder**: The spec folder is the **parent directory** of the provided `tasks.md` file.
        - Example: If user says "Execute Task X in `.ai/specs/example-feature/tasks.md`", the spec folder is `.ai/specs/example-feature/`.
    - **Read Task**: `view_file` the provided `tasks.md` to find the specific task title and its context/subtasks.
    - **Read Sibling Specs**: Read all other relevant files in the **same spec folder**:
        - `requirements.md` (the "what")
        - `design.md` (the "how")
        - Any other `.md` files in that folder (e.g., `review.md`).
    - **Read Governance**: Read `.ai/steering/tech.md`, `.ai/steering/structure.md`, and `.ai/steering/product.md`.
    - **Read Persona**: Read `AGENTS.md` to adopt the "Craftsman" persona and constraints.

2.  **Persona Adoption**
    - Adopt the persona defined in `AGENTS.md` ("You're not just an AI assistant. You're a craftsman...").
    - Adhere strictly to the "Core Principles" and "Layer Contracts" defined in `AGENTS.md`.

3.  **Planning (Plan)**
    - Create or update `implementation_plan.md` in the artifact directory.
    - Map the task requirements to specific code changes.
    - **Clarify**: If requirements are ambiguous, ASK the user immediately. Do not guess.

4.  **Implementation (Execute)**
    - **Task Boundary**: Use `task_boundary` to track progress.
    - **Code**: Write code that matches the project structure (`feature-first`, `strict layering`).
    - **Styles**: Ensure UI matches the "Premium" and "Dynamic" aesthetic guidelines.

5.  **Verification**
    - Verify changes against the specific requirements in `requirements.md`.
    - Run applicable tests (`bun run test`).
    - Mark the task as `[x]` in the original `tasks.md` file (using `multi_replace_file_content`).

## Instructions
- **Strict Compliance**: You must follow the **Directory Structure** and **Layer Contracts** from `AGENTS.md`.
    - e.g., No importing `features/*` from `components/shared`.
- **Constraint check**: Before writing code, check: "Does this violate `AGENTS.md` or `.ai/steering`?"
- **Atomic Execution**: Focus ONLY on the requested task. Do not implement future tasks or other items in the checklist unless explicitly asked.
- **Reporting**: When finished, summarize what was built and referencing the specific requirements met.

## Resources
- [Project Scaffolding & Persona](../../../../AGENTS.md)
- [Steering Guidelines](../../../../.ai/steering/)
