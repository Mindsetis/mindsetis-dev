'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { usePathname } from '@/i18n/navigation';
import { resolveMindsetterWizardLocation } from '@/lib/mindsetter-onboarding/progress';

/**
 * Header slot for the "Continue Registration" CTA of a Member who is mid-way through the
 * Mindsetter wizard. Inside `/mindsetter-onboarding/*` that button points at the screen the
 * visitor is already on (or pops the unsaved-changes dialog), so it is replaced by a plain
 * "Step X of N" label (client request, 03.11.2026); everywhere else the CTA (`children`, rendered
 * by the server header) is untouched.
 *
 * Congrats shows nothing: the wizard is finished there, the profile flips to Mindsetter, and a
 * "Step N of N" label would outlive the wizard.
 *
 * This is a client component only because the header (a server component in a shared layout)
 * cannot see the pathname or the `?blocks=&i=` query that carries the optional-block selection.
 * The layout is dynamic (cookies), so both are available during SSR and the label is in the first
 * HTML, no flicker.
 */
export function MindsetterWizardHeaderSlot({ children }: { children: ReactNode }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const location = resolveMindsetterWizardLocation(pathname, searchParams);
  if (!location) return <>{children}</>;
  if (location.kind === 'congrats') return null;

  return (
    <span
      aria-live="polite"
      className="text-sm font-bold whitespace-nowrap text-muted-foreground lg:text-base"
    >
      {t('wizardStep', { current: location.current, total: location.total })}
    </span>
  );
}
