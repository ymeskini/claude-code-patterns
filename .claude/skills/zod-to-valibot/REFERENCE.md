# Zod → Valibot API reference

Comprehensive mapping. Zod is on the left, Valibot equivalent on the right. All Valibot imports assume `import * as v from 'valibot'`.

## Primitives

| Zod | Valibot | Notes |
| --- | --- | --- |
| `z.string()` | `v.string()` | |
| `z.number()` | `v.number()` | |
| `z.bigint()` | `v.bigint()` | |
| `z.boolean()` | `v.boolean()` | |
| `z.date()` | `v.date()` | |
| `z.symbol()` | `v.symbol()` | |
| `z.undefined()` | `v.undefined_()` | trailing `_` — `undefined` is a reserved word |
| `z.null()` | `v.null_()` | trailing `_` |
| `z.void()` | `v.void_()` | trailing `_` |
| `z.nan()` | `v.nan()` | |
| `z.any()` | `v.any()` | |
| `z.unknown()` | `v.unknown()` | |
| `z.never()` | `v.never()` | |
| `z.literal(x)` | `v.literal(x)` | |
| `z.instanceof(Cls)` | `v.instance(Cls)` | |

## Enums / picklists

| Zod | Valibot |
| --- | --- |
| `z.enum(['a','b'])` | `v.picklist(['a','b'])` |
| `z.nativeEnum(MyEnum)` | `v.enum(MyEnum)` (import as `v.enum_` if the surrounding file makes the keyword awkward) |

## Objects

| Zod | Valibot |
| --- | --- |
| `z.object({ a: z.string() })` | `v.object({ a: v.string() })` (unknown keys stripped — same default as Zod) |
| `z.object({...}).strict()` | `v.strictObject({...})` |
| `z.object({...}).passthrough()` | `v.looseObject({...})` |
| `z.object({...}).catchall(S)` | `v.objectWithRest({...}, S)` |

### Object utilities

`ObjectSchema.entries` exposes the raw shape — use it to compose.

| Zod | Valibot |
| --- | --- |
| `S.pick({ a: true })` | `v.pick(S, ['a'])` |
| `S.omit({ a: true })` | `v.omit(S, ['a'])` |
| `S.partial()` | `v.partial(S)` |
| `S.partial({ a: true })` | `v.partial(S, ['a'])` |
| `S.required()` | `v.required(S)` |
| `S.required({ a: true })` | `v.required(S, ['a'])` |
| `A.merge(B)` | `v.object({ ...A.entries, ...B.entries })` |
| `S.extend({ extra: z.string() })` | `v.object({ ...S.entries, extra: v.string() })` |
| `S.keyof()` | `v.picklist(Object.keys(S.entries) as (keyof typeof S.entries)[])` |

## Arrays, tuples, records, maps, sets

| Zod | Valibot |
| --- | --- |
| `z.array(S)` | `v.array(S)` |
| `z.array(S).min(1).max(10)` | `v.pipe(v.array(S), v.minLength(1), v.maxLength(10))` |
| `z.array(S).nonempty()` | `v.pipe(v.array(S), v.nonEmpty())` |
| `z.tuple([A, B])` | `v.tuple([A, B])` |
| `z.tuple([A]).rest(B)` | `v.tupleWithRest([A], B)` |
| `z.record(V)` | `v.record(v.string(), V)` — Valibot requires an explicit key schema |
| `z.record(K, V)` | `v.record(K, V)` |
| `z.map(K, V)` | `v.map(K, V)` |
| `z.set(S)` | `v.set(S)` |

## Unions and intersections

| Zod | Valibot |
| --- | --- |
| `z.union([A, B])` or `A.or(B)` | `v.union([A, B])` |
| `z.discriminatedUnion('kind', [A, B])` | `v.variant('kind', [A, B])` |
| `z.intersection(A, B)` or `A.and(B)` | `v.intersect([A, B])` |

## Optional / nullable / default

| Zod | Valibot |
| --- | --- |
| `S.optional()` | `v.optional(S)` |
| `S.nullable()` | `v.nullable(S)` |
| `S.nullish()` | `v.nullish(S)` |
| `S.default(d)` | `v.optional(S, d)` — a default in Valibot is the second arg to `optional`/`nullable`/`nullish` |
| `S.catch(d)` | `v.fallback(S, d)` — used when validation *fails* rather than when the value is missing |
| `S.nonempty()` on string | `v.pipe(v.string(), v.nonEmpty())` |
| `z.nonOptional(S)` (v4) | `v.nonOptional(S)` |
| — | `v.nonNullable(S)`, `v.nonNullish(S)` |

`v.optional(S, d)` callable: the default can be a value or a function `() => T`.

## Lazy / recursive

