'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm, type UseFormReturn, useWatch } from 'react-hook-form';

import { savePhilosophy } from '@/app/[locale]/mindsetter-onboarding/actions';
import { applyFieldErrors } from '@/components/auth/applyFieldErrors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from '@/i18n/navigation';
import {
  MAX_PHILOSOPHY_LENGTH,
  type PhilosophyStepInput,
  philosophyStepSchema,
} from '@/lib/validation/mindsetter';

type PhilosophyFormProps = {
  /** Already-saved quote, when the caller revisits this block. */
  initialPhilosophy?: string | null;
  /** Where "Save and continue" navigates once saved (`nextBlockHref`). */
  nextHref: string;
};

/** Optional block "My Philosophy" (onboarding doc section 7) — a single "Quote" card, one
 * field, no "Add" button (unlike every other card-list block, this stores a plain scalar
 * `mindsetter_profiles.philosophy` column, not a jsonb array). */
export function PhilosophyForm({ initialPhilosophy, nextHref }: PhilosophyFormProps) {
  const t = useTranslations('mindsetterOnboarding');
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form: UseFormReturn<PhilosophyStepInput> = useForm<PhilosophyStepInput>({
    resolver: zodResolver(philosophyStepSchema),
    mode: 'onChange',
    defaultValues: {
      philosophy: initialPhilosophy ?? '',
    },
  });

  const quoteValue = useWatch({ control: form.control, name: 'philosophy' }) ?? '';

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const result = await savePhilosophy(values);
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

        <Card className="gap-4 p-4">
          <span className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
            {t('blocks.philosophy.cardTitle')}
          </span>

          <FormField
            control={form.control}
            name="philosophy"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-2">
                  <FormLabel>
                    <span className="inline-flex items-center gap-1">
                      {t('blocks.philosophy.quoteLabel')} <span className="text-primary">*</span>
                    </span>
                  </FormLabel>
                  <span className="text-tiny text-muted-foreground">
                    {t('common.charCount', {
                      count: quoteValue.length,
                      max: MAX_PHILOSOPHY_LENGTH,
                    })}
                  </span>
                </div>
                <FormControl>
                  <Textarea
                    autoGrow
                    maxLength={MAX_PHILOSOPHY_LENGTH}
                    placeholder={t('blocks.philosophy.quotePlaceholder', {
                      max: MAX_PHILOSOPHY_LENGTH,
                    })}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Card>

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
