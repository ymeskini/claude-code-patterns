# Zod → Valibot worked examples

Before/after conversions for realistic patterns. Use these as templates.

## 1. Basic object schema with string validations

```ts
// BEFORE
import { z } from 'zod';

const User = z.object({
  id: z.string().uuid(),
  email: z.string().email().toLowerCase(),
  name: z.string().min(1).max(100),
  age: z.number().int().nonnegative(),
});

type User = z.infer<typeof User>;
const u = User.parse(input);
```

```ts
// AFTER
import * as v from 'valibot';

const User = v.object({
  id: v.pipe(v.string(), v.uuid()),
  email: v.pipe(v.string(), v.email(), v.toLowerCase()),
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
  age: v.pipe(v.number(), v.integer(), v.minValue(0)),
});

type User = v.InferOutput<typeof User>;
const u = v.parse(User, input);
```

## 2. Optional, nullable, defaults

```ts
// BEFORE
const Settings = z.object({
  theme: z.enum(['light', 'dark']).default('light'),
  locale: z.string().optional(),
  avatarUrl: z.string().url().nullable(),
  retries: z.number().int().default(() => 3),
});
```

```ts
// AFTER
const Settings = v.object({
  theme: v.optional(v.picklist(['light', 'dark']), 'light'),
  locale: v.optional(v.string()),
  avatarUrl: v.nullable(v.pipe(v.string(), v.url())),
  retries: v.optional(v.pipe(v.number(), v.integer()), () => 3),
});
```

## 3. Object utilities (pick / omit / partial / extend / merge)

```ts
// BEFORE
const Base = z.object({ id: z.string(), name: z.string(), email: z.string() });

const PublicUser = Base.pick({ id: true, name: true });
const Anon = Base.omit({ email: true });
const Patch = Base.partial();
const WithRole = Base.extend({ role: z.enum(['admin', 'user']) });
const Combined = Base.merge(z.object({ createdAt: z.date() }));
```

```ts
// AFTER
const Base = v.object({ id: v.string(), name: v.string(), email: v.string() });

const PublicUser = v.pick(Base, ['id', 'name']);
const Anon = v.omit(Base, ['email']);
const Patch = v.partial(Base);
const WithRole = v.object({ ...Base.entries, role: v.picklist(['admin', 'user']) });
const Combined = v.object({ ...Base.entries, createdAt: v.date() });
```

## 4. Discriminated union

```ts
// BEFORE
const Event = z.discriminatedUnion('type', [
  z.object({ type: z.literal('click'), x: z.number(), y: z.number() }),
  z.object({ type: z.literal('keypress'), key: z.string() }),
]);
```

```ts
// AFTER
const Event = v.variant('type', [
  v.object({ type: v.literal('click'), x: v.number(), y: v.number() }),
  v.object({ type: v.literal('keypress'), key: v.string() }),
]);
```

## 5. Transform and refine

```ts
// BEFORE
const Email = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .refine(s => !s.endsWith('@test.com'), 'No test addresses');

const FromString = z.string().transform(s => s.length);
```

```ts
// AFTER
const Email = v.pipe(
  v.string(),
  v.trim(),
  v.toLowerCase(),
  v.email(),
  v.check(s => !s.endsWith('@test.com'), 'No test addresses')
);

const FromString = v.pipe(v.string(), v.transform(s => s.length));
```

## 6. superRefine → rawCheck

```ts
// BEFORE
const Form = z
  .object({ password: z.string(), confirm: z.string() })
  .superRefine((val, ctx) => {
    if (val.password !== val.confirm) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirm'],
        message: 'Passwords do not match',
      });
    }
  });
```

```ts
// AFTER
const Form = v.pipe(
  v.object({ password: v.string(), confirm: v.string() }),
  v.forward(
    v.check(
      ({ password, confirm }) => password === confirm,
      'Passwords do not match'
    ),
    ['confirm']
  )
);
```

`v.forward` attaches the issue to a specific path — the Valibot replacement for Zod's `ctx.addIssue({ path })`.

## 7. Recursive schema

```ts
// BEFORE
type Category = { name: string; children: Category[] };
const Category: z.ZodType<Category> = z.lazy(() =>
  z.object({
    name: z.string(),
    children: z.array(Category),
  })
);
```

```ts
// AFTER
type Category = { name: string; children: Category[] };
const Category: v.GenericSchema<Category> = v.lazy(() =>
  v.object({
    name: v.string(),
    children: v.array(Category),
  })
);
```

## 8. safeParse consumer

```ts
// BEFORE
const r = UserSchema.safeParse(payload);
if (!r.success) {
  return { errors: r.error.flatten().fieldErrors };
}
return { data: r.data };
```

```ts
// AFTER
const r = v.safeParse(UserSchema, payload);
if (!r.success) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of r.issues) {
    const key = (issue.path ?? []).map(p => String(p.key)).join('.');
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { errors: fieldErrors };
}
return { data: r.output };
```

## 9. Coercion

```ts
// BEFORE
const Port = z.coerce.number().int().min(1).max(65535);
```

```ts
// AFTER
const Port = v.pipe(
  v.unknown(),
  v.transform(Number),
  v.number(),
  v.integer(),
  v.minValue(1),
  v.maxValue(65535)
);
```

## 10. Async validation

```ts
// BEFORE
const Username = z.string().refine(
  async name => !(await isTaken(name)),
  'Username taken'
);
const out = await Username.parseAsync(input);
```

```ts
// AFTER
const Username = v.pipeAsync(
  v.string(),
  v.checkAsync(async name => !(await isTaken(name)), 'Username taken')
);
const out = await v.parseAsync(Username, input);
```

If this schema is nested inside an object, the whole parent must become async: `v.objectAsync({ username: Username })` and the caller uses `v.parseAsync`.

## 11. Branded types

```ts
// BEFORE
const UserId = z.string().uuid().brand<'UserId'>();
type UserId = z.infer<typeof UserId>;
```

```ts
// AFTER
const UserId = v.pipe(v.string(), v.uuid(), v.brand('UserId'));
type UserId = v.InferOutput<typeof UserId>;
```

## 12. Library function accepting any schema

```ts
// BEFORE
export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}
```

```ts
// AFTER
export function validate<T>(schema: v.GenericSchema<T>, data: unknown): T {
  return v.parse(schema, data);
}
```

Callers do not need to change — both sides of this signature accept the same shape of thing.
