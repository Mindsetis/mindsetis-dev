'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';

import { subscribeNewsletter } from '@/app/[locale]/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { useValidationMessage } from '@/components/ui/use-validation-message';
import { type EmailCaptureInput, emailCaptureSchema } from '@/lib/validation/marketing';

/**
 * Footer newsletter signup — Figma "Newsletter" block (Welcome Screen). Submits to the
 * `subscribeNewsletter` Server Action, which writes to the `newsletter_emails` table.
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
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <div className="flex flex-row gap-2 sm:gap-4">
        <div className="flex-1">
          <label htmlFor="newsletter-email" className="sr-only">
            {t('emailLabel')}
          </label>
          <Input
            id="newsletter-email"
            type="email"
            autoComplete="email"
            placeholder={t('placeholder')}
            aria-invalid={!!errors.email}
            className="h-[46px]"
            {...register('email')}
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          className="h-[46px] shrink-0"
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
      <p className="text-tiny text-foreground">{t('consent')}</p>
    </form>
  );
}
