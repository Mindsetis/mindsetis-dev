import { getTranslations, setRequestLocale } from 'next-intl/server';

import { RegistrationBackLink } from '@/components/auth/RegistrationBackLink';
import { MindsetterArrowIcon } from '@/components/icons/mindsetter-arrow-icon';
import { RolesForm } from '@/components/mindsetter-onboarding/RolesForm';
import { Button } from '@/components/ui/button';
import { Link, redirect } from '@/i18n/navigation';
import { getSessionContext } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import type { Role } from '@/lib/validation/mindsetter';

type RolesPageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * Extended Mindsetter onboarding — step 1/5 "Your roles" (ROADMAP stage 1.9 foundation slice,
 * `docs/mindsetter-extended-onboarding.md` section 2). Entered from the "Cool, I want to
 * become a Mindsetter" button on `WhoIsMindsetterDialog` (a signed-in Member). No step/progress
 * indicator anywhere in this flow (product decision D5 — Figma has none) — just a plain Back
 * link (`RegistrationBackLink`), unlike the Member wizard's `RegistrationStepHeader`.
 *
 * `RolesForm`'s submit navigates to `/mindsetter-onboarding/superpowers`.
 *
 * Requires a signed-in user (this reads/writes the caller's own `mindsetter_profiles` row) —
 * redirect to `/login` at the page level, same defense-in-depth as `/member-profile`/
 * `/build-profile` (`middleware.ts`'s `PROTECTED_PREFIXES` + this page's own guard +
 * `requireUser()` in the Server Action).
 */
export default async function MindsetterOnboardingRolesPage({ params }: RolesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('mindsetterOnboarding');
  const tAuth = await getTranslations('auth');

  const session = await getSessionContext();
  if (!session?.profile) {
    redirect({ href: '/login', locale });
    return null;
  }

  const supabase = await createClient();
  // Already-saved roles, so a user revisiting this step (e.g. Back, or resuming later) sees
  // their previously-submitted cards instead of a blank form. No row exists yet for a caller
  // who has never reached this step before — `maybeSingle()` returns `null` rather than
  // erroring, and `RolesForm` treats that the same as "no roles saved yet".
  const { data: mindsetterProfile } = await supabase
    .from('mindsetter_profiles')
    .select('roles')
    .eq('id', session.user.id)
    .maybeSingle();
  const initialRoles = (mindsetterProfile?.roles ?? undefined) as Role[] | undefined;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 pb-20 sm:px-6 md:pt-6 md:pb-[150px] lg:px-[70px]">
      <div className="relative mb-8 md:mb-[100px]">
        <RegistrationBackLink href="/welcome" label={tAuth('signUp.back')} />
      </div>

      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-h1 text-foreground md:text-h3">{t('roles.title')}</h1>
          <p className="text-base text-muted-foreground">{t('roles.subtitle')}</p>
        </div>

        {/* Placeholder destination — the public Mindsetter profile page doesn't exist yet
            (onboarding doc section D). */}
        <Button asChild variant="link" className="w-fit gap-2">
          <Link href="/">
            {t('roles.seeHowItLooks')}
            <MindsetterArrowIcon />
          </Link>
        </Button>

        <RolesForm initialRoles={initialRoles} />
      </div>
    </div>
  );
}
