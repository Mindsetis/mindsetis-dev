'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { savePromo } from '@/app/[locale]/mindsetter-onboarding/actions';
import { applyFieldErrors } from '@/components/auth/applyFieldErrors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FieldHint } from '@/components/ui/field-hint';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useRouter } from '@/i18n/navigation';
import { type PromoStepInput, promoStepSchema } from '@/lib/validation/mindsetter';

type PromoFormProps = {
  /** Already-saved `promo_video` jsonb, when the caller revisits this block. */
  initialPromoVideo?: { youtube?: string | null; vimeo?: string | null } | null;
  /** Where "Save and continue" navigates once saved — the next picked block, or congrats
   * (`nextBlockHref`, computed by the page from the `?blocks=&i=` handoff). */
  nextHref: string;
};

/**
 * Optional block "Promo video" (onboarding doc section 7). Direct video upload is deferred past
 * MVP (decision D4, migration comment on `mindsetter_profiles.promo_video`) — the dropzone
 * below is a disabled visual placeholder only; the actual save path is the YouTube/Vimeo URL
 * pair, both optional.
 */
export function PromoForm({ initialPromoVideo, nextHref }: PromoFormProps) {
  const t = useTranslations('mindsetterOnboarding');
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form: UseFormReturn<PromoStepInput> = useForm<PromoStepInput>({
    resolver: zodResolver(promoStepSchema),
    mode: 'onChange',
    defaultValues: {
      youtube: initialPromoVideo?.youtube ?? '',
      vimeo: initialPromoVideo?.vimeo ?? '',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const result = await savePromo(values);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.error.fieldErrors);
      setFormError(result.error.message);
      return;
    }

    router.push(nextHref);
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 md:gap-6">
        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        {/* Disabled visual placeholder — no real dropzone/upload behind it yet (D4). */}
        <div
          aria-disabled="true"
          className="flex cursor-not-allowed flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed border-border bg-card px-6 py-10 text-center opacity-60"
        >
          <Upload className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-base font-bold text-foreground">{t('blocks.promo.uploadLabel')}</p>
          <p className="text-sm text-muted-foreground">{t('blocks.promo.uploadHint')}</p>
        </div>
        <FieldHint>{t('blocks.promo.uploadComingSoon')}</FieldHint>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
            {t('blocks.promo.orDivider')}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <FormField
          control={form.control}
          name="youtube"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('blocks.promo.youtubeLabel')}</FormLabel>
              <FormControl>
                <Input type="url" placeholder={t('blocks.promo.linkPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="vimeo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('blocks.promo.vimeoLabel')}</FormLabel>
              <FormControl>
                <Input type="url" placeholder={t('blocks.promo.linkPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          variant="primaryOutline"
          size="lg"
          loading={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? t('common.saving') : t('common.saveAndContinue')}
        </Button>
      </form>
    </Form>
  );
}
