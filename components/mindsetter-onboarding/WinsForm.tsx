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

import { saveWinsSection } from '@/app/[locale]/dashboard/profile/actions';
import { saveWins } from '@/app/[locale]/mindsetter-onboarding/actions';
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
  winsCabinetSchema,
  type WinsStepInput,
  winsStepSchema,
} from '@/lib/validation/mindsetter';

type WinsFormProps = {
  /** Cabinet section-editor mode: swaps "Save & Continue" for "Cancel" + "Save changes".
   * Omitted everywhere in the onboarding wizard, whose behavior is unchanged. */
  editMode?: boolean;
  /** Already-saved wins, when the caller revisits this block. */
  initialWins?: Win[];
  /** Where "Save and continue" navigates once saved (`nextBlockHref`). */
  nextHref: string;
};

const EMPTY_WIN: Win = { year: '', win: '', description: '', color: 'yellow' };

// Hex values for the 7 named "win card" colors (onboarding doc section 7: "palette of 7 colors
// (yellow/purple/blue/orange/teal/light-blue/pink)"), provided by the designer. Keyed here in one
// map so tweaking a shade later is a one-line change; the DB only ever stores the color KEY
// (below), never these hex values.
const WIN_COLOR_SWATCHES: Record<WinColor, string> = {
  yellow: '#F2C601',
  purple: '#7729F4',
  blue: '#172AFB',
  orange: '#FF5F24',
  teal: '#17FBD9',
  lightblue: '#79B9E3',
  pink: '#FB17AF',
};

type WinCardProps = {
  control: Control<WinsStepInput>;
  index: number;
  onRemove?: () => void;
  /** Sortable id (the `useFieldArray` field id) + whether this card can be reordered — the parent
   * wraps the list in `SortableList`; see `CollapsibleCard`. */
  id: string;
  draggable: boolean;
};

/** One "Win N" card — Year (40-char counter) + Win (40-char counter) + Description (auto-grow,
 * 200-char counter) + a single-select row of 7 color swatches. Wrapped in `CollapsibleCard`
 * (stage 1.9 "collapse-on-blur") — collapses once year+win+description are filled AND the caller
 * clicks outside it; the collapsed summary shows a small dot in the chosen color. */
function WinCard({ control, index, onRemove, id, draggable }: WinCardProps) {
  const t = useTranslations('mindsetterOnboarding');

  const yearValue = useWatch({ control, name: `wins.${index}.year` }) ?? '';
  const winValue = useWatch({ control, name: `wins.${index}.win` }) ?? '';
  const descriptionValue = useWatch({ control, name: `wins.${index}.description` }) ?? '';
  const colorValue = useWatch({ control, name: `wins.${index}.color` }) ?? EMPTY_WIN.color;
  const isFilled =
    yearValue.trim().length > 0 && winValue.trim().length > 0 && descriptionValue.trim().length > 0;

  return (
    <CollapsibleCard
      isFilled={isFilled}
      title={
        <span className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
          {t('blocks.wins.cardTitle', { index: index + 1 })}
        </span>
      }
      onDelete={onRemove}
      deleteLabel={t('blocks.wins.removeWin')}
      editLabel={t('common.edit')}
      reorderLabel={t('common.reorder')}
      id={id}
      draggable={draggable}
      collapsedSummary={
        <div className="flex flex-col gap-1">
          {yearValue ? (
            <p className="truncate text-base font-bold tracking-[0.3em] text-foreground uppercase">
              {yearValue}
            </p>
          ) : null}
          {winValue ? (
            <p className="truncate text-base font-bold tracking-[0.3em] text-foreground uppercase">
              {winValue}
            </p>
          ) : null}
          {descriptionValue ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{descriptionValue}</p>
          ) : null}
          <div className="mt-4 flex items-center gap-2">
            <span
              className="size-4 shrink-0 rounded-full"
              style={{ backgroundColor: WIN_COLOR_SWATCHES[colorValue] }}
              aria-hidden="true"
            />
            <span className="text-tiny font-bold tracking-[0.3em] text-[#a5a5a5] uppercase">
              {t('blocks.wins.colorCardLabel', { color: t(`blocks.wins.colorName.${colorValue}`) })}
            </span>
          </div>
        </div>
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
          {t('blocks.wins.cardTitle', { index: index + 1 })}
        </span>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('blocks.wins.removeWin')}
            className="cursor-pointer"
          >
            <DeleteIcon />
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
            <FormLabel variant="boldSpacing" className="mb-3 text-[12px] text-[#a5a5a5]">
              {t('blocks.wins.colorLabel')}
            </FormLabel>
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
                      'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-4 transition-colors',
                      isSelected ? 'border-white' : 'border-transparent',
                    )}
                    style={{ backgroundColor: WIN_COLOR_SWATCHES[color] }}
                  />
                );
              })}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </CollapsibleCard>
  );
}

/** Optional block "My Wins" (onboarding doc section 7). Mirrors `HelpForm.tsx`'s `useFieldArray`
 * structure, plus the per-card color swatch picker. */
export function WinsForm({ initialWins, nextHref, editMode }: WinsFormProps) {
  const t = useTranslations('mindsetterOnboarding');
  const router = useRouter();
  const notifySaved = useCabinetSaved();
  const [formError, setFormError] = useState<string | null>(null);

  const form: UseFormReturn<WinsStepInput> = useForm<WinsStepInput>({
    // Cabinet mode relaxes the wizard's "at least one" rule so this optional section can be saved
    // EMPTY — that empty save is how it gets cleared again. It also starts with zero rows when
    // nothing is saved yet (the wizard seeds one blank row, which here would force the caller to
    // fill something just to close the section). See the cabinet schema's own doc comment.
    resolver: zodResolver(editMode ? winsCabinetSchema : winsStepSchema),
    mode: 'onChange',
    defaultValues: {
      wins: initialWins?.length ? initialWins : editMode ? [] : [EMPTY_WIN],
    },
  });

  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: 'wins' });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const result = editMode ? await saveWinsSection(values) : await saveWins(values);
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
              <WinCard
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

        {fields.length < MAX_WINS ? (
          <Button type="button" variant="outline" size="lg" onClick={() => append(EMPTY_WIN)}>
            <Plus className="size-4" aria-hidden="true" />
            {t('blocks.wins.addWin')}
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
          className={fields.length < MAX_WINS ? 'mt-[-4px] md:mt-[-8px]' : undefined}
        />
      </form>
    </Form>
  );
}
