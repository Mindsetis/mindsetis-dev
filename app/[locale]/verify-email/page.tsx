import { ArrowLeft } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { RegistrationProgress } from '@/components/auth/RegistrationProgress';
import { ResendWelcomeEmailButton } from '@/components/auth/ResendWelcomeEmailButton';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/auth/guards';

type VerifyEmailPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string }>;
};

const TOTAL_STEPS = 4;

/**
 * Registration wizard step 4/4 — "Welcome email sent" (Figma "Registration" flow, the final
 * "Member profile 4/4" frame). Reached after step 3 (`/build-profile`) saves and (re-)sends
 * the "Welcome to Mindsetis" email.
 *
 * NOT a confirmation gate: the account is auto-confirmed and already has a live session by
 * step 1 (`(auth)/actions.ts#signUp`'s doc comment — `signInWithPassword()` unconditionally
 * rejects an unconfirmed Admin-API-created user regardless of the hosted project's global
 * "Confirm email" toggle, so auto-confirming at creation is the only viable path). The email
 * sent from here is purely informational (`lib/auth/send-welcome-email.ts`, this project's own
 * `email_messages` queue, not Supabase Auth's mailer) — there is nothing to wait for, so a
 * "Continue" button always proceeds straight to `/welcome` with no click-through required.
 * "Resend email" (`ResendWelcomeEmailButton`) is kept as a courtesy re-send, demoted to a
 * secondary action below Continue.
 *
 * Moved out of the `(auth)` route group (stage 1.2 reorder) — that group's shared bordered-
 * card layout (`(auth)/layout.tsx`) was fine for a standalone static screen, but this step
 * now needs the same Back-link + `RegistrationProgress` + centered `max-w-[640px]` shell as
 * steps 1-3, same reasoning `/sign-up` and `/member-profile` already live outside that group
 * for (see `sign-up/page.tsx`'s doc comment). The URL itself (`/verify-email`) is unchanged —
 * route groups don't appear in the path — so no links elsewhere needed updating.
 *
 * `getCurrentUser()` resolves the email server-side for the normal case (a live session from
 * completing steps 1-3); `?email=` remains a fallback for the unusual case of an
 * expired/cleared session (mirrors `SignUpForm.tsx`'s error-recovery use of the same param).
 * Session email wins if somehow both are present.
 *
 * "Back to log in" isn't on this Figma frame — kept rather than removed outright (a user who
 * lands back on this URL with no session at all still needs a way out), but demoted to a
 * small tertiary link below the primary actions instead of competing with them for attention.
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

        <Button asChild variant="primaryOutline" size="lg" className="w-full">
          <Link href="/welcome">{t('verifyEmail.continue')}</Link>
        </Button>

        <ResendWelcomeEmailButton />

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
