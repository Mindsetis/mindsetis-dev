'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState, useTransition } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePathname, useRouter } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { routing } from '@/i18n/routing';

/**
 * Safety cutoff for the "switching…" disabled state. `router.replace` inside the
 * transition normally resolves almost instantly, but if the RSC navigation hangs or
 * errors transiently, `isPending` would otherwise stay `true` forever and permanently
 * lock the control until a full page reload. After this many ms we re-enable the select
 * regardless, so the user can retry.
 */
const PENDING_SAFETY_TIMEOUT_MS = 5000;

/**
 * Client-side language switcher. Renders one entry per locale in `routing.locales`
 * (English-first — see i18n/routing.ts) and navigates to the same path under the chosen
 * locale via next-intl's locale-aware router. No auto-detection: this is the only way the
 * locale changes (CLAUDE.md §i18n).
 */
export function LocaleSwitcher() {
  const t = useTranslations('localeSwitcher');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [stuck, setStuck] = useState(false);

  // Safety net only: while pending, arm a timer that force-clears the disabled state if
  // the navigation never settles. Nothing to do while not pending — `onChange` already
  // resets `stuck` at the start of every new attempt.
  useEffect(() => {
    if (!isPending) return;
    const timeoutId = setTimeout(() => setStuck(true), PENDING_SAFETY_TIMEOUT_MS);
    return () => clearTimeout(timeoutId);
  }, [isPending]);

  function onChange(nextLocale: string) {
    setStuck(false);
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale as AppLocale });
    });
  }

  return (
    <Select value={locale} onValueChange={onChange} disabled={isPending && !stuck}>
      {/*
        Figma "Header PC" (387:1603 etc.) "Language switcher" (666:6919) — Trigger: 57×56
        total (hug-content), rounded-lg (12px, matches default), bg/border = "grey hover"
        #242424 / "grey line" #2a2a2a (no matching token in app/styles/tokens/colors.css —
        closest existing surfaces are --color-card/--color-popover #1a1a1a, --color-border
        #747474; hardcoded here per CLAUDE.md's "hardcode only when no token exists" rule),
        showing just the uppercase locale code ("EN") + the shared chevron icon in white.
      */}
      <SelectTrigger
        id="locale-switcher"
        size="sm"
        aria-label={t('label')}
        // Height tracks the header's Join CTA at BOTH breakpoints — 46px mobile / 56px desktop
        // (`Header.tsx`'s `size="sm"` + `lg:h-14`). A flat `h-14` here made the switcher 10px
        // taller than the button beside it on mobile: both stayed centred on the header's own
        // axis, but the mismatched box heights read as misalignment.
        className="w-auto gap-1 border-[#2a2a2a] bg-[#242424] data-[size=sm]:h-[46px] data-[size=sm]:px-2 data-[size=sm]:py-0 data-[size=sm]:text-body lg:data-[size=sm]:h-14 [&_svg]:text-foreground"
      >
        <SelectValue>{locale.toUpperCase()}</SelectValue>
      </SelectTrigger>
      {/*
        Figma "Menu" (I387:1603;666:6919;668:8451): 148px wide, rounded-lg (12px), same
        grey-hover/grey-line bg+border as the trigger, left-aligned under the trigger
        (align="start" — the menu's left edge matches the trigger's, per the design, not
        "end"). Inner spacing: Figma pads the menu 6px on every side; the shared
        `SelectContent`'s `Viewport` isn't exposed for a className override, so this relies
        on the primitive's own built-in 4px viewport padding (`p-1`) instead — 2px tighter
        than the design, documented deviation (can't touch `select.tsx`).
      */}
      <SelectContent align="start" className="rounded-lg border-[#2a2a2a] bg-[#242424]">
        {routing.locales.map((cur) => (
          // Figma "Option · EN" / "Option · ES" (668:8452 / 668:8455): each option shows the
          // uppercase code + full locale name side by side. The currently-active locale gets
          // a persistent grey-hover background and brand-colored code (vs. white); the name
          // is always secondary-grey. Driven off Radix's own `data-state=checked` (via
          // `group`/`group-data-*`) rather than a manual `cur === locale` check, so it stays
          // in sync with the `Select`'s own selection state.
          <SelectItem
            key={cur}
            value={cur}
            className="group rounded-[8px] py-[9px] pr-[10px] pl-[10px] focus:bg-[#242424] data-[state=checked]:bg-[#242424] [&>span:first-child]:hidden"
          >
            {/* The two labels are wrapped in their own flex row rather than relying on a
                `gap` on `SelectItem`: shadcn puts `children` inside `SelectPrimitive.ItemText`,
                a plain inline span, so a gap on the Item never reaches them — which rendered
                the code and the name glued together ("ENEnglish"). */}
            <span className="flex items-center gap-2">
              <span className="text-body text-foreground group-data-[state=checked]:text-primary">
                {cur.toUpperCase()}
              </span>
              <span className="text-body text-muted-foreground">{t(cur)}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
