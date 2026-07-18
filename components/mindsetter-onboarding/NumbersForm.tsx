'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  type Control,
  useFieldArray,
  useForm,
  type UseFormReturn,
  useWatch,
} from 'react-hook-form';

import { saveNumbers } from '@/app/[locale]/mindsetter-onboarding/actions';
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
import { Input } from '@/components/ui/input';
import { useRouter } from '@/i18n/navigation';
import {
  MAX_NUMBER_LABEL_LENGTH,
  MAX_NUMBER_VALUE_LENGTH,
  MAX_NUMBERS,
  type NumberItem,
  type NumbersStepInput,
  numbersStepSchema,
} from '@/lib/validation/mindsetter';

type NumbersFormProps = {
  /** Already-saved numbers, when the caller revisits this block. */
  initialNumbers?: NumberItem[];
  /** Where "Save and continue" navigates once saved (`nextBlockHref`). */
  nextHref: string;
};

const EMPTY_NUMBER: NumberItem = { value: '', label: '' };

type NumberCardProps = {
  control: Control<NumbersStepInput>;
  index: number;
  onRemove?: () => void;
};

/** One "Number N" card — Value (40-char counter) + Label (40-char counter), e.g. "3×" /
 * "Platforms founded". Mirrors `ExpertiseCard`'s structure, just two `Input`s instead of an
 * Input + Textarea. */
function NumberCard({ control, index, onRemove }: NumberCardProps) {
  const t = useTranslations('mindsetterOnboarding');

  const valueValue = useWatch({ control, name: `numbers.${index}.value` }) ?? '';
  const labelValue = useWatch({ control, name: `numbers.${index}.label` }) ?? '';

  return (
    <Card className="gap-4 px-4 py-4 md:px-6 md:py-6">
      <div className="flex items-center justify-between gap-2">
        <span className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
          {t('blocks.numbers.cardTitle', { index: index + 1 })}
        </span>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('blocks.numbers.removeNumber')}
            className="cursor-pointer text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <FormField
        control={control}
        name={`numbers.${index}.value`}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between gap-2">
              <FormLabel>
                <span className="inline-flex items-center gap-1">
                  {t('blocks.numbers.valueLabel')} <span className="text-primary">*</span>
                </span>
              </FormLabel>
              <span className="text-tiny text-muted-foreground">
                {t('common.charCount', { count: valueValue.length, max: MAX_NUMBER_VALUE_LENGTH })}
              </span>
            </div>
            <FormControl>
              <Input
                type="text"
                maxLength={MAX_NUMBER_VALUE_LENGTH}
                placeholder={t('blocks.numbers.valuePlaceholder')}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`numbers.${index}.label`}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between gap-2">
              <FormLabel>
                <span className="inline-flex items-center gap-1">
                  {t('blocks.numbers.labelLabel')} <span className="text-primary">*</span>
                </span>
              </FormLabel>
              <span className="text-tiny text-muted-foreground">
                {t('common.charCount', { count: labelValue.length, max: MAX_NUMBER_LABEL_LENGTH })}
              </span>
            </div>
            <FormControl>
              <Input
                type="text"
                maxLength={MAX_NUMBER_LABEL_LENGTH}
                placeholder={t('blocks.numbers.labelPlaceholder')}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </Card>
  );
}

/** Optional block "Numbers" (onboarding doc section 7 / decision E.2 — no dedicated desktop
 * Figma frame, built in the same card-list style as the other blocks). Mirrors `HelpForm.tsx`'s
 * `useFieldArray` structure. */
export function NumbersForm({ initialNumbers, nextHref }: NumbersFormProps) {
  const t = useTranslations('mindsetterOnboarding');
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form: UseFormReturn<NumbersStepInput> = useForm<NumbersStepInput>({
    resolver: zodResolver(numbersStepSchema),
    mode: 'onChange',
    defaultValues: {
      numbers: initialNumbers?.length ? initialNumbers : [EMPTY_NUMBER],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'numbers' });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const result = await saveNumbers(values);
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

        <div className="flex flex-col gap-4">
          {fields.map((field, index) => (
            <NumberCard
              key={field.id}
              control={form.control}
              index={index}
              onRemove={fields.length > 1 ? () => remove(index) : undefined}
            />
          ))}
        </div>

        {fields.length < MAX_NUMBERS ? (
          <Button type="button" variant="outline" size="lg" onClick={() => append(EMPTY_NUMBER)}>
            <Plus className="size-4" aria-hidden="true" />
            {t('blocks.numbers.addNumber')}
          </Button>
        ) : null}

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
