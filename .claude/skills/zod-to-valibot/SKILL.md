---
name: zod-to-valibot
description: Migrate TypeScript code from Zod to Valibot. Use when the user asks to migrate, port, or convert Zod schemas to Valibot, when replacing Zod with Valibot in any repository, when reducing bundle size by switching from Zod, or when files import from `zod` and the user wants them on `valibot` instead.
---

# Zod → Valibot migration

Repo-agnostic migration skill. Works on any TypeScript project using Zod.

## Core mental model

The single biggest shift: **Zod chains methods, Valibot composes functions via `pipe`**.

```ts
// Zod
const S = z.string().email().min(5);

// Valibot
const S = v.pipe(v.string(), v.email(), v.minLength(5));
```

Everything else follows from this: modifiers (`optional`, `nullable`), object utilities (`pick`, `omit`, `partial`), and type inference all become standalone functions rather than methods.

See [REFERENCE.md](REFERENCE.md) for the full API mapping and [EXAMPLES.md](EXAMPLES.md) for worked before/after conversions.

## Workflow

Follow these steps in order. Do not skip the audit — it surfaces edge cases that change the migration plan.

### 1. Audit the repo

Run the audit script to inventory Zod usage:

```bash
bash .claude/skills/zod-to-valibot/scripts/audit-zod.sh
```

It reports: files importing `zod`, count of each Zod API used, and flags advanced features (async, `superRefine`, `branded`, `z.function`, `z.discriminatedUnion`, `z.lazy`, custom error maps) that need human review.

If the audit flags advanced features, read [REFERENCE.md](REFERENCE.md) §"Edge cases" before proceeding.

### 2. Install Valibot, keep Zod

```bash
# pick the package manager the repo uses
pnpm add valibot   # or: npm install valibot / yarn add valibot / bun add valibot
```

**Do not remove Zod yet.** Migrate file-by-file so the codebase stays green between edits.

### 3. Migrate file-by-file

For each file importing `zod`:

1. Replace `import { z } from 'zod'` with `import * as v from 'valibot'`.
2. Apply the mappings in [REFERENCE.md](REFERENCE.md). Start with schema constructors, then pipe-able actions, then modifiers, then parsing calls.
3. Rename types: `z.infer<typeof S>` → `v.InferOutput<typeof S>`. If the code distinguishes input vs output (transforms, defaults), use `v.InferInput` where the value is pre-parse.
4. Run type-check on just that file (e.g. `tsc --noEmit`) before moving on.
5. Run the file's tests if they exist.

Prefer small commits — one file or one module per commit. Reverting is easier than debugging a 40-file diff.

### 4. Handle error-shape consumers

Zod's `ZodError` and Valibot's issue array are **not** structurally compatible. Grep for `ZodError`, `.issues`, `.errors`, `.format()`, `.flatten()` and convert consumers explicitly. See [REFERENCE.md](REFERENCE.md) §"Error handling".

### 5. Remove Zod

Only after the audit script reports zero `zod` imports:

```bash
pnpm remove zod
```

Then run the full test suite and type-check.

## When to stop and ask

Stop and ask the user before proceeding if:

- The repo uses `zod` in a public API surface (library exports, tRPC router types, OpenAPI generation). Switching changes the inferred types consumers see.
- You find `z.function()` schemas — Valibot has no direct equivalent; these need a redesign.
- Custom error maps (`z.setErrorMap` / `errorMap` option) are used globally — Valibot's i18n model is different (`v.config` + `v.setGlobalMessage`).
- Async validation is pervasive — every `async` schema needs `Async` variants (`v.pipeAsync`, `v.objectAsync`, etc.) and every `parse` call becomes `parseAsync`.

## Review checklist before declaring done

- [ ] Audit script reports zero `zod` imports.
- [ ] `package.json` has `valibot` and no `zod`.
- [ ] `tsc --noEmit` passes.
- [ ] Test suite passes.
- [ ] Grep for `ZodError|ZodIssue|z\.|zod` returns only matches in comments/docs (if any).
- [ ] No `any` casts were introduced to paper over type mismatches.
