# 🚀 ULTIMATE GUIDE: High-Performance Autonomous Engineering System

This guide explains how to set up a "Persistent Engineering Context" for any project using opencode and the `gemma-4-31b-it` model. This system prevents the agent from "forgetting" tasks, prevents infinite loops, and ensures production-grade code.

---

## 🎯 Why this works
LLMs have a finite context window. In large projects, the agent often forgets the overarching goal or repeats failed attempts. This system solves that by creating an "External Brain" (Hot Context) that the agent is forced to read at the start of every session.

---

## 📂 1. Directory Structure (The Blueprint)
Run these commands in your new project root to set up the skeleton:

```bash
# Create Hot Context files
touch AGENTS.md ACTIVE_CONTEXT.md REPORT.md CURRENT_SPRINT.md CONTEXT_AUDIT.md

# Create Tiered Memory structure
mkdir -p memory/active memory/architecture memory/archived memory/failures memory/sessions
```

**Visual Tree:**
```text
.
├── AGENTS.md             # <--- THE BRAIN (Rules & Protocols)
├── ACTIVE_CONTEXT.md     # <--- THE NOW (Current Task & Blockers)
├── REPORT.md             # <--- THE SNAPSHOT (Project Status)
├── CURRENT_SPRINT.md     # <--- THE GOAL (Milestones)
├── CONTEXT_AUDIT.md      # <--- THE CHECK (Constraint Verification)
└── memory/               # <--- LONG-TERM KNOWLEDGE
    ├── active/           # Active research/notes
    ├── architecture/     # Design decisions (decisions.md)
    ├── archived/         # Resolved issues
    ├── failures/         # The "Wall of Shame" (Lessons learned)
    └── sessions/         # History of major session outcomes
```

---

## 📝 2. File Content & Templates

### A. `AGENTS.md` (COPY-PASTE THIS EXACTLY)
This is the most important file. It defines the agent's DNA for the project.

