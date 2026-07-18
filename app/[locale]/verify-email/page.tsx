import { getTranslations, setRequestLocale } from 'next-intl/server';

import { RegistrationStepHeader } from '@/components/auth/RegistrationStepHeader';
import { ResendConfirmationEmailButton } from '@/components/auth/ResendConfirmationEmailButton';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/auth/guards';

type VerifyEmailPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string }>;
};

const TOTAL_STEPS = 4;

/**
 * Registration wizard step 2/4 — "Check your inbox" (Figma "Registration" flow). Reached
 * right after step 1 (`/sign-up`) creates the (unconfirmed) account.
 *
 * A REAL blocking confirmation gate (stage 1.5 rework — this used to be step 4/4 and was
 * purely informational, skippable via a "Continue" button, because signup auto-confirmed at
 * creation; see git history / `(auth)/actions.ts#signUp`'s doc comment for that now-removed
 * architecture). `supabase.auth.signUp()` (anon client, `(auth)/actions.ts#signUp`) now creates
 * an unconfirmed user with NO session — the visitor must click the confirmation link mailed to
 * them, which hits `/api/auth/confirm` and calls `verifyOtp()`, establishing both the
 * confirmation AND a real session in one step. There is therefore intentionally no "Continue"
 * button here: nothing to proceed into without a session, and no bypass is meant to exist.
 * Once the link is clicked, `/api/auth/confirm` redirects straight into step 3
 * (`/member-profile`, via the `next=/member-profile` query param baked into the Supabase Auth
 * "Confirm signup" email template — a dashboard config, not code).
 *
 * Moved out of the `(auth)` route group (stage 1.2 reorder) — that group's shared bordered-
 * card layout (`(auth)/layout.tsx`) was fine for a standalone static screen, but this step
 * needs the same Back-link + `RegistrationProgress` + centered `max-w-[640px]` shell as the
 * other steps, same reasoning `/sign-up` and `/member-profile` already live outside that group
 * for (see `sign-up/page.tsx`'s doc comment). The URL itself (`/verify-email`) is unchanged —
 * route groups don't appear in the path.
 *
 * There is normally no session at this point (that's the whole point of the gate), so `?email=`
 * — set by `SignUpForm.tsx`'s redirect — is the primary source for the displayed address.
 * `getCurrentUser()` stays as a defensive fallback for the unusual case of landing back here
 * with a still-live session (e.g. browser Back after confirming); session email wins if somehow
 * both are present.
 *
 * Stage 1.6: the "Back to log in" tertiary link (added in stage 1.5 as an escape hatch for a
 * visitor with no session at all landing here) was removed per the user's copy tweaks — the
 * "Wrong email? Change it" link back to `/sign-up` remains the only way out of this step.
 */
export default async function VerifyEmailPage({ params, searchParams }: VerifyEmailPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { email } = await searchParams;
  const t = await getTranslations('auth');

  const user = await getCurrentUser();
  const resolvedEmail = user?.email ?? email;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 pb-20 sm:px-6 md:pt-6 md:pb-[150px] lg:px-[70px]">
      <RegistrationStepHeader
        backHref="/sign-up"
        step={2}
        total={TOTAL_STEPS}
        label={t('signUp.stepLabel', { step: 2, total: TOTAL_STEPS })}
      />

      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <div className="flex flex-col gap-2">
          {resolvedEmail ? (
            <span className="text-tiny font-bold tracking-[0.3em] text-primary uppercase">
              {resolvedEmail}
            </span>
          ) : null}
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-h1 text-foreground md:text-h3">
              {t('verifyEmail.title')}
            </h1>
            <p className="text-body font-medium text-foreground">{t('verifyEmail.subtitle')}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {resolvedEmail ? <ResendConfirmationEmailButton email={resolvedEmail} /> : null}

          <p className="text-center text-base text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span className="text-foreground">{t('verifyEmail.wrongEmail')}</span>
              <Link
                href="/sign-up"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {t('verifyEmail.changeIt')}
              </Link>
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
