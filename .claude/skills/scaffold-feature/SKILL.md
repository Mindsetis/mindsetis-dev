---
name: scaffold-feature
description: >-
  Scaffold a new functional module for Mindsetis (from spec §5) — a localized RSC route,
  a Server Action with a Zod schema, i18n keys, and a matching migration/RLS stub. Use
  when the user says "scaffold", "start the <feature> module", "create the page + action",
  or begins a new feature area (catalog, booking, events, admin, etc.).
---

# Skill: scaffold-feature

Create the standard skeleton for a feature so it follows `CLAUDE.md` from the first commit.
Delegate UI depth to `nextjs-frontend` and schema depth to `supabase-expert`.

## Steps

1. **Locate the feature in the spec.** Map the request to a module in
   `docs/mindsetis-mvp-tz.md` §5 (e.g. 5.6 catalog+AI, 5.8 booking, 5.10 events, 5.14 admin).
2. **Route (RSC):** `app/[locale]/<feature>/page.tsx` as a Server Component. Fetch data with
   `lib/supabase/server.ts`. Add loading/error states. Public pages are responsive with a
   sticky mobile CTA.
3. **Server Action + Zod:** `app/[locale]/<feature>/actions.ts` with `"use server"`. Define
   the Zod schema in `lib/validation/<feature>.ts` and validate at the top of each action.
   Enforce the permission matrix on the server (Verified-Member gates for booking / events /
   invite).
4. **Client island only if needed:** a `"use client"` component + React Hook Form + Zod for
   interactive forms; use `lib/supabase/browser.ts`. Otherwise stay in RSC.
5. **i18n:** add all copy keys via the `add-i18n-keys` skill (English-first). No hardcoded
   strings.
6. **Data layer:** if the feature needs tables/columns, create a migration via the
   `new-migration` skill (RLS + policies included). Money tables stay service-role write only.
7. **Wire nav / entry points** and respect togglable modules (payments, AI search gated by
   admin flag) where relevant.

## Output checklist

- [ ] `app/[locale]/<feature>/page.tsx` (RSC) + `actions.ts` (`"use server"`, Zod-validated).
- [ ] `lib/validation/<feature>.ts` schema reused by form + action.
- [ ] i18n keys added to `messages/en.json`.
- [ ] Migration + RLS if new data is introduced.
- [ ] Correct Supabase client per context; service role never client-side.
- [ ] Permission gates enforced server-side.
