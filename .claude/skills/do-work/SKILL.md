---
name: do-work
description: Execute an engineering task end-to-end with safety rails — plan, implement, verify via pnpm typecheck and pnpm test feedback loops, then commit. Use when the user asks to "do work", complete a feature, fix a bug, or apply changes and wants the full plan → implement → verify → commit flow.
---

# Do Work

A disciplined workflow for completing a piece of work without leaving the codebase broken.

## Workflow

Follow these four phases in order. Do not skip ahead; each phase gates the next.

### 1. Plan

Before editing any file:

- Restate the task in your own words. Confirm scope if ambiguous.
- Identify the files, modules, and tests likely affected. Read them.
- Sketch the approach as a short task list (use TaskCreate for multi-step work).
- Note risks: migrations, shared state, public APIs, breaking changes.

Do not proceed until the plan is concrete enough to execute.

### 2. Implement

- Make the smallest change that accomplishes the task. No incidental refactors.
- Edit existing files; avoid creating new ones unless required.
- Update or add tests alongside code changes.
- Mark plan items complete as you finish them.

### 3. Feedback loops

Run both checks and fix every failure before moving on. Do not commit on red.

```bash
pnpm typecheck
pnpm test
```

Loop rules:

- Run `pnpm typecheck` first — it's faster and surfaces structural breakage.
- Run `pnpm test` next. If failures appear, fix root causes; do not mutate tests to pass.
- After any fix, re-run **both** commands from scratch. A green typecheck does not excuse skipping the test run.
- If a check is slow, you may run it in the background — but block on a clean result before Phase 4.

Exit this phase only when both commands exit 0 with no skipped or pending errors.

### 4. Commit

- Review the diff (`git status`, `git diff`) to confirm only intended changes are staged.
- Stage specific files by name. Do not use `git add -A` or `git add .`.
- Write a concise message focused on the *why*, following the repo's existing style (`git log`).
- Never use `--no-verify` or `--amend` unless the user explicitly asks.
- If a pre-commit hook fails, fix the underlying issue and create a new commit.

Do not push unless the user asks.

## Checklist

- [ ] Plan written and scope confirmed
- [ ] Implementation complete, tests updated
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] Diff reviewed
- [ ] Commit created with meaningful message

## When a phase fails

- **Plan unclear** → ask the user a targeted clarifying question before coding.
- **Typecheck fails** → fix types at the source; avoid `any` and `@ts-ignore` escapes.
- **Tests fail** → diagnose the root cause in the code under test, not the assertions.
- **Commit blocked by hook** → treat the hook output as authoritative; fix, re-stage, new commit.
