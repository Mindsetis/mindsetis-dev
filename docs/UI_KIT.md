# UI Kit / design system (stage 0.8)

Design tokens + base components for the dark Masterclass/Netflix theme (spec §5.11). Source
of truth for _look_ is the Figma design file (`Mindsetis (Copy)`, see CLAUDE.md → "Design
source"); this doc is the concrete "how it's implemented in code".

## Tokens (`app/globals.css`)

Tailwind v4 is CSS-first — there is no `tailwind.config.js`. Every token is a real CSS custom
property emitted inside `@theme { … }`, so utilities like `bg-primary`, `text-h1`, or
`shadow-glow-primary` are generated straight from this file. Single mode — dark only, no
light palette.

### Color

| Token                                                    | Value                             | Use                                     |
| -------------------------------------------------------- | --------------------------------- | --------------------------------------- |
| `--color-background`                                     | `#000000`                         | page background                         |
| `--color-foreground`                                     | `#ffffff`                         | default text                            |
| `--color-card` / `--color-popover`                       | `#1a1a1a`                         | raised surfaces on black                |
| `--color-muted` / `--color-secondary` / `--color-accent` | `#1a1a1a`                         | secondary surfaces                      |
| `--color-muted-foreground`                               | `#a5a5a5`                         | secondary text                          |
| `--color-primary`                                        | **`#79b9e3`** (cyan)              | brand accent — CTAs, focus rings, links |
| `--color-primary-hover` / `-active` / `-disabled`        | `#9ad2ee` / `#5892c3` / `#556780` | primary interaction ramp                |
| `--color-destructive`                                    | `#ff4c58`                         | errors                                  |
| `--color-success`                                        | `#08d6ad`                         | success states                          |
| `--color-border` / `--color-input`                       | `#747474`                         | borders, input outlines                 |
| `--color-ring`                                           | `#79b9e3`                         | focus ring (== brand)                   |

**The brand accent was corrected from an earlier placeholder Netflix-red to the real cyan
`#79b9e3`** once the actual Figma file was read — do not reintroduce a red accent.

### Typography

Display/headings: **Cal Sans** (400 only). Body/UI: **Manrope** (400/500/700). Both loaded
via `next/font/google` in `app/[locale]/layout.tsx`, exposed as CSS variables
(`--font-cal-sans`, `--font-manrope`) and consumed through the semantic tokens
`--font-display` / `--font-sans` (each with an explicit fallback chain, so a font-loading
hiccup never breaks the build).

| Token         | Desktop                        | Mobile (`< 768px`)           |
| ------------- | ------------------------------ | ---------------------------- |
| `--text-h1`   | 5.5rem / 88px, line-height 0.9 | 2rem / 32px, line-height 1.1 |
| `--text-h2`   | 4.5rem / 72px, line-height 0.9 | — (unchanged)                |
| `--text-l`    | 2rem / 32px                    | —                            |
| `--text-m`    | 1.375rem / 22px                | —                            |
| `--text-body` | 1rem / 16px                    | 1rem / 16px (unchanged)      |
| `--text-tiny` | 0.875rem / 14px                | 0.75rem / 12px               |

Mobile overrides are real CSS custom-property re-assignments inside a `@media (max-width:
767px)` block — every `text-h1`/`text-body`/`text-tiny` utility re-resolves below the
breakpoint automatically, no duplicate classes needed.

### Radius — synthesized, flagged for back-check

```
--radius: 0.75rem; /* 12px */
--radius-sm/md/lg/xl derived from --radius via @theme inline (shadcn-style)
```

**Figma had no radius tokens.** This scale was _synthesized_ from the visual design (pill-ish
56px-tall primary buttons, ~12px card corners) rather than pulled from a token. Treat it as a
placeholder: back-check against Figma once radius tokens/components are published there, and
update `--radius` (everything else re-derives automatically).

### Layout & effects

- `--spacing-page` (4rem/64px), `--spacing-section` (5rem/80px), `--container-large`
  (80rem/1280px) — observed layout constants, not Figma tokens either.
- `--shadow-glow-primary` — the primary CTA's soft cyan glow, translated from a Figma "drop
  shadow" effect to a CSS `box-shadow`.

## shadcn/ui config (`components.json`)

`style: "new-york"`, RSC-enabled, `baseColor: "neutral"`, CSS variables on, no prefix, icon
library `lucide-react`. Aliases: `@/components`, `@/lib/utils`, `@/components/ui`, `@/lib`,
`@/hooks`. `lib/utils.ts` exports `cn()` (`clsx` + `tailwind-merge`, last class wins) — use it
in every component that accepts `className`.

## Component inventory (`components/ui/`)

| Component                    | Notes                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Button`                     | Pill-shaped (`rounded-full`). Variants: `primary` (default, cyan + glow), `secondary`, `outline`, `tertiary`, `ghost`, `link`, `nav`. Sizes: `default` (h-11), `sm` (h-9), `lg` (h-14), `icon` (square). `loading` prop swaps in a spinner (`Loader2`, `aria-busy`) and disables the button **without changing layout/size**; not supported with `asChild` (Slot requires a single child). |
| `Input` / `Textarea`         | h-11 / min-h-24, transparent bg, `border-input`; `aria-invalid` styling wired for RHF error state.                                                                                                                                                                                                                                                                                         |
| `Select` (Radix)             | `Select`, `SelectTrigger` (`size: 'sm' \| 'default'`), `SelectContent`, `SelectItem`, `SelectLabel`, `SelectSeparator`.                                                                                                                                                                                                                                                                    |
| `Card`                       | `Card`, `CardHeader`, `CardTitle` (uses `font-display`), `CardDescription`, `CardContent`, `CardFooter`.                                                                                                                                                                                                                                                                                   |
| `Dialog` (Radix)             | Full primitive set incl. `DialogTrigger/Content/Header/Footer/Title/Description`; `showCloseButton` toggle on `DialogContent`.                                                                                                                                                                                                                                                             |
| `Badge`                      | Models the Figma "topic" chip. Variants: `default`, `brand` (primary), `secondary`, `destructive`, `success`, `outline`.                                                                                                                                                                                                                                                                   |
| `Alert`                      | Form-level banner for Server Action results. Variants: `default`, `destructive` (`role="alert"`), `success`. Pairs with `ActionResult` failures/successes from `docs/API_CONVENTIONS.md`.                                                                                                                                                                                                  |
| `Avatar` (Radix)             | `Avatar`, `AvatarImage`, `AvatarFallback`.                                                                                                                                                                                                                                                                                                                                                 |
| `Label`                      | Radix label, disabled/error state styling via `group-data-*` / `peer-disabled`.                                                                                                                                                                                                                                                                                                            |
| `Skeleton`                   | `animate-pulse` placeholder block.                                                                                                                                                                                                                                                                                                                                                         |
| `Toaster` / `toast` (sonner) | Dark-only (`theme="dark"`, fixed — no toggle); CSS vars mapped to the token palette (`--normal-bg` → `--color-popover`, etc.). Mounted once in `app/[locale]/layout.tsx`; call `toast(...)` from anywhere.                                                                                                                                                                                 |
| `StickyMobileCta`            | Bottom-fixed action bar, `md:hidden`, safe-area-aware padding. See pattern below.                                                                                                                                                                                                                                                                                                          |
| `Form*` primitives           | `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage` — wired to React Hook Form. See usage below.                                                                                                                                                                                                                                                 |

## Using the Form primitives (React Hook Form + Zod)

The resolver + Zod schema live in `lib/validation/`; the `Form*` components only own
presentation/accessibility wiring (label ↔ control ↔ error), per `components/ui/form.tsx`.

```tsx
'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { signInSchema } from '@/lib/validation'; // shared Zod schema

const form = useForm({ resolver: zodResolver(signInSchema) });

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input type="email" {...field} />
          </FormControl>
          <FormMessage /> {/* renders the RHF field error automatically */}
        </FormItem>
      )}
    />
    <Button type="submit" loading={form.formState.isSubmitting}>
      Sign in
    </Button>
  </form>
