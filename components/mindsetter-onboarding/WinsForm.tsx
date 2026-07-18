'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  type Control,
  useFieldArray,
  useForm,
  type UseFormReturn,
  useWatch,
} from 'react-hook-form';

import { saveWins } from '@/app/[locale]/mindsetter-onboarding/actions';
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
import { cn } from '@/lib/utils';
import {
  MAX_WIN_DESCRIPTION_LENGTH,
  MAX_WIN_TITLE_LENGTH,
  MAX_WIN_YEAR_LENGTH,
  MAX_WINS,
  type Win,
  WIN_COLORS,
  type WinColor,
  type WinsStepInput,
  winsStepSchema,
} from '@/lib/validation/mindsetter';

type WinsFormProps = {
  /** Already-saved wins, when the caller revisits this block. */
  initialWins?: Win[];
  /** Where "Save and continue" navigates once saved (`nextBlockHref`). */
  nextHref: string;
};

const EMPTY_WIN: Win = { year: '', win: '', description: '', color: 'yellow' };

// TODO confirm exact palette hex from Figma — reasonable stand-ins for the 7 named "win card"
// colors (onboarding doc section 7: "palette of 7 colors (yellow/purple/blue/orange/teal/
// light-blue/pink)"). Keyed here in one map so tweaking the exact shade later is a one-line
// change; the DB only ever stores the color KEY (below), never these hex values.
const WIN_COLOR_SWATCHES: Record<WinColor, string> = {
  yellow: '#F5C518',
  purple: '#A78BFA',
  blue: '#60A5FA',
  orange: '#FB923C',
  teal: '#2DD4BF',
  lightblue: '#7DD3FC',
  pink: '#F472B6',
};

type WinCardProps = {
  control: Control<WinsStepInput>;
  index: number;
  onRemove?: () => void;
};

/** One "Win N" card — Year (40-char counter) + Win (40-char counter) + Description (auto-grow,
 * 200-char counter) + a single-select row of 7 color swatches. */
function WinCard({ control, index, onRemove }: WinCardProps) {
  const t = useTranslations('mindsetterOnboarding');

  const yearValue = useWatch({ control, name: `wins.${index}.year` }) ?? '';
  const winValue = useWatch({ control, name: `wins.${index}.win` }) ?? '';
  const descriptionValue = useWatch({ control, name: `wins.${index}.description` }) ?? '';

  return (
    <Card className="gap-4 px-4 py-4 md:px-6 md:py-6">
      <div className="flex items-center justify-between gap-2">
        <span className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
          {t('blocks.wins.cardTitle', { index: index + 1 })}
        </span>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('blocks.wins.removeWin')}
            className="cursor-pointer text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <FormField
        control={control}
        name={`wins.${index}.year`}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between gap-2">
              <FormLabel>
                <span className="inline-flex items-center gap-1">
                  {t('blocks.wins.yearLabel')} <span className="text-primary">*</span>
                </span>
              </FormLabel>
              <span className="text-tiny text-muted-foreground">
                {t('common.charCount', { count: yearValue.length, max: MAX_WIN_YEAR_LENGTH })}
              </span>
            </div>
            <FormControl>
              <Input
                type="text"
                maxLength={MAX_WIN_YEAR_LENGTH}
                placeholder={t('blocks.wins.yearPlaceholder')}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`wins.${index}.win`}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between gap-2">
              <FormLabel>
                <span className="inline-flex items-center gap-1">
                  {t('blocks.wins.winLabel')} <span className="text-primary">*</span>
                </span>
              </FormLabel>
              <span className="text-tiny text-muted-foreground">
                {t('common.charCount', { count: winValue.length, max: MAX_WIN_TITLE_LENGTH })}
              </span>
            </div>
            <FormControl>
              <Input
                type="text"
                maxLength={MAX_WIN_TITLE_LENGTH}
                placeholder={t('blocks.wins.winPlaceholder')}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`wins.${index}.description`}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between gap-2">
              <FormLabel>
                <span className="inline-flex items-center gap-1">
                  {t('blocks.wins.descriptionLabel')} <span className="text-primary">*</span>
                </span>
              </FormLabel>
              <span className="text-tiny text-muted-foreground">
                {t('common.charCount', {
                  count: descriptionValue.length,
                  max: MAX_WIN_DESCRIPTION_LENGTH,
                })}
              </span>
            </div>
            <FormControl>
              <Textarea
                autoGrow
                maxLength={MAX_WIN_DESCRIPTION_LENGTH}
                placeholder={t('blocks.wins.descriptionPlaceholder', {
                  max: MAX_WIN_DESCRIPTION_LENGTH,
                })}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`wins.${index}.color`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('blocks.wins.colorLabel')}</FormLabel>
            <div role="radiogroup" aria-label={t('blocks.wins.colorLabel')} className="flex gap-3">
              {WIN_COLORS.map((color) => {
                const isSelected = field.value === color;
                return (
                  <button
                    key={color}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={t(`blocks.wins.colorName.${color}`)}
                    onClick={() => field.onChange(color)}
                    className={cn(
                      'flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-colors',
                      isSelected ? 'border-foreground' : 'border-transparent',
                    )}
                    style={{ backgroundColor: WIN_COLOR_SWATCHES[color] }}
                  >
                    {isSelected ? (
                      <Check className="size-4 text-black/70" aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </Card>
  );
}

/** Optional block "My Wins" (onboarding doc section 7). Mirrors `HelpForm.tsx`'s `useFieldArray`
 * structure, plus the per-card color swatch picker. */
export function WinsForm({ initialWins, nextHref }: WinsFormProps) {
  const t = useTranslations('mindsetterOnboarding');
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form: UseFormReturn<WinsStepInput> = useForm<WinsStepInput>({
    resolver: zodResolver(winsStepSchema),
    mode: 'onChange',
    defaultValues: {
      wins: initialWins?.length ? initialWins : [EMPTY_WIN],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'wins' });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const result = await saveWins(values);
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
            <WinCard
              key={field.id}
              control={form.control}
              index={index}
              onRemove={fields.length > 1 ? () => remove(index) : undefined}
            />
          ))}
        </div>

        {fields.length < MAX_WINS ? (
          <Button type="button" variant="outline" size="lg" onClick={() => append(EMPTY_WIN)}>
            <Plus className="size-4" aria-hidden="true" />
            {t('blocks.wins.addWin')}
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
