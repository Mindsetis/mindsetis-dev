'use client';

import { arrayMove } from '@dnd-kit/sortable';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { type Control, useForm, type UseFormReturn, useWatch } from 'react-hook-form';

import { saveSuperpowers } from '@/app/[locale]/(app)/mindsetter-onboarding/actions';
import { applyFieldErrors } from '@/components/auth/applyFieldErrors';
import { useSectionDirtyGuard } from '@/components/dashboard/unsaved-changes';
import { useCabinetSaved } from '@/components/dashboard/use-cabinet-saved';
import { CollapsibleCard, DeleteIcon } from '@/components/mindsetter-onboarding/CollapsibleCard';
import { SortableList } from '@/components/mindsetter-onboarding/SortableList';
import { StepActions } from '@/components/mindsetter-onboarding/StepActions';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  isSuperpowerFilled,
  MAX_SUPERPOWER_DESCRIPTION_LENGTH,
  MAX_SUPERPOWER_TITLE_LENGTH,
  MAX_SUPERPOWERS,
  type Superpower,
  type SuperpowersStepInput,
  superpowersStepSchema,
} from '@/lib/validation/mindsetter';

type SuperpowersFormProps = {
  /** Cabinet section-editor mode: swaps "Save & Continue" for "Back" + "Save & Next".
   * Omitted everywhere in the onboarding wizard, whose behavior is unchanged. */
  editMode?: boolean;
  /** Already-saved superpowers, when the caller revisits this step. */
  initialSuperpowers?: Superpower[];
  /** Cabinet mode only: where "Save & Next" navigates once saved — the next card in cabinet
   * section order (`lib/profile/completeness.ts#nextSectionHref`, Release-1 C3). */
  nextHref?: string;
};

const EMPTY_SUPERPOWER: Superpower = { title: '', description: '' };

type SuperpowerCardProps = {
  control: Control<SuperpowersStepInput>;
  index: number;
  onClear: () => void;
  /** Stable sortable id that travels WITH this slot's row as it's reordered (not the index) +
   * whether it can be dragged — the parent wraps the list in `SortableList`; see `CollapsibleCard`. */
  id: string;
  draggable: boolean;
};

/**
 * One "Superpower N/3" card — Title (40-char counter) + Description (auto-grow, 200-char
 * counter). Unlike `RoleCard`/`ExpertiseCard`, the number of card slots here is fixed at
 * exactly 3 (design has no "Add" button, onboarding doc section 3) — the trash icon clears
 * that slot's fields back to empty instead of removing the card from the list, so the form
 * always renders 3 cards regardless of how many are filled in. Wrapped in `CollapsibleCard`
 * (stage 1.9 "collapse-on-blur") — "delete" on a collapsed card clears the slot (not a remove),
 * matching that same fixed-slot semantics.
 */