```markdown
# Agent Guide

This repository operates as a persistent autonomous engineering system. All agents must follow these operational rules to ensure continuity, safety, and efficiency.

## 🚀 Session Start Rules
Before ANY coding task, you MUST:
1. **Read the Hot Context**: `AGENTS.md`, `ACTIVE_CONTEXT.md`, `REPORT.md`, `CURRENT_SPRINT.md`.
2. **Analyze**: Unfinished tasks, existing blockers, and active hypotheses.
3. **Audit**: Run a context audit and record findings in `CONTEXT_AUDIT.md`.
4. **Summarize**: Provide a concise summary of your understanding before implementation.

## 🛠 Autonomous Execution Loop
Operate in iterative cycles:
`analyze` → `plan` → `implement` → `verify` → `update memory/report` → `structured commit` → `continue`

Continue iterating until verification succeeds. Never stop while failures remain.

## 🏁 Git Workflow Rules
### Commit Strategy
Commit ONLY after:
- Build PASS
- Lint PASS
- Critical tests PASS

**Commit Triggers**:
- Major feature completed
- Tests repaired
- Architecture change
- Stable build restored

**Commit Format**: `type(scope): short description`
**Body**:
- **Completed**: [bullet points of what was implemented/fixed]
- **Verification**: [Status of build/lint/tests]
- **Remaining**: [Outstanding edge cases or blockers]

### Branching Strategy
- `main`: Production-ready code.
- `develop`: Integration branch.
- `feature/*`: New features.
- `fix/*`: Bug fixes.

### Safety Rail
Never commit knowingly broken production states unless explicitly creating a debugging checkpoint.

## ✅ Mandatory Verification
After EVERY major change, run the project's specific lint/typecheck/test commands.
If verification fails:
1. Inspect logs carefully.
2. Identify root cause.
3. Document findings in `memory/failures/`.
4. Retry systematically.

## 🧠 Memory & Failure Management
- **Tiered Memory**: Use `ACTIVE_CONTEXT.md` for the "now". Move resolved issues to `memory/archived/`.
- **Failure Log**: Record exact problem, root cause, and attempted solution in `memory/failures/`.
- **Avoid Loops**: Never repeat a failed approach documented in `memory/`.
- **Context Rotation**: Periodically compress active memory and archive resolved issues.

## 🌐 Development Server Rules
When running any dev server (Next.js / Node / PHP / Python / Go):
- **ALWAYS bind to 0.0.0.0** (public access).
- **NEVER use localhost-only binding**.
- **ALWAYS print and log the public URL**.
- After starting server: Confirm reachable port and write active port to `REPORT.md`.

## 💎 Code Quality & Standards
- **Production Grade**: Industry-standard structure, clean architecture, and modular organization.
- **Correctness > Speed**: Never prioritize speed over maintainability and correctness.
- **Surgical Edits**: Prefer minimal, targeted changes over large, unnecessary refactors.

## 📝 Commenting Strategy
- **Explain WHY, not WHAT**: Do not comment obvious code.
- **Critical Context**: Use comments to explain complex logic, prevent regressions, or document non-obvious intent.

## ⚙️ Operational Constraints
- **Rate Limits**: STRICT limit of 10 requests per minute. Batch operations and minimize redundant verification.
- **Local Model Optimization**: Use surgical code edits. Reread hot context frequently to prevent task drift.
- **Code Style**: Mimic existing patterns. No comments unless they explain "Why".
```

### B. `ACTIVE_CONTEXT.md` (The "Now")
**Template:**
```markdown
# Active Context

## Current Task
[Detailed description of the exact feature/bug being worked on]

## Current Blockers
- [e.g., Missing API key, unknown library behavior, environment error]

## Architecture Constraints
- [e.g., "Must use Tailwind for styling", "Must be compatible with Node 18"]

## Active Hypothesis
- [e.g., "I believe updating the database schema to X will solve the race condition"]

## Current Priorities
1. [Immediate next step]
2. [Follow-up step]
```

### C. `REPORT.md` (The "Snapshot")
**Template:**
```markdown
# Status Report

## Current State Snapshot
- [e.g., Backend: v1.2, Frontend: Alpha, DB: Migrated]

## Completed Work
- [x] Feature A implemented
- [x] Bug B fixed

## Remaining Work
- [ ] Integration tests
- [ ] Deployment to staging

## Verification Status
- [Pending/Pass/Fail]
```

### D. `CURRENT_SPRINT.md` (The "Goal")
**Template:**
```markdown
# Current Sprint: [Sprint Name/Number]

## Objective
[One sentence describing the main goal of this phase]

## Boundaries
- [What is OUT OF SCOPE for this sprint to prevent scope creep]

## Success Criteria
- [ ] Criterion 1 (Measurable)
- [ ] Criterion 2 (Measurable)
```

---

## 🛠 3. Setup Checklist for New Projects

1. [ ] **Initialize Files**: Run the bash commands in Section 1.
2. [ ] **Inject Brain**: Copy the `AGENTS.md` content exactly.
3. [ ] **Define Goal**: Fill out `CURRENT_SPRINT.md` with your first objective.
4. [ ] **Define Now**: Fill out `ACTIVE_CONTEXT.md` with your first task.
5. [ ] **First Prompt**: Your first message to opencode should be:
   > "Read `AGENTS.md` and the Hot Context files. Initialize your session by performing a context audit in `CONTEXT_AUDIT.md` and summarize the current project state."

## 💡 Pro Tips for Best Results
- **Failure Logging**: When the agent fails 3 times on the same bug, explicitly tell it: *"Log this failure in `memory/failures/` and find a completely different approach."*
- **Context Rotation**: Every 2-3 days, tell the agent: *"Archive resolved tasks from `ACTIVE_CONTEXT.md` to `memory/archived/` and update the `REPORT.md` snapshot."*
- **Verification**: If the agent says "I have fixed it," always reply: *"Show me the output of the verification commands (lint/test) before I accept this."*
