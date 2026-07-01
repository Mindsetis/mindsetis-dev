# API layer & conventions (stage 0.5)

How server-side work is written in Mindsetis. This is the contract the `scaffold-feature`
skill follows and what reviewers check against. Source of truth is `CLAUDE.md` +
`docs/mindsetis-mvp-tz.md`; this doc is the concrete "how".

## Principles

1. **RSC + Server Actions by default.** Reach for Route Handlers only for things that must
   be a URL endpoint (webhooks, OAuth/email callbacks). Client components + TanStack Query
   only when genuine client state/interactivity is required.
2. **Zod at every boundary.** Every Server Action / Route Handler / webhook validates its
   input with a Zod schema before using it. Shared schemas live in `lib/validation/`.
3. **One result shape.** Server boundaries return `ActionResult<T>` — never throw for
   _expected_ failures. The only things that throw are framework control-flow
   (`redirect()`, `notFound()`) and truly unexpected errors (collapsed to `internal_error`).
4. **Correct Supabase client per context.** `browser` (client components), `server`
   (RSC/actions), `middleware` (session refresh), `service` (server-only, bypasses RLS —
   never in a client bundle). Money tables are service-role-write-only.

## The building blocks (`lib/api`, `lib/validation`, `lib/auth`, `lib/rate-limit`)

| Concern        | Module                                                                                        | Use                          |
| -------------- | --------------------------------------------------------------------------------------------- | ---------------------------- |
| Result shape   | `@/lib/api` → `ActionResult<T>`, `ok()`, `err()`, `isOk()`                                    | return values                |
| Typed errors   | `@/lib/api` → `ActionError(code, message, fieldErrors?)`                                      | throw inside handlers/guards |
| Action wrapper | `@/lib/api` → `createAction(schema, handler, options?)`                                       | define every action          |
| Shared schemas | `@/lib/validation`                                                                            | input validation             |
| Auth guards    | `@/lib/auth/guards` → `getCurrentUser`, `requireUser`, `requireVerifiedMember`, …             | server-side gates            |
| Rate limiting  | `@/lib/rate-limit` → `rateLimit`, `enforceRateLimit` (or `createAction`'s `rateLimit` option) | sensitive endpoints          |

### Error codes (`ErrorCode`)

`validation_error` · `unauthenticated` · `forbidden` · `not_found` · `conflict` ·
`rate_limited` · `internal_error`. Messages are always user-safe (no stack traces/secrets).

## Defining a Server Action

```ts
// app/[locale]/(some-feature)/actions.ts
'use server';

import { createAction, ActionError } from '@/lib/api';
import { createClient } from '@/lib/supabase/server';
import { requireVerifiedMember } from '@/lib/auth/guards';
import { bookSessionSchema } from '@/lib/validation'; // Zod schema

export const bookSession = createAction(
  bookSessionSchema,
  async (input) => {
    const { user } = await requireVerifiedMember(); // server-side gate → throws ActionError
    const supabase = await createClient();

    const { data, error } = await supabase.from('sessions').insert({/* … */}).select().single();
    if (error) throw new ActionError('internal_error', 'Could not book this session.');

    return data; // becomes ActionResult.data
  },
  { rateLimit: { key: 'sessions:book', limit: 20, window: '1 h' } }, // optional
);
```

Rules:

- **Everything exported from a `'use server'` file must be an async function.** Put helpers
  in a non-`'use server'` module and import them.
- The handler receives already-validated, typed input. It never re-parses.
- Throw `ActionError` for expected failures; return the payload for success. The wrapper
  turns both into an `ActionResult`.
- `createAction` accepts a plain object **or** `FormData` (progressive-enhancement forms).

### Calling from a client form (React Hook Form + Zod)

Use the **same** Zod schema as the `zodResolver` for instant client UX, then call the
action and map the result:

```ts
const result = await bookSession(values);
if (!result.ok) {
  if (result.error.fieldErrors) {
    for (const [field, msgs] of Object.entries(result.error.fieldErrors)) {
      setError(field as keyof Values, { message: msgs[0] });
    }
  }
  setBanner(result.error.message);
  return;
}
router.push('/success');
```

## Route Handlers (`app/api/...`)

Only for URL endpoints. The i18n middleware **excludes `/api`** (see `middleware.ts`
matcher), so handlers there get no locale rewriting or automatic session refresh — build
the Supabase client inside the handler (`@/lib/supabase/server`) as needed. Validate the
payload (Zod), verify signatures for webhooks, keep handlers **idempotent**.

Example in-repo: `app/api/auth/confirm/route.ts` (email confirmation / password recovery).

## Auth guards

`getCurrentUser()` / `getSessionContext()` for optional auth (rendering); `requireUser()` /
`requireConfirmedUser()` / `requireVerifiedMember()` to hard-fail with a typed error inside
actions. RLS is the database baseline; these are the complementary **server** line. The full
permission matrix (verified-member / mindsetter, 14-day flag) is finalized in stage 0.7.

## Rate limiting

Backed by Upstash Redis, wired but **no-ops gracefully** until `UPSTASH_REDIS_REST_URL` /
`UPSTASH_REDIS_REST_TOKEN` are set (Upstash is deferred infra). Prefer the `rateLimit`
option on `createAction` for sensitive actions (auth, booking, invites); it keys the limit
by the caller's IP automatically. For per-account limits that must hold across IPs (e.g.
per-email sign-in throttling), also call `assertWithinRateLimit(bucket, rule)` inside the
handler with a fully-specified bucket.

> ⚠️ **Go-live gate:** because the limiter fails **open** when unconfigured, auth endpoints
> have no throttling until Upstash env vars are set. Configure Upstash before exposing auth
> (sign-in / sign-up / password reset) to the public internet — do not rely on the no-op in
> any internet-reachable environment.
