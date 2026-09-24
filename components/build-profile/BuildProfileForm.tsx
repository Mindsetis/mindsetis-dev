'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { saveBuildProfile } from '@/app/[locale]/(app)/build-profile/actions';
import { applyFieldErrors } from '@/components/auth/applyFieldErrors';
import { LanguagesMultiSelect } from '@/components/member-profile/LanguagesMultiSelect';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FieldHint } from '@/components/ui/field-hint';
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
import type { IndustryValue } from '@/lib/constants/industries';
import { INDUSTRIES, INDUSTRY_VALUES, OTHER_INDUSTRY_VALUE } from '@/lib/constants/industries';
import {
  type BuildProfileInput,
  buildProfileSchema,
  MAX_INDUSTRIES,
  MAX_INDUSTRY_CUSTOM_LENGTH,
} from '@/lib/validation/build-profile';

type BuildProfileFormProps = {
  /** Already-saved step-3 fields, when the caller revisits this page (Back). */
  initialCompany?: string;
  initialRole?: string;
  initialIndustries?: string[];
  initialIndustryCustom?: string;
};

/**
 * Registration wizard step 4/4 ("What do you build?") form — mirrors
 * `MemberProfileForm.tsx`'s structure (RHF + `zodResolver`, `applyFieldErrors`). Company/Role
 * stay plain text; Industries (Release-1 E2/E3, `profiles.industry` → `profiles.industries
 * text[]` + `profiles.industry_custom`) is a MULTI-select capped at `MAX_INDUSTRIES`, reusing
 * `LanguagesMultiSelect` (`max` prop) rather than the old single-select `Combobox` — see that
 * component's own doc comment for why the name stayed as-is. Picking the catalog's `other` entry
 * reveals a free-text field (`industryCustom`) capped at `MAX_INDUSTRY_CUSTOM_LENGTH`.
 */
export function BuildProfileForm({
  initialCompany,
  initialRole,
  initialIndustries,
  initialIndustryCustom,
}: BuildProfileFormProps) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const knownIndustryValues = new Set<string>(INDUSTRY_VALUES);

  const form = useForm<BuildProfileInput>({
    resolver: zodResolver(buildProfileSchema),
    mode: 'onChange',
    defaultValues: {
      company: initialCompany ?? '',
      role: initialRole ?? '',
      // A pre-E2 profile, or one carrying a stale slug (catalog entry renamed/removed since it
      // saved), simply drops anything outside `INDUSTRY_VALUES` rather than crashing the
      // enum-typed field or silently submitting an invalid value — same defensive precedent as
      // `initialInterestIds` in `MemberProfileForm`.
      industries: (initialIndustries ?? []).filter((value): value is IndustryValue =>
        knownIndustryValues.has(value),
      ),
      industryCustom: initialIndustryCustom ?? '',
    },
  });

  const industriesValue = useWatch({ control: form.control, name: 'industries' }) ?? [];
  const hasOtherIndustry = industriesValue.includes(OTHER_INDUSTRY_VALUE);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const result = await saveBuildProfile(values);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.error.fieldErrors);
      setFormError(result.error.message);
      return;
    }

    // This is now the wizard's last step (stage 1.5 renumbering moved email verification to
    // step 2, `/verify-email` — see that page's doc comment), so a successful save moves on to
    // the Congrats screen, not back to verification. `saveBuildProfile`'s welcome-email send is
    // unrelated to navigation here — it's a fire-and-forget informational email, not a gate.
    router.push('/welcome');
  });

  return (
    <Form {...form}>
      {/* Same spacing rhythm as `SignUpForm.tsx`/`MemberProfileForm.tsx`: 16px/24px
          (mobile/desktop) from the field block to the submit button. */}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 md:gap-6">
        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-3">
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <span className="inline-flex items-center gap-1">
                    {t('buildProfile.company.label')} <span className="text-primary">*</span>
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    autoComplete="organization"
                    placeholder={t('buildProfile.company.placeholder')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <span className="inline-flex items-center gap-1">
                    {t('buildProfile.role.label')} <span className="text-primary">*</span>
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    autoComplete="organization-title"
                    placeholder={t('buildProfile.role.placeholder')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="industries"
            render={({ field, fieldState }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-2">
                  <FormLabel>
                    <span className="inline-flex items-center gap-1">
                      {t('buildProfile.industries.label')} <span className="text-primary">*</span>
                    </span>
                  </FormLabel>
                  <span className="text-tiny text-muted-foreground">
                    {t('buildProfile.industries.counter', {
                      count: field.value.length,
                      max: MAX_INDUSTRIES,
                    })}
                  </span>
                </div>
                <LanguagesMultiSelect
                  value={field.value}
                  onChange={(next) => {
                    field.onChange(next);
                    // Deselecting "Other" clears the free-text field it revealed — this is the
                    // client-side half of the "empty if Other isn't selected" rule
                    // (`refineIndustryCustom` is the server-side half, which never trusts this
                    // ran).
                    if (!next.includes(OTHER_INDUSTRY_VALUE)) {
                      form.setValue('industryCustom', '', { shouldValidate: true });
                    }
                  }}
                  options={INDUSTRIES}
                  max={MAX_INDUSTRIES}
                  placeholder={t('buildProfile.industries.placeholder')}
                  searchPlaceholder={t('buildProfile.industries.searchPlaceholder')}
                  emptyLabel={t('buildProfile.industries.empty')}
                  removeLabel={(label) => t('buildProfile.industries.remove', { label })}
                  invalid={!!fieldState.error}
                  searchable
                />
                <FieldHint>{t('buildProfile.industries.hint')}</FieldHint>
                <FormMessage />
              </FormItem>
            )}
          />

          {hasOtherIndustry && (
            <FormField
              control={form.control}
              name="industryCustom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <span className="inline-flex items-center gap-1">
                      {t('buildProfile.industries.other.label')}{' '}
                      <span className="text-primary">*</span>
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      maxLength={MAX_INDUSTRY_CUSTOM_LENGTH}
                      placeholder={t('buildProfile.industries.other.placeholder')}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FieldHint>{t('buildProfile.industries.other.hint')}</FieldHint>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <Button
          type="submit"
          variant="primaryOutline"
          size="lg"
          loading={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? t('signUp.submitting') : t('signUp.submit')}
        </Button>
      </form>
    </Form>
  );
}
