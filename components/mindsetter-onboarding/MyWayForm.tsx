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

import { saveMyWay } from '@/app/[locale]/mindsetter-onboarding/actions';
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
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from '@/i18n/navigation';
import {
  MAX_MY_WAY,
  MAX_MY_WAY_DESCRIPTION_LENGTH,
  MAX_MY_WAY_PROJECT_LENGTH,
  MAX_MY_WAY_YEAR_LENGTH,
  type MyWayStage,
  type MyWayStepInput,
  myWayStepSchema,
} from '@/lib/validation/mindsetter';

type MyWayFormProps = {
  /** Already-saved stages, when the caller revisits this block. */
  initialMyWay?: MyWayStage[];
  /** Where "Save and continue" navigates once saved (`nextBlockHref`). */
  nextHref: string;
};

const EMPTY_STAGE: MyWayStage = { project: '', description: '', yearFrom: '', yearTo: '' };

type MyWayCardProps = {
  control: Control<MyWayStepInput>;
  index: number;
  onRemove?: () => void;
};

/** One "Stage N" card — Project name (40-char counter) + Description (auto-grow, 200-char
 * counter) + Years as two short inputs in a row with a "–" separator (example "2016 – 2020"). */
function MyWayCard({ control, index, onRemove }: MyWayCardProps) {
  const t = useTranslations('mindsetterOnboarding');

  const projectValue = useWatch({ control, name: `myWay.${index}.project` }) ?? '';
  const descriptionValue = useWatch({ control, name: `myWay.${index}.description` }) ?? '';
  const yearFromValue = useWatch({ control, name: `myWay.${index}.yearFrom` }) ?? '';
  const yearToValue = useWatch({ control, name: `myWay.${index}.yearTo` }) ?? '';

  return (
    <Card className="gap-4 px-4 py-4 md:px-6 md:py-6">
      <div className="flex items-center justify-between gap-2">
        <span className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
          {t('blocks.myWay.cardTitle', { index: index + 1 })}
        </span>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('blocks.myWay.removeStage')}
            className="cursor-pointer text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <FormField
        control={control}
        name={`myWay.${index}.project`}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between gap-2">
              <FormLabel>
                <span className="inline-flex items-center gap-1">
                  {t('blocks.myWay.projectLabel')} <span className="text-primary">*</span>
                </span>
              </FormLabel>
              <span className="text-tiny text-muted-foreground">
                {t('common.charCount', {
                  count: projectValue.length,
                  max: MAX_MY_WAY_PROJECT_LENGTH,
                })}
              </span>
            </div>
            <FormControl>
              <Input
                type="text"
                maxLength={MAX_MY_WAY_PROJECT_LENGTH}
                placeholder={t('blocks.myWay.projectPlaceholder')}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`myWay.${index}.description`}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between gap-2">
              <FormLabel>
                <span className="inline-flex items-center gap-1">
                  {t('blocks.myWay.descriptionLabel')} <span className="text-primary">*</span>
                </span>
              </FormLabel>
              <span className="text-tiny text-muted-foreground">
                {t('common.charCount', {
                  count: descriptionValue.length,
                  max: MAX_MY_WAY_DESCRIPTION_LENGTH,
                })}
              </span>
            </div>
            <FormControl>
              <Textarea
                autoGrow
                maxLength={MAX_MY_WAY_DESCRIPTION_LENGTH}
                placeholder={t('blocks.myWay.descriptionPlaceholder', {
                  max: MAX_MY_WAY_DESCRIPTION_LENGTH,
                })}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div>
        <FormLabel>
          <span className="inline-flex items-center gap-1">
            {t('blocks.myWay.yearsLabel')} <span className="text-primary">*</span>
          </span>
        </FormLabel>
        <div className="mt-2 flex items-start gap-2">
          <FormField
            control={control}
            name={`myWay.${index}.yearFrom`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-tiny text-muted-foreground">
                    {t('blocks.myWay.yearFromLabel')}
                  </span>
                  <span className="text-tiny text-muted-foreground">
                    {t('common.charCount', {
                      count: yearFromValue.length,
                      max: MAX_MY_WAY_YEAR_LENGTH,
                    })}
                  </span>
                </div>
                <FormControl>
                  <Input
                    type="text"
                    maxLength={MAX_MY_WAY_YEAR_LENGTH}
                    placeholder={t('blocks.myWay.yearFromPlaceholder')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <span className="mt-4 shrink-0 text-muted-foreground" aria-hidden="true">
            –
          </span>

          <FormField
            control={control}
            name={`myWay.${index}.yearTo`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-tiny text-muted-foreground">
                    {t('blocks.myWay.yearToLabel')}
                  </span>
                  <span className="text-tiny text-muted-foreground">
                    {t('common.charCount', {
                      count: yearToValue.length,
                      max: MAX_MY_WAY_YEAR_LENGTH,
                    })}
                  </span>
                </div>
                <FormControl>
                  <Input
                    type="text"
                    maxLength={MAX_MY_WAY_YEAR_LENGTH}
                    placeholder={t('blocks.myWay.yearToPlaceholder')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </Card>
  );
}

/** Optional block "My Way" (onboarding doc section 7). Mirrors `HelpForm.tsx`'s `useFieldArray`
 * structure, plus the Years-range sub-row. */
export function MyWayForm({ initialMyWay, nextHref }: MyWayFormProps) {
  const t = useTranslations('mindsetterOnboarding');
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form: UseFormReturn<MyWayStepInput> = useForm<MyWayStepInput>({
    resolver: zodResolver(myWayStepSchema),
    mode: 'onChange',
    defaultValues: {
      myWay: initialMyWay?.length ? initialMyWay : [EMPTY_STAGE],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'myWay' });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const result = await saveMyWay(values);
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
            <MyWayCard
              key={field.id}
              control={form.control}
              index={index}
              onRemove={fields.length > 1 ? () => remove(index) : undefined}
            />
          ))}
        </div>

        {fields.length < MAX_MY_WAY ? (
          <Button type="button" variant="outline" size="lg" onClick={() => append(EMPTY_STAGE)}>
            <Plus className="size-4" aria-hidden="true" />
            {t('blocks.myWay.addStage')}
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
