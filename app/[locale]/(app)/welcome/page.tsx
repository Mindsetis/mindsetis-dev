import { getTranslations, setRequestLocale } from 'next-intl/server';

import { RegistrationStepHeader } from '@/components/auth/RegistrationStepHeader';
import { WelcomeScreen } from '@/components/auth/WelcomeScreen';
import { pageTitle } from '@/i18n/page-metadata';
import { getSessionContext } from '@/lib/auth/guards';

type WelcomePageProps = {
  params: Promise<{ locale: string }>;
};

const TOTAL_STEPS = 4;

// `auth.welcome.title` carries `<accent>`/`<br>` rich-text markup for `WelcomeScreen`'s `t.rich`
// call, so this points at `metaTitle` — the same heading as plain text — instead. Static rather
// than mirroring `WelcomeScreen`'s later "Continue as Member" phase: that swap happens entirely
// client-side, after this server-rendered `<title>` has already shipped.
export async function generateMetadata({ params }: WelcomePageProps) {
  const { locale } = await params;
  return pageTitle(locale, 'auth.welcome', 'metaTitle');
}

/**
 * Registration wizard "Congrats screen" — the destination *after* the 4-step wizard completes.
 * Reached via step 4's (`/build-profile`) submit handler (`BuildProfileForm.tsx`) once its save
 * succeeds, and linked from the informational "Welcome to Mindsetis" email
 * (`lib/auth/send-welcome-email.ts`'s `actionUrl`) — by this point the visitor has a real,
 * confirmed session (established back at step 2's `/api/auth/confirm` link-click, stage 1.5),
 * so this page needs no session check of its own; nothing here reads from that session either
 * except `username`, passed down for the profile-preview CTA on the second phase.
 *
 * Figma: TWO frames sit behind this one route, and `WelcomeScreen` switches between them —
 * "Congrats screen" `387:3000` (desktop) / `421:3523` (mobile), "…Your Member application has
 * been received", is what loads; pressing "Continue as Member" swaps in `421:3798`, "…You are now
 * a member of the community" with the three Member CTAs. Both the heading and the body change,
 * so both live in that client component and this page keeps only the shell. Shares the shell of
 * the other three
 * wizard steps (`RegistrationStepHeader` — Back link + `RegistrationProgress`, same
 * `max-w-[1440px]` outer / `max-w-[640px]` inner column as `/build-profile`), which this page
 * didn't use before this pass because an earlier (wrong-frame) read concluded there was no Back
 * link here at all. There is one, on both frames — `RegistrationStepHeader` always renders it
 * (unlike the desktop-only Back in `387:3000`'s own layer tree, mobile `421:3523` has none), a
 * deliberate deviation for consistency with the other three steps rather than one extra
 * mobile-only special case; see that component's own doc comment for the reuse rationale.
 * `backHref="/"`: neither Figma frame carries a prototype reaction on the Back link (checked via
 * `get_reactions`, empty), and there's no natural "previous step" once the account already
 * exists — home is a safe, always-valid default, but this destination is UNCONFIRMED, flag if a
 * better one (e.g. a dashboard route) surfaces.
 *
 */
export default async function WelcomePage({ params }: WelcomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth');
  const session = await getSessionContext();

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 pb-20 sm:px-6 md:pt-6 md:pb-[150px] lg:px-[70px]">
      <RegistrationStepHeader
        backHref="/"
        step={4}
        total={TOTAL_STEPS}
        label={t('signUp.stepLabel', { step: 4, total: TOTAL_STEPS })}
      />

      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6 md:gap-8">
        <WelcomeScreen username={session?.profile?.username ?? null} />
      </div>
    </div>
  );
}