</Form>;
```

`FormMessage` renders `error.message` from RHF's field state automatically — no manual
wiring of error text per field. See `docs/API_CONVENTIONS.md` for mapping server-side
`ActionResult` `fieldErrors` back onto the same form (`setError(field, { message })`).

## Sticky mobile CTA pattern

`StickyMobileCta` is a bottom-fixed, `md:hidden` bar (`components/ui/sticky-mobile-cta.tsx`):
every public page that needs a persistent primary action (book, join, sign up…) renders its
`Button`(s) as children inside it; desktop keeps its inline CTA, and the bar simply doesn't
render there.

```tsx
<StickyMobileCta>
  <Button className="w-full" size="lg">
    Book a session
  </Button>
</StickyMobileCta>
```

## Fonts & root wiring (`app/[locale]/layout.tsx`)

`Manrope` and `Cal_Sans` are loaded via `next/font/google`, each exposing a CSS variable
(`--font-manrope`, `--font-cal-sans`) applied as a `className` on `<html>`. The `dark` class
is also forced on `<html>` unconditionally (no light-mode toggle in MVP scope). `Toaster` is
mounted once here, alongside the shared `Header`/`Footer`.

## Related

- `docs/API_CONVENTIONS.md` — `ActionResult`/`createAction` contract that `Alert`/`FormMessage`
  render, and the RHF-to-server-error mapping pattern.
- `CLAUDE.md` → "Tech stack" (Styling / Forms rows), "Directory conventions"
  (`components/ui/`) — the policy-level source this doc implements.
- Figma file `Mindsetis (Copy)` (via the `figma-designer` subagent / `figma-mcp-go` MCP) —
  the design source of truth; re-check the synthesized radius scale against it once radius
  tokens exist there.
