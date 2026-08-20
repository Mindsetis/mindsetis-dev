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

import { saveMyWay } from '@/app/[locale]/mindsetter-onboarding/actions';
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
import { Label } from '@/components/ui/label';
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
  /** Cabinet section-editor mode: swaps "Save & Continue" for "Cancel" + "Save changes".
   * Omitted everywhere in the onboarding wizard, whose behavior is unchanged. */
  editMode?: boolean;
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
  /** Sortable id (the `useFieldArray` field id) + whether this card can be reordered — the parent
   * wraps the list in `SortableList`; see `CollapsibleCard`. */
  id: string;
  draggable: boolean;
};

/** One "Stage N" card — Project name (40-char counter) + Description (auto-grow, 200-char
 * counter) + Years as two short inputs in a row with a "–" separator (example "2016 – 2020").
 * Wrapped in `CollapsibleCard` (stage 1.9 "collapse-on-blur") — collapses once
 * project+description+yearFrom+yearTo are filled AND the caller clicks outside it. */
function MyWayCard({ control, index, onRemove, id, draggable }: MyWayCardProps) {
  const t = useTranslations('mindsetterOnboarding');

  const projectValue = useWatch({ control, name: `myWay.${index}.project` }) ?? '';
  const descriptionValue = useWatch({ control, name: `myWay.${index}.description` }) ?? '';
  const yearFromValue = useWatch({ control, name: `myWay.${index}.yearFrom` }) ?? '';
  const yearToValue = useWatch({ control, name: `myWay.${index}.yearTo` }) ?? '';
  const isFilled =
    projectValue.trim().length > 0 &&
    descriptionValue.trim().length > 0 &&
    yearFromValue.trim().length > 0 &&
    yearToValue.trim().length > 0;

  return (
    <CollapsibleCard
      isFilled={isFilled}
      title={
        <span className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
          {t('blocks.myWay.cardTitle', { index: index + 1 })}
        </span>
      }
      onDelete={onRemove}
      deleteLabel={t('blocks.myWay.removeStage')}
      editLabel={t('common.edit')}
      reorderLabel={t('common.reorder')}
      id={id}
      draggable={draggable}
      collapsedSummary={
        <div className="flex flex-col gap-1">
          <p className="truncate text-base font-bold tracking-[0.3em] text-foreground uppercase">
            {projectValue}
          </p>
          {descriptionValue ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{descriptionValue}</p>
          ) : null}
          {yearFromValue || yearToValue ? (
            <p className="text-tiny font-bold tracking-[0.3em] text-white uppercase">
              {yearFromValue} – {yearToValue}
            </p>
          ) : null}
        </div>
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
          {t('blocks.myWay.cardTitle', { index: index + 1 })}
        </span>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('blocks.myWay.removeStage')}
            className="cursor-pointer"
          >
            <DeleteIcon />
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
        {/* Group heading for the two year sub-fields — a plain `Label`, NOT `FormLabel`
            (which requires a single enclosing FormField/FormItem context and would throw
            "useFormField must be used within <FormField> and <FormItem>"). */}
        <Label>
          <span className="inline-flex items-center gap-1">
            {t('blocks.myWay.yearsLabel')} <span className="text-primary">*</span>
          </span>
        </Label>
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
    </CollapsibleCard>
  );
}

/** Optional block "My Way" (onboarding doc section 7). Mirrors `HelpForm.tsx`'s `useFieldArray`
 * structure, plus the Years-range sub-row. */
export function MyWayForm({ initialMyWay, nextHref, editMode }: MyWayFormProps) {
  const t = useTranslations('mindsetterOnboarding');
  const router = useRouter();
  const notifySaved = useCabinetSaved();
  const [formError, setFormError] = useState<string | null>(null);

  const form: UseFormReturn<MyWayStepInput> = useForm<MyWayStepInput>({
    resolver: zodResolver(myWayStepSchema),
    mode: 'onChange',
    defaultValues: {
      myWay: initialMyWay?.length ? initialMyWay : [EMPTY_STAGE],
    },
  });

  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: 'myWay' });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const result = await saveMyWay(values);
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
              <MyWayCard
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

        {fields.length < MAX_MY_WAY ? (
          <Button type="button" variant="outline" size="lg" onClick={() => append(EMPTY_STAGE)}>
            <Plus className="size-4" aria-hidden="true" />
            {t('blocks.myWay.addStage')}
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
          className={fields.length < MAX_MY_WAY ? 'mt-[-4px] md:mt-[-8px]' : undefined}
        />
      </form>
    </Form>
  );
}
