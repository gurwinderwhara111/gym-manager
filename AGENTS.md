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
