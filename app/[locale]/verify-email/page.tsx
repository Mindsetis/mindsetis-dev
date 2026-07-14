import { ArrowLeft } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { RegistrationProgress } from '@/components/auth/RegistrationProgress';
import { Link } from '@/i18n/navigation';

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
 */
export default async function VerifyEmailPage({ params, searchParams }: VerifyEmailPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { email } = await searchParams;
  const t = await getTranslations('auth');

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

      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4 text-center">
        <h1 className="font-display text-h1 text-foreground md:text-h3">
          {t('verifyEmail.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {email ? t('verifyEmail.subtitle', { email }) : t('verifyEmail.subtitleGeneric')}
        </p>
        <p className="text-sm text-muted-foreground">{t('verifyEmail.description')}</p>
        <Link
          href="/login"
          className="mt-2 text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t('verifyEmail.backToLogin')}
        </Link>
      </div>
    </div>
  );
}
