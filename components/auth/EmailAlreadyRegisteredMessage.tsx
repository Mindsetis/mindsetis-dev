'use client';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

/**
 * "This email is already registered. Please Log in → to access your account or finish your
 * application." — the field-level message for an address that already has a confirmed account
 * (Release 2 П1). Shown by `HeroEmailCta` (the first `/join` screen) and by `SignUpForm` (when
 * `signUp` itself reports the conflict), so a visitor who edits the address on step 1 gets the
 * same help as one who was stopped before it.
 *
 * It is a component rather than a string because the sentence contains a link, which neither a
 * Zod message nor `FormMessage` (plain text only) can carry. The caller swaps it in for
 * `FormMessage` when the field error equals `EMAIL_ALREADY_REGISTERED`. Same look as
 * `FormMessage`: 14px, `text-error` coral, `role="alert"`.
 *
 * The link goes to `/login?email=…`, which prefills the field; after signing in, the existing
 * `resolveOnboardingRedirect()` returns the visitor to whatever step of the application they
 * had not finished. The address is lower-cased and trimmed here because the field holds what was
 * typed, while `/login` validates the prefill against the normalizing `emailSchema`.
 */
export function EmailAlreadyRegisteredMessage({ email }: { email: string }) {
  const t = useTranslations('auth.emailExists');
  const normalized = email.trim().toLowerCase();

  return (
    <p role="alert" className="text-sm font-normal text-error">
      {t.rich('message', {
        login: (chunks) => (
          <Link
            href={`/login?email=${encodeURIComponent(normalized)}`}
            className="font-bold underline underline-offset-2 hover:text-primary"
          >
            {chunks}
          </Link>
        ),
      })}
    </p>
  );
}