```ts
// Zod
const Tree: z.ZodType<Node> = z.lazy(() => z.object({ children: z.array(Tree) }));

// Valibot — same shape, use GenericSchema as the annotation
const Tree: v.GenericSchema<Node> = v.lazy(() =>
  v.object({ children: v.array(Tree) })
);
```

## String actions

All go inside `v.pipe(v.string(), ...)`.

| Zod method | Valibot action |
| --- | --- |
| `.min(n)` | `v.minLength(n)` |
| `.max(n)` | `v.maxLength(n)` |
| `.length(n)` | `v.length(n)` |
| `.nonempty()` | `v.nonEmpty()` |
| `.email()` | `v.email()` |
| `.url()` | `v.url()` |
| `.uuid()` | `v.uuid()` |
| `.cuid()` | `v.cuid()` (via `valibot/extra` in older versions — current `v.cuid2()` for cuid v2) |
| `.cuid2()` | `v.cuid2()` |
| `.ulid()` | `v.ulid()` |
| `.nanoid()` | `v.nanoid()` |
| `.emoji()` | `v.emoji()` |
| `.regex(re)` | `v.regex(re)` |
| `.startsWith(s)` | `v.startsWith(s)` |
| `.endsWith(s)` | `v.endsWith(s)` |
| `.includes(s)` | `v.includes(s)` |
| `.datetime()` | `v.isoTimestamp()` (ISO 8601 including timezone) or `v.isoDateTime()` for local |
| `.date()` | `v.isoDate()` |
| `.time()` | `v.isoTime()` |
| `.ip()` | `v.ip()` (both v4 and v6); use `v.ipv4()` / `v.ipv6()` for specific |
| `.trim()` | `v.trim()` (transforms) |
| `.toLowerCase()` | `v.toLowerCase()` |
| `.toUpperCase()` | `v.toUpperCase()` |

## Number actions

All go inside `v.pipe(v.number(), ...)`.

| Zod method | Valibot action |
| --- | --- |
| `.min(n)` / `.gte(n)` | `v.minValue(n)` |
| `.max(n)` / `.lte(n)` | `v.maxValue(n)` |
| `.gt(n)` | `v.gtValue(n)` |
| `.lt(n)` | `v.ltValue(n)` |
| `.int()` | `v.integer()` |
| `.positive()` | `v.gtValue(0)` |
| `.nonnegative()` | `v.minValue(0)` |
| `.negative()` | `v.ltValue(0)` |
| `.nonpositive()` | `v.maxValue(0)` |
| `.multipleOf(n)` / `.step(n)` | `v.multipleOf(n)` |
| `.finite()` | `v.finite()` |
| `.safe()` | `v.safeInteger()` |

## BigInt / Date / Array / Set / Map actions

Size actions apply to length-bearing schemas:

| Purpose | Valibot |
| --- | --- |
| Array/Set/Map length | `v.minLength`, `v.maxLength`, `v.length`, `v.nonEmpty` (arrays); `v.minSize`/`v.maxSize`/`v.size` for Set/Map |
| Date bounds | `v.minValue(new Date(...))`, `v.maxValue(new Date(...))` |
| BigInt bounds | `v.minValue(0n)`, `v.maxValue(100n)` |

## Transforms and refinements

| Zod | Valibot |
| --- | --- |
| `S.transform(fn)` | `v.pipe(S, v.transform(fn))` |
| `S.refine(fn, msg)` | `v.pipe(S, v.check(fn, msg))` |
| `S.refine(fn, { message, path })` | Use `v.pipe(S, v.check(fn, msg))` at the leaf schema, or `v.rawCheck` at the object level for path control |
| `S.superRefine((val, ctx) => ctx.addIssue(...))` | `v.pipe(S, v.rawCheck(({ dataset, addIssue }) => { if (...) addIssue({ message: '...' }) }))` |
| `z.preprocess(fn, S)` | `v.pipe(v.unknown(), v.transform(fn), S)` — pipe input through transform then validate |
| `S.pipe(T)` (Zod pipeline) | `v.pipe(S, T)` if `T` is an action, or compose via `v.pipe(v.unknown(), v.transform(v.parser(S)), T)` for schema-to-schema |

## Branded and readonly

| Zod | Valibot |
| --- | --- |
| `S.brand<'UserId'>()` | `v.pipe(S, v.brand('UserId'))` |
| `S.readonly()` | `v.pipe(S, v.readonly())` |

## Parsing

| Zod | Valibot |
| --- | --- |
| `S.parse(data)` | `v.parse(S, data)` |
| `S.safeParse(data)` | `v.safeParse(S, data)` |
| `S.parseAsync(data)` | `v.parseAsync(S, data)` |
| `S.safeParseAsync(data)` | `v.safeParseAsync(S, data)` |

`safeParse` shape differs — see "Error handling" below.

## Type inference

