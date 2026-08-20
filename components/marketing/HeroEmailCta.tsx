'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';

import { recordSignupIntent } from '@/app/[locale]/actions';
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
import { type EmailCaptureInput, emailCaptureSchema } from '@/lib/validation/marketing';

/**
 * Hero "quick start" email capture — Figma "Frame 276" (Welcome Screen, below the heading).
 * Validates the email client-side, best-effort records it as a "signup intent" lead
 * (`recordSignupIntent`, spec §5.2 reworked stage 1.7) via the unauthenticated Server Action
 * (the write itself runs as service-role — see that action's doc comment), then hands
 * the visitor into sign-up regardless of whether that best-effort call succeeded — carrying
 * the email along as a query param so `SignUpForm` can prefill it (Zod-validated again at
 * that boundary via `emailSchema.safeParse` in `app/[locale]/sign-up/page.tsx`). A failure to
 * record the lead is not the visitor's problem (nothing looked wrong to them — they're still
 * headed to sign-up), so it's only logged, never surfaced as an error toast.
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
            render={({ field }) => (
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
                <FormMessage />
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
