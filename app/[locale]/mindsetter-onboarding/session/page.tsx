import { getTranslations, setRequestLocale } from 'next-intl/server';

import { RegistrationBackLink } from '@/components/auth/RegistrationBackLink';
import { SessionForm } from '@/components/mindsetter-onboarding/SessionForm';
import { redirect } from '@/i18n/navigation';
import { getSessionContext } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import type { Expertise } from '@/lib/validation/mindsetter';

type SessionPageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * Extended Mindsetter onboarding — step 5/5 "Personal session", now the LAST core step (product
 * decision D9: roles → superpowers → help → shine → [optional blocks] → session → congrats)
 * (`docs/mindsetter-extended-onboarding.md` section 5). The most complex step: maps to
 * `session_settings` (not `mindsetter_profiles`, unlike the three earlier steps) and pulls in
 * the "Topics you're expert in" option source from the (now-earlier) Help step's `help_with`
 * card titles (doc section E.1) — that dependency still holds since Help still runs before this
 * step in the new order.
 *
 * Reached either directly from the "Shine" picker (no blocks picked / Skip) or after every
 * picked optional block is done (`nextBlockHref`, `lib/mindsetter-onboarding/blocks.ts`) — so its
 * Back link points at `/mindsetter-onboarding/shine`, not the last picked block, to keep this
 * page's own chrome independent of how many (if any) optional blocks the caller filled in.
 *
 * Requires a signed-in user — redirect to `/login` at the page level, same defense-in-depth as
 * `../roles/page.tsx`/`../help/page.tsx`.
 *
 * `SessionForm`'s submit navigates to `/mindsetter-onboarding/congrats` — the last core step now
 * flows straight to congrats instead of `/shine`.
 */
export default async function MindsetterOnboardingSessionPage({ params }: SessionPageProps) {
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

  // Two independent reads (different tables), fetched in parallel rather than sequentially.
  const [{ data: mindsetterProfile }, { data: sessionSettings }] = await Promise.all([
    supabase
      .from('mindsetter_profiles')
      .select('help_with')
      .eq('id', session.user.id)
      .maybeSingle(),
    supabase
      .from('session_settings')
      .select(
        'accepts_bookings, session_type, price_cents, duration_min, topics, timezone, available_days, available_from, available_to, fee_consent_accepted',
      )
      .eq('mindsetter_id', session.user.id)
      .maybeSingle(),
  ]);

  // Card titles from "You can help with" (previous step) are the option source for this step's
  // topics multiselect (doc section E.1) — not the raw stored objects.
  const expertise = (mindsetterProfile?.help_with ?? []) as Expertise[];
  const topicOptions = expertise.map((item) => item.title).filter(Boolean);

  // Already-saved session settings, so a user revisiting this step sees their previously-
  // submitted config instead of the form's own defaults. `available_from`/`available_to` come
  // back from Postgres as `HH:mm:ss` — sliced to `HH:mm` to match the `<input type="time">`/
  // Zod `timeStringSchema` shape the form and its schema both expect.
  const initialSessionSettings = sessionSettings
    ? {
        acceptsBookings: sessionSettings.accepts_bookings,
        sessionType: (sessionSettings.session_type ?? 'free') as 'free' | 'paid',
        priceCents: sessionSettings.price_cents,
        durationMin: sessionSettings.duration_min ?? 30,
        topics: sessionSettings.topics ?? [],
        timezone: sessionSettings.timezone ?? '',
        availableDays: sessionSettings.available_days ?? [],
        availableFrom: sessionSettings.available_from?.slice(0, 5) ?? '10:00',
        availableTo: sessionSettings.available_to?.slice(0, 5) ?? '18:00',
        feeConsentAccepted: sessionSettings.fee_consent_accepted ?? false,
      }
    : undefined;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 pb-20 sm:px-6 md:pt-6 md:pb-[150px] lg:px-[70px]">
      <div className="relative mb-8 md:mb-[28px]">
        <RegistrationBackLink
          href="/mindsetter-onboarding/shine"
          label={tAuth('signUp.back')}
          className="md:static md:translate-y-0"
        />
      </div>

      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <div className="flex flex-col gap-3 md:gap-4">
          <h1 className="font-display text-h1 text-foreground md:text-h3">{t('session.title')}</h1>
          <p className="text-base font-medium text-white">{t('session.subtitle')}</p>
        </div>

        <SessionForm topicOptions={topicOptions} initialSessionSettings={initialSessionSettings} />
      </div>
    </div>
  );
}
