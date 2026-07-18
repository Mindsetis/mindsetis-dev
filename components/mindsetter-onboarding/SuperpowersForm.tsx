'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { type Control, useForm, type UseFormReturn, useWatch } from 'react-hook-form';

import { saveSuperpowers } from '@/app/[locale]/mindsetter-onboarding/actions';
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
  isSuperpowerFilled,
  MAX_SUPERPOWER_DESCRIPTION_LENGTH,
  MAX_SUPERPOWER_TITLE_LENGTH,
  MAX_SUPERPOWERS,
  type Superpower,
  type SuperpowersStepInput,
  superpowersStepSchema,
} from '@/lib/validation/mindsetter';

type SuperpowersFormProps = {
  /** Already-saved superpowers, when the caller revisits this step. */
  initialSuperpowers?: Superpower[];
};

const EMPTY_SUPERPOWER: Superpower = { title: '', description: '' };

type SuperpowerCardProps = {
  control: Control<SuperpowersStepInput>;
  index: number;
  onClear: () => void;
};

/**
 * One "Superpower N/3" card — Title (40-char counter) + Description (auto-grow, 200-char
 * counter). Unlike `RoleCard`/`ExpertiseCard`, the number of card slots here is fixed at
 * exactly 3 (design has no "Add" button, onboarding doc section 3) — the trash icon clears
 * that slot's fields back to empty instead of removing the card from the list, so the form
 * always renders 3 cards regardless of how many are filled in.
 */
function SuperpowerCard({ control, index, onClear }: SuperpowerCardProps) {
  const t = useTranslations('mindsetterOnboarding');

  const titleValue = useWatch({ control, name: `superpowers.${index}.title` }) ?? '';
  const descriptionValue = useWatch({ control, name: `superpowers.${index}.description` }) ?? '';
  const isEmpty = titleValue.length === 0 && descriptionValue.length === 0;

  return (
    <Card className="gap-4 px-4 py-4 md:px-6 md:py-6">
      <div className="flex items-center justify-between gap-2">
        <span className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
          {t('superpowers.cardTitle', { index: index + 1, total: MAX_SUPERPOWERS })}
        </span>
        {!isEmpty ? (
          <button
            type="button"
            onClick={onClear}
            aria-label={t('superpowers.removeSuperpower')}
            className="cursor-pointer text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="size-4" aria-hidden="true" />
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
    </Card>
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
export function SuperpowersForm({ initialSuperpowers }: SuperpowersFormProps) {
  const t = useTranslations('mindsetterOnboarding');
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const paddedInitial: Superpower[] = Array.from({ length: MAX_SUPERPOWERS }, (_, i) => ({
    ...(initialSuperpowers?.[i] ?? EMPTY_SUPERPOWER),
  }));

  const form: UseFormReturn<SuperpowersStepInput> = useForm<SuperpowersStepInput>({
    resolver: zodResolver(superpowersStepSchema),
    mode: 'onChange',
    defaultValues: { superpowers: paddedInitial },
  });

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

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 md:gap-6">
        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-4">
          {Array.from({ length: MAX_SUPERPOWERS }, (_, index) => (
            <SuperpowerCard
              key={index}
              control={form.control}
              index={index}
              onClear={() => handleClear(index)}
            />
          ))}
        </div>

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