function SuperpowerCard({ control, index, onClear, id, draggable }: SuperpowerCardProps) {
  const t = useTranslations('mindsetterOnboarding');

  const titleValue = useWatch({ control, name: `superpowers.${index}.title` }) ?? '';
  const descriptionValue = useWatch({ control, name: `superpowers.${index}.description` }) ?? '';
  const isEmpty = titleValue.length === 0 && descriptionValue.length === 0;
  const isFilled = titleValue.trim().length > 0 && descriptionValue.trim().length > 0;

  return (
    <CollapsibleCard
      isFilled={isFilled}
      title={
        <span className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
          {t('superpowers.cardTitle', { index: index + 1, total: MAX_SUPERPOWERS })}
        </span>
      }
      onDelete={isEmpty ? undefined : onClear}
      deleteLabel={t('superpowers.removeSuperpower')}
      editLabel={t('common.edit')}
      reorderLabel={t('common.reorder')}
      id={id}
      draggable={draggable}
      collapsedSummary={
        <div className="flex flex-col gap-1">
          <p className="truncate text-base font-bold tracking-[0.3em] text-foreground uppercase">
            {titleValue}
          </p>
          {descriptionValue ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{descriptionValue}</p>
          ) : null}
        </div>
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
          {t('superpowers.cardTitle', { index: index + 1, total: MAX_SUPERPOWERS })}
        </span>
        {!isEmpty ? (
          <button
            type="button"
            onClick={onClear}
            aria-label={t('superpowers.removeSuperpower')}
            className="cursor-pointer"
          >
            <DeleteIcon />
          </button>
        ) : null}
      </div>

      <FormField
        control={control}
        name={`superpowers.${index}.title`}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between gap-2">
              <FormLabel>
                <span className="inline-flex items-center gap-1">
                  {t('superpowers.titleLabel')} <span className="text-primary">*</span>
                </span>
              </FormLabel>
              <span className="text-tiny text-muted-foreground">
                {t('common.charCount', {
                  count: titleValue.length,
                  max: MAX_SUPERPOWER_TITLE_LENGTH,
                })}
              </span>
            </div>
            <FormControl>
              <Input
                type="text"
                maxLength={MAX_SUPERPOWER_TITLE_LENGTH}
                placeholder={t('superpowers.titlePlaceholder')}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`superpowers.${index}.description`}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between gap-2">
              <FormLabel>
                <span className="inline-flex items-center gap-1">
                  {t('superpowers.descriptionLabel')} <span className="text-primary">*</span>
                </span>
              </FormLabel>
              <span className="text-tiny text-muted-foreground">
                {t('common.charCount', {
                  count: descriptionValue.length,
                  max: MAX_SUPERPOWER_DESCRIPTION_LENGTH,
                })}
              </span>
            </div>
            <FormControl>
              <Textarea
                autoGrow
                maxLength={MAX_SUPERPOWER_DESCRIPTION_LENGTH}
                placeholder={t('superpowers.descriptionPlaceholder', {
                  max: MAX_SUPERPOWER_DESCRIPTION_LENGTH,
                })}
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

/**
 * Extended Mindsetter onboarding — step 2/5 "Your superpowers" form (see `page.tsx`). Mirrors
 * `RolesForm.tsx`'s structure (RHF + `zodResolver`, `applyFieldErrors`), but the card count is
 * fixed at `MAX_SUPERPOWERS` (3) instead of a `useFieldArray` list. `superpowerSchema` itself
 * tolerates wholly-empty slots (see its own doc comment) so `MIN_SUPERPOWERS`'s "at least 1 of
 * 3 filled" rule doesn't block submission — this form still filters empty slots out of what's
 * actually sent to `saveSuperpowers` below, just AFTER validation, not before.
 */
export function SuperpowersForm({ initialSuperpowers, editMode, nextHref }: SuperpowersFormProps) {
  const router = useRouter();
  const notifySaved = useCabinetSaved();
  const [formError, setFormError] = useState<string | null>(null);

  const paddedInitial: Superpower[] = Array.from({ length: MAX_SUPERPOWERS }, (_, i) => ({
    ...(initialSuperpowers?.[i] ?? EMPTY_SUPERPOWER),
  }));

  const form: UseFormReturn<SuperpowersStepInput> = useForm<SuperpowersStepInput>({
    resolver: zodResolver(superpowersStepSchema),
    mode: 'onChange',
    defaultValues: { superpowers: paddedInitial },
  });

  // Reported up to the shared "unsaved changes" guard (Release-1 C-continuation, 2026-09-19), but
  // only in cabinet mode — this form is also the wizard's own step, which must stay unaffected by
  // the cabinet's exit guard (see that hook's own doc comment).
  useSectionDirtyGuard(editMode ? form.formState.isDirty : false);

  const onSubmit = form.handleSubmit(
    async (values) => {
      setFormError(null);

      const filled = values.superpowers.filter(isSuperpowerFilled);

      const result = await saveSuperpowers({ superpowers: filled });
      if (!result.ok) {
        applyFieldErrors(form.setError, result.error.fieldErrors);
        setFormError(result.error.message);
        return;
      }

      // Step 3/5 — "You can help with".
      // Cabinet mode walks to the next section ("Save & Next"); the wizard continues to step 3/5.
      if (editMode) {
        form.reset(values);
        notifySaved(nextHref);
        return;
      }

      router.push('/mindsetter-onboarding/help');
    },
    // A fully-empty form (all 3 slots blank) fails `superpowersStepSchema`'s top-level
    // "at least `MIN_SUPERPOWERS` filled" check with an error on the array field itself
    // (`superpowers`, not any one card's title/description) — there's no per-card `FormMessage`
    // for that, so surface it via the same banner a server error uses instead of failing silently.
    (errors) => {
      const rootMessage = errors.superpowers?.message;
      if (rootMessage) setFormError(rootMessage);
    },
  );

  const handleClear = (index: number) => {
    form.setValue(`superpowers.${index}`, { ...EMPTY_SUPERPOWER }, { shouldValidate: true });
  };

  // There's no `useFieldArray` here (see the file-header note) — 3 fixed slots — so each row gets
  // a STABLE id that travels with it as it's dragged (kept in `rowIds`), moved in lockstep with
  // the underlying `superpowers` values via `arrayMove`. Because the id (and thus the React key)
  // moves WITH the content, each `SuperpowerCard` keeps its own collapsed/expanded state as it's
  // reordered — no remount / `dragVersion` hack needed (which the old native-DnD version used to
  // re-derive state from whatever content landed in a fixed position).
  const [rowIds, setRowIds] = useState(() =>
    Array.from({ length: MAX_SUPERPOWERS }, (_, index) => `superpower-${index}`),
  );

  function handleReorder(fromIndex: number, toIndex: number) {
    const current = form.getValues('superpowers');
    form.setValue('superpowers', arrayMove(current, fromIndex, toIndex), { shouldValidate: true });
    setRowIds((ids) => arrayMove(ids, fromIndex, toIndex));
  }

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 md:gap-6">
        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <SortableList ids={rowIds} onReorder={handleReorder}>
          <div className="flex flex-col gap-3 md:gap-4">
            {rowIds.map((rowId, index) => (
              <SuperpowerCard
                key={rowId}
                id={rowId}
                control={form.control}
                index={index}
                onClear={() => handleClear(index)}
                draggable
              />
            ))}
          </div>
        </SortableList>

        <StepActions
          onCancel={() => router.push('/dashboard/profile')}
          editMode={editMode}
          isSubmitting={form.formState.isSubmitting}
        />
      </form>
    </Form>
  );
}