| Zod | Valibot |
| --- | --- |
| `z.infer<typeof S>` | `v.InferOutput<typeof S>` |
| `z.input<typeof S>` | `v.InferInput<typeof S>` |
| `z.output<typeof S>` | `v.InferOutput<typeof S>` |
| `z.ZodType<T>` | `v.GenericSchema<T>` |
| `z.ZodIssue` | `v.BaseIssue<unknown>` (or `v.InferIssue<typeof S>` for a specific schema) |

## Error handling

This is the riskiest part of the migration. The shapes are different.

### `safeParse` result

Zod:
```ts
const r = S.safeParse(data);
if (!r.success) r.error.issues; // ZodIssue[]
else r.data;
```

Valibot:
```ts
const r = v.safeParse(S, data);
if (!r.success) r.issues; // [BaseIssue, ...BaseIssue[]]
else r.output;
```

Key differences:
- `.data` → `.output`
- `.error.issues` → `.issues` (no wrapper object, no `.error`)
- No `.format()`, no `.flatten()` — see below for replacements.

### Flattening issues by path

Valibot has no `.flatten()` helper. If code depends on it, convert manually:

```ts
function flatten(issues: readonly v.BaseIssue<unknown>[]) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const path = (issue.path ?? []).map(p => String(p.key)).join('.');
    (fieldErrors[path] ??= []).push(issue.message);
  }
  return { fieldErrors };
}
```

### Throwing

`v.parse` throws a `v.ValiError` (not `ZodError`). Update any `catch (e)` blocks that check `instanceof ZodError` or read `e.issues`:

```ts
try { v.parse(S, data); }
catch (e) {
  if (e instanceof v.ValiError) e.issues; // typed
}
```

## Async

If any part of a schema is async, **the whole schema must use async variants**, and you must call `parseAsync`/`safeParseAsync`.

| Sync | Async |
| --- | --- |
| `v.pipe` | `v.pipeAsync` |
| `v.object` | `v.objectAsync` |
| `v.array` | `v.arrayAsync` |
| `v.union` | `v.unionAsync` |
| `v.check` | `v.checkAsync` |
| `v.transform` | `v.transformAsync` |
| `v.parse` | `v.parseAsync` |
| `v.safeParse` | `v.safeParseAsync` |

Zod mixes sync and async freely; Valibot does not. Budget time for this.

## Edge cases

### `z.function()`

Valibot does not validate function signatures. Either:
- Leave the runtime check out and rely on TypeScript types, or
- Wrap the function manually: validate args with `v.parse` at the call boundary.

### `z.promise(S)`

No direct equivalent. Use `await` and then `v.parse(S, awaitedValue)` — or `v.pipe(v.instance(Promise), v.transformAsync(async p => v.parse(S, await p)))`.

### Custom error maps

Zod's `z.setErrorMap(...)` has no exact analog. Valibot offers:
- `v.config(schemaCall, { message: 'custom' })` for per-call overrides
- Message functions on each action: `v.minLength(3, 'Too short')`
- `v.setGlobalMessage(...)` (and `setSpecificMessage`) for i18n-style global messages

### `z.coerce.*`

Zod's `z.coerce.number()` accepts any input and coerces with `Number()`. Valibot equivalent:

```ts
v.pipe(v.unknown(), v.transform(Number), v.number());
```

Or for strings: `v.pipe(v.string(), v.transform(Number), v.number())`.

### `z.preprocess`

```ts
// Zod
z.preprocess(x => String(x).trim(), z.string().min(1));

// Valibot
v.pipe(v.unknown(), v.transform(x => String(x).trim()), v.string(), v.minLength(1));
```

### `z.ZodType<T>` generic schema parameters

Function signatures like `function validate<T>(schema: z.ZodType<T>, data: unknown): T` become:

```ts
function validate<T>(schema: v.GenericSchema<T>, data: unknown): T {
  return v.parse(schema, data);
}
```

### `S.describe('...')`

Valibot: `v.pipe(S, v.description('...'))`. Also `v.title`, `v.metadata` exist.

## Common gotchas

- **`v.optional(S)` accepts `undefined`, not missing keys.** In object contexts Valibot treats missing and `undefined` the same way Zod does. But if migrating a `Record<string, T | undefined>` shape, verify.
- **`v.object({})` strips unknown keys by default** — same as Zod. A test relying on extras being preserved needs `v.looseObject`.
- **`v.record(V)` is not valid** — Valibot requires an explicit key schema. `z.record(V)` → `v.record(v.string(), V)`.
- **Transforms change the inferred output type.** After migration, `InferOutput` may differ from `z.infer` if the order of ops in a pipe differs. Compare types explicitly with `Expect<Equal<...>>` where critical.
- **`ZodSchema` vs `v.GenericSchema`** — library code accepting external schemas needs its generic bounds updated.
