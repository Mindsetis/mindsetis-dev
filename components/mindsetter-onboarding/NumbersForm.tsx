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

import { saveNumbersSection } from '@/app/[locale]/(app)/dashboard/profile/actions';
import { saveNumbers } from '@/app/[locale]/(app)/mindsetter-onboarding/actions';
import { applyFieldErrors } from '@/components/auth/applyFieldErrors';
import { useCabinetSaved } from '@/components/dashboard/use-cabinet-saved';
import { CollapsibleCard, DeleteIcon } from '@/components/mindsetter-onboarding/CollapsibleCard';
import { SortableList } from '@/components/mindsetter-onboarding/SortableList';
import { StepActions } from '@/components/mindsetter-onboarding/StepActions';
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
import { Input } from '@/components/ui/input';
import { useRouter } from '@/i18n/navigation';
import {
  MAX_NUMBER_LABEL_LENGTH,
  MAX_NUMBER_VALUE_LENGTH,
  MAX_NUMBERS,
  type NumberItem,
  numbersCabinetSchema,
  type NumbersStepInput,
  numbersStepSchema,
} from '@/lib/validation/mindsetter';

type NumbersFormProps = {
  /** Cabinet section-editor mode: swaps "Save & Continue" for "Cancel" + "Save changes".
   * Omitted everywhere in the onboarding wizard, whose behavior is unchanged. */
  editMode?: boolean;
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
  /** Sortable id (the `useFieldArray` field id) + whether this card can be reordered — the parent
   * wraps the list in `SortableList`; see `CollapsibleCard`. */
  id: string;
  draggable: boolean;
};

/** One "Number N" card — Value (40-char counter) + Label (40-char counter), e.g. "3×" /
 * "Platforms founded". Mirrors `ExpertiseCard`'s structure, just two `Input`s instead of an
 * Input + Textarea. Wrapped in `CollapsibleCard` (stage 1.9 "collapse-on-blur") — collapses once
 * value+label are filled AND the caller clicks outside it. */
function NumberCard({ control, index, onRemove, id, draggable }: NumberCardProps) {
  const t = useTranslations('mindsetterOnboarding');

  const valueValue = useWatch({ control, name: `numbers.${index}.value` }) ?? '';
  const labelValue = useWatch({ control, name: `numbers.${index}.label` }) ?? '';
  const isFilled = valueValue.trim().length > 0 && labelValue.trim().length > 0;

  return (
    <CollapsibleCard
      isFilled={isFilled}
      title={
        <span className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
          {t('blocks.numbers.cardTitle', { index: index + 1 })}
        </span>
      }
      onDelete={onRemove}
      deleteLabel={t('blocks.numbers.removeNumber')}
      editLabel={t('common.edit')}
      reorderLabel={t('common.reorder')}
      id={id}
      draggable={draggable}
      collapsedSummary={
        <div className="flex flex-col gap-1">
          <p className="truncate text-base font-bold tracking-[0.3em] text-foreground uppercase">
            {valueValue}
          </p>
          {labelValue ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{labelValue}</p>
          ) : null}
        </div>
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
          {t('blocks.numbers.cardTitle', { index: index + 1 })}
        </span>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('blocks.numbers.removeNumber')}
            className="cursor-pointer"
          >
            <DeleteIcon />
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
    </CollapsibleCard>
  );
}

/** Optional block "Numbers" (onboarding doc section 7 / decision E.2 — no dedicated desktop
 * Figma frame, built in the same card-list style as the other blocks). Mirrors `HelpForm.tsx`'s
 * `useFieldArray` structure. */
export function NumbersForm({ initialNumbers, nextHref, editMode }: NumbersFormProps) {
  const t = useTranslations('mindsetterOnboarding');
  const router = useRouter();
  const notifySaved = useCabinetSaved();
  const [formError, setFormError] = useState<string | null>(null);

  // Cabinet mode relaxes the wizard's "at least one" rule so this optional section can be saved
  // EMPTY — that empty save is how it gets cleared again. It also starts with zero rows when
  // nothing is saved yet (the wizard seeds one blank row, which here would force the caller to
  // fill something just to close the section). See `numbersCabinetSchema`'s doc comment.
  const form: UseFormReturn<NumbersStepInput> = useForm<NumbersStepInput>({
    resolver: zodResolver(editMode ? numbersCabinetSchema : numbersStepSchema),
    mode: 'onChange',
    defaultValues: {
      numbers: initialNumbers?.length ? initialNumbers : editMode ? [] : [EMPTY_NUMBER],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'numbers',
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const result = editMode ? await saveNumbersSection(values) : await saveNumbers(values);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.error.fieldErrors);
      setFormError(result.error.message);
      return;
    }

    if (editMode) {
      // Stay on the section. `reset(values)` rebases the form so a later "Cancel"
      // reverts to what was just saved, not to what the page originally loaded.
      form.reset(values);
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

        <SortableList ids={fields.map((field) => field.id)} onReorder={move}>
          <div className="flex flex-col gap-3 md:gap-4">
            {fields.map((field, index) => (
              <NumberCard
                key={field.id}
                id={field.id}
                control={form.control}
                index={index}
                // Cabinet mode can delete down to zero rows (that's how the section is
                // cleared); the wizard keeps its last row undeletable, since it requires one.
                onRemove={editMode || fields.length > 1 ? () => remove(index) : undefined}
                draggable={fields.length > 1}
              />
            ))}
          </div>
        </SortableList>

        {fields.length < MAX_NUMBERS ? (
          <Button type="button" variant="outline" size="lg" onClick={() => append(EMPTY_NUMBER)}>
            <Plus className="size-4" aria-hidden="true" />
            {t('blocks.numbers.addNumber')}
          </Button>
        ) : null}

        <StepActions
          onCancel={() => {
            // Back to the last-saved values (the `defaultValues` captured at mount); stays on
            // the section rather than navigating, so this is an undo, not an exit.
            form.reset();
            setFormError(null);
          }}
          editMode={editMode}
          isSubmitting={form.formState.isSubmitting}
          className={fields.length < MAX_NUMBERS ? 'mt-[-4px] md:mt-[-8px]' : undefined}
        />
      </form>
    </Form>
  );
}
