'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';

import { checkJoinEmail } from '@/app/[locale]/(app)/join/actions';
import { recordSignupIntent } from '@/app/[locale]/actions';
import { EmailAlreadyRegisteredMessage } from '@/components/auth/EmailAlreadyRegisteredMessage';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Link, useRouter } from '@/i18n/navigation';
import { EMAIL_ALREADY_REGISTERED } from '@/lib/validation/auth';
import { type EmailCaptureInput, emailCaptureSchema } from '@/lib/validation/marketing';

/**
 * Hero "quick start" email capture — Figma "Frame 276" (Welcome Screen, below the heading).
 * Validates the email client-side, then asks the server whether it already belongs to a confirmed
 * account (`checkJoinEmail`, Release 2 П1) — if so it stops here with an "already registered —
 * Log in →" message instead of navigating. Otherwise best-effort records it as a "signup intent" lead
 * (`recordSignupIntent`, spec §5.2 reworked stage 1.7) via the unauthenticated Server Action
 * (the write itself runs as service-role — see that action's doc comment), then hands
 * the visitor into sign-up regardless of whether that best-effort call succeeded — carrying
 * the email along as a query param so `SignUpForm` can prefill it (Zod-validated again at
 * that boundary via `emailSchema.safeParse` in `app/[locale]/(app)/sign-up/page.tsx`). A
 * failure to record the lead is not the visitor's problem (nothing looked wrong to them —
 * they're still headed to sign-up), so it's only logged, never surfaced as an error toast.
 *
 * Reachable only with `COMING_SOON_MODE` off, along with the rest of the landing page — the
 * `/sign-up` this pushes to is itself redirected back to `/` while the gate is up.
 *
 * The legal line below the button (`home.hero.legal`, added 2026-08-18) links to the two real
 * legal pages built the same day (`/terms-of-use`, `/privacy-policy` — see `LegalPage`). Two
 * SEPARATE links, not one combined one: Figma's text node reports `fontFamily`/`fills`/
 * `textDecoration` all as `"mixed"` (more than a two-way plain/link split would produce) and
 * the sentence needs two different destinations anyway now that both pages exist, so `t.rich`
 * takes two tags (`terms`, `privacy`) instead of one. Sits in its own `gap-6` wrapper around the
 * `<form>` (not the form's own `gap-4 md:gap-6`) because the button→legal gap measures a
 * constant 24px on both breakpoints in Figma, unlike the form's own internal field→button gap
 * (16px mobile / 24px desktop).
 */
export function HeroEmailCta() {
  const t = useTranslations('home.hero');
  const router = useRouter();

  const form = useForm<EmailCaptureInput>({
    resolver: zodResolver(emailCaptureSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    // Ask first whether this address already has a confirmed account (Release 2 П1). If it does
    // the visitor stays here and is shown "already registered — Log in →" under the field,
    // instead of being walked through a sign-up form that could only end in a conflict. Anything
    // other than a clear "yes" — unknown address, unconfirmed address (signing up again just
    // re-sends the confirmation mail), a tripped rate limit, a failed lookup — carries on to
    // sign-up exactly as before; `signUp` has its own duplicate check as the backstop.
    const check = await checkJoinEmail({ email });
    if (check.ok && check.data.hasAccount) {
      form.setError('email', { type: 'server', message: EMAIL_ALREADY_REGISTERED });
      return;
    }
    if (!check.ok) {
      console.warn(
        '[HeroEmailCta] checkJoinEmail unavailable, continuing to sign-up:',
        check.error,
      );
    }

    const result = await recordSignupIntent({ email });
    if (!result.ok) {
      console.error('[HeroEmailCta] recordSignupIntent failed:', result.error);
    }
    router.push(`/sign-up?email=${encodeURIComponent(email)}`);
  });

  return (
    <div className="flex flex-col gap-6">
      <Form {...form}>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 md:gap-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>
                  <span className="inline-flex items-center gap-1">
                    {t('emailLabel')} <span className="text-primary">*</span>
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder={t('emailPlaceholder')}
                    className="h-14 rounded-xl"
                    {...field}
                  />
                </FormControl>
                {/* `FormMessage` prints plain text only; this one needs a link inside it. */}
                {fieldState.error?.message === EMAIL_ALREADY_REGISTERED ? (
                  <EmailAlreadyRegisteredMessage email={field.value} />
                ) : (
                  <FormMessage />
                )}
              </FormItem>
            )}
          />

          <Button
            type="submit"
            variant="primaryOutline"
            size="lg"
            className="w-full"
            loading={form.formState.isSubmitting}
          >
            {t('continue')}
          </Button>
        </form>
      </Form>

      <p className="text-tiny text-muted-foreground">
        {t.rich('legal', {
          terms: (chunks) => (
            <Link
              href="/terms-of-use"
              className="text-foreground underline transition-colors hover:text-primary"
            >
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link
              href="/privacy-policy"
              className="text-foreground underline transition-colors hover:text-primary"
            >
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}
