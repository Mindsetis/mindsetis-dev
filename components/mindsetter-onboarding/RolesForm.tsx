'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Link as LinkIcon, Plus, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  type Control,
  useFieldArray,
  useForm,
  type UseFormReturn,
  useWatch,
} from 'react-hook-form';

import { saveRoles } from '@/app/[locale]/mindsetter-onboarding/actions';
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
  MAX_ROLE_DESCRIPTION_LENGTH,
  MAX_ROLE_LINKS,
  MAX_ROLE_TITLE_LENGTH,
  MAX_ROLES,
  type Role,
  type RolesStepInput,
  rolesStepSchema,
} from '@/lib/validation/mindsetter';

type RolesFormProps = {
  /** Already-saved roles, when the caller revisits this step. */
  initialRoles?: Role[];
};

const EMPTY_ROLE: Role = { title: '', description: '', links: [] };

type RoleCardProps = {
  control: Control<RolesStepInput>;
  index: number;
  onRemove?: () => void;
};

/**
 * One "Role N" card — Title (40-char counter), Description (auto-grow, 200-char counter),
 * and its own nested `links` field array. Split out of `RolesForm` because each card owns an
 * independent `useFieldArray` for its links (`roles.${index}.links`), which can't live in the
 * parent without one nested field-array hook per row.
 */
function RoleCard({ control, index, onRemove }: RoleCardProps) {
  const t = useTranslations('mindsetterOnboarding');

  const {
    fields: linkFields,
    append: appendLink,
    remove: removeLink,
  } = useFieldArray({ control, name: `roles.${index}.links` });

  const titleValue = useWatch({ control, name: `roles.${index}.title` }) ?? '';
  const descriptionValue = useWatch({ control, name: `roles.${index}.description` }) ?? '';

  return (
    <Card className="gap-4 px-4 py-4 md:px-6 md:py-6">
      <div className="flex items-center justify-between gap-2">
        <span className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
          {t('roles.roleCardTitle', { index: index + 1 })}
        </span>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('roles.removeRole')}
            className="cursor-pointer text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <FormField
        control={control}
        name={`roles.${index}.title`}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between gap-2">
              <FormLabel>
                <span className="inline-flex items-center gap-1">
                  {t('roles.titleLabel')} <span className="text-primary">*</span>
                </span>
              </FormLabel>
              <span className="text-tiny text-muted-foreground">
                {t('common.charCount', { count: titleValue.length, max: MAX_ROLE_TITLE_LENGTH })}
              </span>
            </div>
            <FormControl>
              <Input
                type="text"
                maxLength={MAX_ROLE_TITLE_LENGTH}
                placeholder={t('roles.titlePlaceholder')}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`roles.${index}.description`}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between gap-2">
              <FormLabel>
                <span className="inline-flex items-center gap-1">
                  {t('roles.descriptionLabel')} <span className="text-primary">*</span>
                </span>
              </FormLabel>
              <span className="text-tiny text-muted-foreground">
                {t('common.charCount', {
                  count: descriptionValue.length,
                  max: MAX_ROLE_DESCRIPTION_LENGTH,
                })}
              </span>
            </div>
            <FormControl>
              <Textarea
                autoGrow
                maxLength={MAX_ROLE_DESCRIPTION_LENGTH}
                placeholder={t('roles.descriptionPlaceholder', {
                  max: MAX_ROLE_DESCRIPTION_LENGTH,
                })}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex flex-col gap-2">
        {linkFields.map((linkField, linkIndex) => (
          <FormField
            key={linkField.id}
            control={control}
            name={`roles.${index}.links.${linkIndex}.url`}
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormControl>
                    <Input type="url" placeholder={t('roles.linkPlaceholder')} {...field} />
                  </FormControl>
                  <button
                    type="button"
                    onClick={() => removeLink(linkIndex)}
                    aria-label={t('roles.removeLink')}
                    className="shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
                {/* TODO og preview: once real og-scraping exists, render a favicon/og-title
                    preview row below this input instead of a bare URL field (onboarding doc,
                    "Your roles" section — links "show a preview card" once filled). */}
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        {linkFields.length < MAX_ROLE_LINKS ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit"
            onClick={() => appendLink({ url: '', ogTitle: undefined })}
          >
            <LinkIcon className="size-4" aria-hidden="true" />
            {t('roles.addLink')}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

/**
 * Extended Mindsetter onboarding — step 1/5 "Your roles" form (see `page.tsx`). Mirrors
 * `MemberProfileForm.tsx`'s structure (RHF + `zodResolver`, `applyFieldErrors`), plus a
 * `useFieldArray` of Role cards (each with its own nested links field array, see `RoleCard`).
 */
export function RolesForm({ initialRoles }: RolesFormProps) {
  const t = useTranslations('mindsetterOnboarding');
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form: UseFormReturn<RolesStepInput> = useForm<RolesStepInput>({
    resolver: zodResolver(rolesStepSchema),
    mode: 'onChange',
    defaultValues: {
      roles: initialRoles?.length ? initialRoles : [EMPTY_ROLE],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'roles' });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const result = await saveRoles(values);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.error.fieldErrors);
      setFormError(result.error.message);
      return;
    }

    // Step 2/5 — "Your superpowers" (not built yet in this foundation slice; wired ahead of
    // the route existing, same precedent as the Member wizard's earlier steps).
    router.push('/mindsetter-onboarding/superpowers');
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
            <RoleCard
              key={field.id}
              control={form.control}
              index={index}
              onRemove={fields.length > 1 ? () => remove(index) : undefined}
            />
          ))}
        </div>

        {fields.length < MAX_ROLES ? (
          <Button type="button" variant="outline" size="lg" onClick={() => append(EMPTY_ROLE)}>
            <Plus className="size-4" aria-hidden="true" />
            {t('roles.addRole')}
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
