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

import { saveHelp } from '@/app/[locale]/(app)/mindsetter-onboarding/actions';
import { applyFieldErrors } from '@/components/auth/applyFieldErrors';
import { useSectionDirtyGuard } from '@/components/dashboard/unsaved-changes';
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
import {
  type Expertise,
  type HelpStepInput,
  helpStepSchema,
  MAX_EXPERTISE,
  MAX_EXPERTISE_DESCRIPTION_LENGTH,
  MAX_EXPERTISE_TITLE_LENGTH,
} from '@/lib/validation/mindsetter';

type HelpFormProps = {
  /** Cabinet section-editor mode: swaps "Save & Continue" for "Back" + "Save & Next".
   * Omitted everywhere in the onboarding wizard, whose behavior is unchanged. */
  editMode?: boolean;
  /** Already-saved expertise entries, when the caller revisits this step. */
  initialExpertise?: Expertise[];
  /** Cabinet mode only: where "Save & Next" navigates once saved — the next card in cabinet
   * section order (`lib/profile/completeness.ts#nextSectionHref`, Release-1 C3). */
  nextHref?: string;
};

const EMPTY_EXPERTISE: Expertise = { title: '', description: '' };

type ExpertiseCardProps = {
  control: Control<HelpStepInput>;
  index: number;
  onRemove?: () => void;
  /** Sortable id (the `useFieldArray` field id) + whether this card can be reordered — the parent
   * wraps the list in `SortableList`; see `CollapsibleCard`. */
  id: string;
  draggable: boolean;
};

/**
 * One "Expertise N" card — Title (40-char counter) + Description (auto-grow, 200-char
 * counter). Like `RoleCard` but without the nested `links` field array (onboarding doc section
 * 4: "You can help with" has no link sub-fields) — these card titles later feed the "Topics
 * you're expert in" multiselect on the Personal-session step (doc section E.1). Wrapped in
 * `CollapsibleCard` (stage 1.9 "collapse-on-blur") — collapses once title+description are filled
 * AND the caller clicks outside it.
 */
function ExpertiseCard({ control, index, onRemove, id, draggable }: ExpertiseCardProps) {
  const t = useTranslations('mindsetterOnboarding');

  const titleValue = useWatch({ control, name: `expertise.${index}.title` }) ?? '';
  const descriptionValue = useWatch({ control, name: `expertise.${index}.description` }) ?? '';
  const isFilled = titleValue.trim().length > 0 && descriptionValue.trim().length > 0;

  return (
    <CollapsibleCard
      isFilled={isFilled}
      title={
        <span className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
          {t('help.cardTitle', { index: index + 1 })}
        </span>
      }
      onDelete={onRemove}
      deleteLabel={t('help.removeExpertise')}
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
          {t('help.cardTitle', { index: index + 1 })}
        </span>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('help.removeExpertise')}
            className="cursor-pointer"
          >
            <DeleteIcon />
          </button>
        ) : null}
      </div>

      <FormField
        control={control}
        name={`expertise.${index}.title`}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between gap-2">
              <FormLabel>
                <span className="inline-flex items-center gap-1">
                  {t('help.titleLabel')} <span className="text-primary">*</span>
                </span>
              </FormLabel>
              <span className="text-tiny text-muted-foreground">
                {t('common.charCount', {
                  count: titleValue.length,
                  max: MAX_EXPERTISE_TITLE_LENGTH,
                })}
              </span>
            </div>
            <FormControl>
              <Input
                type="text"
                maxLength={MAX_EXPERTISE_TITLE_LENGTH}
                placeholder={t('help.titlePlaceholder')}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`expertise.${index}.description`}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between gap-2">
              <FormLabel>
                <span className="inline-flex items-center gap-1">
                  {t('help.descriptionLabel')} <span className="text-primary">*</span>
                </span>
              </FormLabel>
              <span className="text-tiny text-muted-foreground">
                {t('common.charCount', {
                  count: descriptionValue.length,
                  max: MAX_EXPERTISE_DESCRIPTION_LENGTH,
                })}
              </span>
            </div>
            <FormControl>
              <Textarea
                autoGrow
                maxLength={MAX_EXPERTISE_DESCRIPTION_LENGTH}
                placeholder={t('help.descriptionPlaceholder', {
                  max: MAX_EXPERTISE_DESCRIPTION_LENGTH,
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
 * Extended Mindsetter onboarding — step 3/5 "You can help with" form (see `page.tsx`). Mirrors
 * `RolesForm.tsx`'s structure (RHF + `zodResolver`, `applyFieldErrors`, `useFieldArray`), minus
 * the per-card nested `links` array Roles has.
 */
export function HelpForm({ initialExpertise, editMode, nextHref }: HelpFormProps) {
  const t = useTranslations('mindsetterOnboarding');
  const router = useRouter();
  const notifySaved = useCabinetSaved();
  const [formError, setFormError] = useState<string | null>(null);

  const form: UseFormReturn<HelpStepInput> = useForm<HelpStepInput>({
    resolver: zodResolver(helpStepSchema),
    mode: 'onChange',
    defaultValues: {
      expertise: initialExpertise?.length ? initialExpertise : [EMPTY_EXPERTISE],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'expertise',
  });

  // Reported up to the shared "unsaved changes" guard (Release-1 C-continuation, 2026-09-19), but
  // only in cabinet mode — this form is also the wizard's own step, which must stay unaffected by
  // the cabinet's exit guard (see that hook's own doc comment).
  useSectionDirtyGuard(editMode ? form.formState.isDirty : false);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const result = await saveHelp(values);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.error.fieldErrors);
      setFormError(result.error.message);
      return;
    }

    // Step 4/5 — "Make your profile shine." (Personal session moved to the last core step,
    // product decision D9 — no longer directly after Help.)
    // Cabinet mode walks to the next section ("Save & Next"); the wizard continues to step 4/5.
    if (editMode) {
      form.reset(values);
      notifySaved(nextHref);
      return;
    }

    router.push('/mindsetter-onboarding/shine');
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
              <ExpertiseCard
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

        <div className="flex flex-col gap-3 md:gap-4">
          {fields.length < MAX_EXPERTISE ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => append(EMPTY_EXPERTISE)}
            >
              <Plus className="size-4" aria-hidden="true" />
              {t('help.addExpertise')}
            </Button>
          ) : null}

          <StepActions
            onCancel={() => router.push('/dashboard/profile')}
            editMode={editMode}
            isSubmitting={form.formState.isSubmitting}
          />
        </div>
      </form>
    </Form>
  );
}
