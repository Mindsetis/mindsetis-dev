import { CheckCircle2 } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

type WelcomePageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * Registration wizard "Congrats screen" (Figma "Congrats screen" frame) — the destination
 * *after* the 4-step wizard completes, shown once `/api/auth/confirm` successfully verifies
 * the sign-up confirmation link (`signUp()` / `build-profile/actions.ts`'s `emailRedirectTo`
 * both point `next` here now, instead of `/`). Not part of `RegistrationProgress` — it isn't
 * another step of the wizard, it's what comes after step 4.
 *
 * CTA scope (stage 1.2): only "Browse the community" (home page). The ROADMAP's other
 * suggested CTAs (Find Mindsetter / Invite to event / Find event / "Find out who a
 * Mindsetter is") don't have a real destination anywhere in the codebase yet — no
 * catalog/events/invite routes, and no Mindsetter-info page — so wiring them now would just
 * be dead links; add them once those pages exist (future stage, per ROADMAP 1.2's own scope
 * note).
 */
export default async function WelcomePage({ params }: WelcomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth');

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col items-center gap-6 px-4 py-16 text-center sm:px-6 md:py-24">
      <CheckCircle2 className="size-12 text-primary" aria-hidden="true" />
      <h1 className="font-display text-h1 text-foreground md:text-h3">{t('welcome.title')}</h1>
      <p className="text-sm text-muted-foreground">{t('welcome.subtitle')}</p>
      <Button asChild variant="primaryOutline" size="lg" className="w-full sm:w-auto">
        <Link href="/">{t('welcome.browseCta')}</Link>
      </Button>
    </div>
  );
}
