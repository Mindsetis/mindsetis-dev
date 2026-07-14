import { ArrowLeft } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { RegistrationProgress } from '@/components/auth/RegistrationProgress';
import { ResendConfirmationButton } from '@/components/auth/ResendConfirmationButton';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/auth/guards';

type VerifyEmailPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string }>;
};

const TOTAL_STEPS = 4;

/**
 * Registration wizard step 4/4 — "Check your inbox" (Figma "Registration" flow, the final
 * "Member profile 4/4" frame). Reached after step 3 (`/build-profile`) saves and (re-)sends
 * the sign-up confirmation email.
 *
 * Moved out of the `(auth)` route group (stage 1.2 reorder) — that group's shared bordered-
 * card layout (`(auth)/layout.tsx`) was fine for a standalone static screen, but this step
 * now needs the same Back-link + `RegistrationProgress` + centered `max-w-[640px]` shell as
 * steps 1-3, same reasoning `/sign-up` and `/member-profile` already live outside that group
 * for (see `sign-up/page.tsx`'s doc comment). The URL itself (`/verify-email`) is unchanged —
 * route groups don't appear in the path — so no links elsewhere needed updating.
 *
 * Copy restructure (stage 1.4 Figma audit): eyebrow = the resolved email address itself, a
 * single H1 + subtitle (no embedded email — replaces the old two-paragraph subtitle+
 * description), a "Resend email" button (`ResendConfirmationButton`, backed by the new
 * `verify-email/actions.ts` Server Action), and a "Wrong email? Change it" link back to
 * `/sign-up` to restart with a corrected address. `text-center` is dropped from the shell to
 * match the left-aligned pattern the other three steps already use.
 *
 * This page is reachable in two states (see `verify-email/actions.ts`'s doc comment too):
 *   (a) the caller has a live session (completed steps 1-3 normally) — `getCurrentUser()`
 *       resolves the email server-side, no `?email=` needed.
 *   (b) no session yet — the interim fallback while the hosted "Confirm email" toggle isn't
 *       flipped (see `SignUpForm.tsx`'s doc comment) — the email arrives via `?email=`.
 * Session email wins if somehow both are present.
 *
 * "Back to log in" isn't on this Figma frame — kept rather than removed outright (a user who
 * already confirmed a previous session and lands back on this URL by mistake still needs a
 * way out), but demoted to a small tertiary link below the two new primary actions instead of
 * competing with them for attention.
 */
export default async function VerifyEmailPage({ params, searchParams }: VerifyEmailPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { email } = await searchParams;
  const t = await getTranslations('auth');

  const user = await getCurrentUser();
  const resolvedEmail = user?.email ?? email;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-6 md:py-16 lg:px-[70px]">
      <div className="relative mb-8 flex items-center gap-4 md:mb-12 md:justify-center">
        <Link
          href="/build-profile"
          className="flex shrink-0 items-center gap-2 text-sm font-bold text-foreground hover:text-muted-foreground md:absolute md:top-1/2 md:left-0 md:-translate-y-1/2"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('signUp.back')}
        </Link>

        <div className="w-full max-w-[640px] flex-1 md:flex-none">
          <RegistrationProgress
            step={4}
            total={TOTAL_STEPS}
            label={t('signUp.stepLabel', { step: 4, total: TOTAL_STEPS })}
          />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <div className="flex flex-col gap-2">
          {resolvedEmail ? (
            <span className="text-tiny font-bold tracking-[0.3em] text-primary uppercase">
              {resolvedEmail}
            </span>
          ) : null}
          <h1 className="font-display text-h1 text-foreground md:text-h3">
            {t('verifyEmail.title')}
          </h1>
          <p className="text-body font-medium text-foreground">{t('verifyEmail.subtitle')}</p>
        </div>

        <ResendConfirmationButton email={resolvedEmail} />

        <p className="text-sm text-muted-foreground">
          {t('verifyEmail.wrongEmail')}{' '}
          <Link
            href="/sign-up"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t('verifyEmail.changeIt')}
          </Link>
        </p>

        <Link
          href="/login"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {t('verifyEmail.backToLogin')}
        </Link>
      </div>
    </div>
  );
}
