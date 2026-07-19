'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  type Control,
  useFieldArray,
  useForm,
  type UseFormReturn,
  useWatch,
} from 'react-hook-form';

import { saveFckups } from '@/app/[locale]/mindsetter-onboarding/actions';
import { applyFieldErrors } from '@/components/auth/applyFieldErrors';
import { CollapsibleCard, DeleteIcon } from '@/components/mindsetter-onboarding/CollapsibleCard';
import { SortableList } from '@/components/mindsetter-onboarding/SortableList';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
  type Fckup,
  type FckupsStepInput,
  fckupsStepSchema,
  MAX_FCKUP_STORY_LENGTH,
  MAX_FCKUPS,
} from '@/lib/validation/mindsetter';

type FckupsFormProps = {
  /** Already-saved f*ckups, when the caller revisits this block. */
  initialFckups?: Fckup[];
  /** Where "Save and continue" navigates once saved (`nextBlockHref`). */
  nextHref: string;
};

const EMPTY_FCKUP: Fckup = { story: '' };

type FckupCardProps = {
  control: Control<FckupsStepInput>;
  index: number;
  onRemove?: () => void;
  /** Sortable id (the `useFieldArray` field id) + whether this card can be reordered — the parent
   * wraps the list in `SortableList`; see `CollapsibleCard`. */
  id: string;
  draggable: boolean;
};

/** One "F*ckup N" card — a single Story field (auto-grow, 200-char counter). Wrapped in
 * `CollapsibleCard` (stage 1.9 "collapse-on-blur") — collapses once the story is filled AND the
 * caller clicks outside it; the collapsed summary shows a truncated 2-line preview of the story
 * (there's no separate title field here, unlike Wins/Numbers). */
function FckupCard({ control, index, onRemove, id, draggable }: FckupCardProps) {
  const t = useTranslations('mindsetterOnboarding');

  const storyValue = useWatch({ control, name: `fckups.${index}.story` }) ?? '';
  const isFilled = storyValue.trim().length > 0;

  return (
    <CollapsibleCard
      isFilled={isFilled}
      title={
        <span className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
          {t('blocks.fckups.cardTitle', { index: index + 1 })}
        </span>
      }
      onDelete={onRemove}
      deleteLabel={t('blocks.fckups.removeFckup')}
      editLabel={t('common.edit')}
      reorderLabel={t('common.reorder')}
      id={id}
      draggable={draggable}
      collapsedSummary={
        <div className="flex flex-col gap-1">
          <p className="line-clamp-2 text-tiny text-[#a5a5a5]">{storyValue}</p>
        </div>
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
          {t('blocks.fckups.cardTitle', { index: index + 1 })}
        </span>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('blocks.fckups.removeFckup')}
            className="cursor-pointer"
          >
            <DeleteIcon />
          </button>
        ) : null}
      </div>

      <FormField
        control={control}
        name={`fckups.${index}.story`}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between gap-2">
              <FormLabel>
                <span className="inline-flex items-center gap-1">
                  {t('blocks.fckups.storyLabel')} <span className="text-primary">*</span>
                </span>
              </FormLabel>
              <span className="text-tiny text-muted-foreground">
                {t('common.charCount', { count: storyValue.length, max: MAX_FCKUP_STORY_LENGTH })}
              </span>
            </div>
            <FormControl>
              <Textarea
                autoGrow
                maxLength={MAX_FCKUP_STORY_LENGTH}
                placeholder={t('blocks.fckups.storyPlaceholder', { max: MAX_FCKUP_STORY_LENGTH })}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </CollapsibleCard>
  );
}

/** Optional block "My F*ckUp(s)" (onboarding doc section 7). Mirrors `HelpForm.tsx`'s
 * `useFieldArray` structure; the add-button copy is "Add f*ckup" — the design mockup wrongly
 * says "Add stage" here, fixed per the onboarding doc's E.4 silent-fix list. */
export function FckupsForm({ initialFckups, nextHref }: FckupsFormProps) {
  const t = useTranslations('mindsetterOnboarding');
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form: UseFormReturn<FckupsStepInput> = useForm<FckupsStepInput>({
    resolver: zodResolver(fckupsStepSchema),
    mode: 'onChange',
    defaultValues: {
      fckups: initialFckups?.length ? initialFckups : [EMPTY_FCKUP],
    },
  });

  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: 'fckups' });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const result = await saveFckups(values);
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

        <SortableList ids={fields.map((field) => field.id)} onReorder={move}>
          <div className="flex flex-col gap-3 md:gap-4">
            {fields.map((field, index) => (
              <FckupCard
                key={field.id}
                id={field.id}
                control={form.control}
                index={index}
                onRemove={fields.length > 1 ? () => remove(index) : undefined}
                draggable={fields.length > 1}
              />
            ))}
          </div>
        </SortableList>

        {fields.length < MAX_FCKUPS ? (
          <Button type="button" variant="outline" size="lg" onClick={() => append(EMPTY_FCKUP)}>
            <Plus className="size-4" aria-hidden="true" />
            {t('blocks.fckups.addFckup')}
          </Button>
        ) : null}

        <Button
          type="submit"
          variant="primaryOutline"
          size="lg"
          loading={form.formState.isSubmitting}
          // The parent's `gap-4 md:gap-6` (16px/24px) already spaces every sibling — this
          // negative margin narrows JUST this gap (Add f*ckup → Save and continue) down to the
          // requested 12px mobile / 16px desktop, without touching spacing elsewhere in the form.
          className={fields.length < MAX_FCKUPS ? 'mt-[-4px] md:mt-[-8px]' : undefined}
        >
          {form.formState.isSubmitting ? t('common.saving') : t('common.saveAndContinue')}
        </Button>
      </form>
    </Form>
  );
}
