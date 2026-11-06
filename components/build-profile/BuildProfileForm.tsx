'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { saveBuildProfile } from '@/app/[locale]/(app)/build-profile/actions';
import { applyActionFailure } from '@/components/auth/applyFieldErrors';
import { useSectionDirtyGuard } from '@/components/dashboard/unsaved-changes';
import { LanguagesMultiSelect } from '@/components/member-profile/LanguagesMultiSelect';
import { WizardActionBar } from '@/components/mindsetter-onboarding/StepActions';
import { FieldHint } from '@/components/ui/field-hint';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { type FormBanner, FormErrorAlert } from '@/components/ui/form-error-alert';
import { revealOnInvalid } from '@/components/ui/form-errors';
import { Input } from '@/components/ui/input';
import { useRouter } from '@/i18n/navigation';
import { getIndustryOptions } from '@/lib/constants/catalog-labels';
import type { IndustryValue } from '@/lib/constants/industries';
import { INDUSTRY_VALUES, OTHER_INDUSTRY_VALUE } from '@/lib/constants/industries';
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
 * `MemberProfileForm.tsx`'s structure (RHF + `zodResolver`, `applyActionFailure`). Company/Role
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
  const tCatalog = useTranslations('catalog');
  const locale = useLocale();
  const industryOptions = useMemo(() => getIndustryOptions(tCatalog, locale), [tCatalog, locale]);
  const router = useRouter();
  const [formError, setFormError] = useState<FormBanner>(null);

  const knownIndustryValues = new Set<string>(INDUSTRY_VALUES);

  const form = useForm<BuildProfileInput>({
    // `revealOnInvalid` focuses the first error in page order; RHF's own focus would fight it.
    shouldFocusError: false,
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

  // Arms the shared "unsaved changes" warning for this step's Back (and the header links) while
  // edits are pending — same guard the Mindsetter wizard and the cabinet use.
  useSectionDirtyGuard(form.formState.isDirty);

  const industriesValue = useWatch({ control: form.control, name: 'industries' }) ?? [];
  const hasOtherIndustry = industriesValue.includes(OTHER_INDUSTRY_VALUE);

  const onSubmit = form.handleSubmit(async (values, event) => {
    setFormError(null);

    const result = await saveBuildProfile(values);
    if (!result.ok) {
      setFormError(applyActionFailure(form, result.error, event));
      return;
    }

    // This is now the wizard's last step (stage 1.5 renumbering moved email verification to
    // step 2, `/verify-email` — see that page's doc comment), so a successful save moves on to
    // the Congrats screen, not back to verification. `saveBuildProfile`'s welcome-email send is
    // unrelated to navigation here — it's a fire-and-forget informational email, not a gate.
    router.push('/welcome');
  }, revealOnInvalid);

  return (
    <Form {...form}>
      {/* Same spacing rhythm as `SignUpForm.tsx`/`MemberProfileForm.tsx`: 16px/24px
          (mobile/desktop) from the field block to the submit button. */}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 md:gap-6">
        <FormErrorAlert messages={formError} />

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
                  options={industryOptions}
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

        {/* Back → step 3 beside Continue, in the very same pinned `[Back | primary]` bar the
            Mindsetter wizard uses (owner's call, 31.10.2026), so the two wizards behave alike. A
            direct child of the `<form>`, as in the Mindsetter forms, so the bar can pin. */}
        <WizardActionBar
          backHref="/member-profile"
          isSubmitting={form.formState.isSubmitting}
          label={t('signUp.submit')}
          pendingLabel={t('signUp.submitting')}
        />
      </form>
    </Form>
  );
}
