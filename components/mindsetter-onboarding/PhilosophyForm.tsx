'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm, type UseFormReturn, useWatch } from 'react-hook-form';

import { savePhilosophySection } from '@/app/[locale]/dashboard/profile/actions';
import { savePhilosophy } from '@/app/[locale]/mindsetter-onboarding/actions';
import { applyFieldErrors } from '@/components/auth/applyFieldErrors';
import { useCabinetSaved } from '@/components/dashboard/use-cabinet-saved';
import { StepActions } from '@/components/mindsetter-onboarding/StepActions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from '@/i18n/navigation';
import {
  MAX_PHILOSOPHY_AUTHOR_LENGTH,
  MAX_PHILOSOPHY_LENGTH,
  philosophyCabinetSchema,
  type PhilosophyStepInput,
  philosophyStepSchema,
} from '@/lib/validation/mindsetter';

type PhilosophyFormProps = {
  /** Already-saved quote, when the caller revisits this block. */
  initialPhilosophy?: string | null;
  /** Already-saved attribution, when there is one. */
  initialPhilosophyAuthor?: string | null;
  /** Where "Save and continue" navigates once saved (`nextBlockHref`). */
  nextHref: string;
  /** Cabinet section-editor mode: swaps "Save & Continue" for "Cancel" + "Save changes", and
   * allows saving an EMPTY quote (which is how the section is cleared). Omitted throughout the
   * onboarding wizard, whose behavior is unchanged. */
  editMode?: boolean;
};

/** Optional block "My Philosophy" (onboarding doc section 7) — a single "Quote" card, one
 * field, no "Add" button (unlike every other card-list block, this stores a plain scalar
 * `mindsetter_profiles.philosophy` column, not a jsonb array). */
export function PhilosophyForm({
  initialPhilosophy,
  initialPhilosophyAuthor,
  nextHref,
  editMode,
}: PhilosophyFormProps) {
  const t = useTranslations('mindsetterOnboarding');
  const router = useRouter();
  const notifySaved = useCabinetSaved();
  const [formError, setFormError] = useState<string | null>(null);

  const form: UseFormReturn<PhilosophyStepInput> = useForm<PhilosophyStepInput>({
    resolver: zodResolver(editMode ? philosophyCabinetSchema : philosophyStepSchema),
    mode: 'onChange',
    defaultValues: {
      philosophy: initialPhilosophy ?? '',
      philosophyAuthor: initialPhilosophyAuthor ?? '',
    },
  });

  const quoteValue = useWatch({ control: form.control, name: 'philosophy' }) ?? '';

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const result = editMode ? await savePhilosophySection(values) : await savePhilosophy(values);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.error.fieldErrors);
      setFormError(result.error.message);
      return;
    }

    if (editMode) {
      // Stay on the section, rebased on what was ACTUALLY stored so a later "Cancel" reverts to
      // that. Clearing the quote also clears the author server-side (an attribution with nothing
      // to attribute), so mirror that here — resetting on the raw submitted values would leave a
      // stale author sitting in a field the database has already emptied.
      form.reset(values.philosophy.trim() ? values : { philosophy: '', philosophyAuthor: '' });
      notifySaved();
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

          {/* Who said it. Optional — left blank the profile shows the line unattributed, which is
              the normal case for a Mindsetter quoting themselves. */}
          <FormField
            control={form.control}
            name="philosophyAuthor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('blocks.philosophy.authorLabel')}</FormLabel>
                <FormControl>
                  <Input
                    maxLength={MAX_PHILOSOPHY_AUTHOR_LENGTH}
                    placeholder={t('blocks.philosophy.authorPlaceholder')}
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Card>

        <StepActions
          editMode={editMode}
          isSubmitting={form.formState.isSubmitting}
          onCancel={() => {
            form.reset();
            setFormError(null);
          }}
        />
      </form>
    </Form>
  );
}
