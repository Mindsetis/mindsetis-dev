'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';

import { subscribeNewsletter } from '@/app/[locale]/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { useValidationMessage } from '@/components/ui/use-validation-message';
import { Link } from '@/i18n/navigation';
import { type EmailCaptureInput, emailCaptureSchema } from '@/lib/validation/marketing';

/**
 * Footer newsletter signup — Albina's footer ("Правки 3.0" П13): desktop `Footer / 1 /`
 * (`1706:26218`, form `572:5440`), mobile `Footer mobile / 1 /` (`1780:37290`, form `1780:37231`).
 * Submits to the `subscribeNewsletter` Server Action, which writes to the `newsletter_emails`
 * table.
 *
 * Sizes follow the footer's own two layouts (`xl:` is where `Footer.tsx` switches from the stacked
 * mobile layout to the two-column desktop one): 46px fields + an 8px gap on the stacked layout,
 * 56px fields + a 16px gap on desktop. The button is the design's "Secondary - 2a" — the UI Kit's
 * `primaryOutline` (gradient border, brand-blue label) — fixed at 127px wide in both layouts, so
 * the input takes whatever is left of the row (208px / 357px at the design's widths).
 *
 * The consent line is the design's copy, with the Privacy Policy as a real link. Colour differs
 * between the two frames: white on mobile (`1780:37234`), `secondary text` grey on desktop
 * (`572:5443`) — the link stays white on both.
 */
export function NewsletterForm() {
  const t = useTranslations('footer.newsletter');
  // Zod messages travel as encoded key references (see lib/validation/messages.ts); this form
  // renders its own error instead of going through components/ui/form.tsx, so it has to decode.
  const tValidation = useValidationMessage();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmailCaptureInput>({
    resolver: zodResolver(emailCaptureSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await subscribeNewsletter(values);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success(result.data.alreadySubscribed ? t('alreadySubscribed') : t('success'));
    reset();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 xl:gap-2">
      <div className="flex flex-row gap-2 xl:gap-4">
        <div className="min-w-0 flex-1">
          <label htmlFor="newsletter-email" className="sr-only">
            {t('emailLabel')}
          </label>
          <Input
            id="newsletter-email"
            type="email"
            autoComplete="email"
            placeholder={t('placeholder')}
            aria-invalid={!!errors.email}
            // Figma: 12px padding, 14px regular text / placeholder (`secondary text` grey) — the
            // Input base is 16px/medium with 16px padding.
            className="h-[46px] p-3 text-sm font-normal xl:h-14"
            {...register('email')}
          />
        </div>
        <Button
          type="submit"
          variant="primaryOutline"
          className="h-[46px] w-[127px] shrink-0 px-6 xl:h-14"
          loading={isSubmitting}
        >
          {t('subscribe')}
        </Button>
      </div>
      {errors.email ? (
        <p role="alert" className="text-tiny font-medium text-destructive">
          {tValidation(errors.email.message)}
        </p>
      ) : null}
      <p className="text-tiny text-foreground xl:text-muted-foreground">
        {t.rich('consent', {
          link: (chunks) => (
            <Link href="/privacy-policy" className="text-foreground underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </form>
  );
}
