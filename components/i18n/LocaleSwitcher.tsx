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
      <SelectTrigger
        id="locale-switcher"
        size="sm"
        aria-label={t('label')}
        className="w-[92px] gap-1"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {routing.locales.map((cur) => (
          <SelectItem key={cur} value={cur}>
            {t(cur)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
