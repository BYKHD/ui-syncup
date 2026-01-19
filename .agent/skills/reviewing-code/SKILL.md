---
name: reviewing-code
description: Performs comprehensive code reviews, analysis, and grading of the project's codebase based on project guidelines. Use when the user asks to review, analyze, audit, or check code.
---

# Code Review & Analysis

## When to use this skill
- User asks to "review" a file, PR, or code block.
- User asks to "analyze" code for issues.
- User asks to "grade" current implementation.
- User asks to "audit" for performance or security.
- User asks for "feedback" on code.

## Workflow
1.  **Context Discovery**:
    - Identify the target file(s) for review.
    - Read project standards in `.ai/steering/tech.md`, `.ai/steering/structure.md`, and `.ai/steering/product.md`.
2.  **Analysis**:
    - Validate against **Tech Stack** (e.g., correct libraries, no banned frameworks).
    - Validate against **Structure** (e.g., file location, naming conventions).
    - Analyze for **Correctness** (bugs, logic errors).
    - Analyze for **Performance** (bottlenecks, inefficient cycles).
    - Analyze for **Security** (input validation, auth boundaries).
3.  **Report Generation**:
    - **Grade**: Assign a letter grade (A-F) with a brief justification.
    - **Critical Issues**: List blocking problems (bugs, security, policy violations).
    - **Suggestions**: List non-critical improvements (style, optimization).
    - **Fixes**: Provide actionable code snippets for recommended fixes.

## Instructions
- **Adhere to Steering**: The standards in `.ai/steering/` are the absolute source of truth. If code violates `tech.md`, it is a critical issue.
- **Be Objective**: Grade based on:
    - A: Perfect adherence, optimized, secure.
    - C: Functional but violates some standards or has minor perfs issues.
    - F: Broken, security risk, or major architectural violation.
- **Specific Feedback**: Do not be vague. Cite line numbers and specific violations.
- **Performance Focus**: Look for N+1 queries, large bundle imports, and unoptimized loops.

## Resources
- [Tech Stack Standards](../../../.ai/steering/tech.md)
- [Project Structure](../../../.ai/steering/structure.md)
